import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { HttpError } from "../middleware/errorHandler.js";
import { canView } from '../middleware/auth.js';

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw new HttpError(400, "Invalid auction ID: expected a 24-character hexadecimal ObjectId");
}

export async function createBid(req, res) {
  validateId(req.params.id);
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Request body must be a JSON object");
  if (Object.keys(body).some((key) => !["bidderName", "amount"].includes(key))) throw new HttpError(400, "Only bidderName and amount may be supplied");
  if ('bidderName' in body && (typeof body.bidderName !== 'string' || !body.bidderName.trim() || body.bidderName.trim().length > 100)) throw new HttpError(400, 'bidderName must be nonblank and at most 100 characters');
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) throw new HttpError(400, "amount must be a finite positive number");

  const result = await mongoose.connection.transaction(async (session) => {
    // This write also serializes bids against CRUD updates/deletions of this auction.
    // Recompute time on transaction retries, so an auction cannot stay open on retry.
    const auction = await Auction.findOneAndUpdate({
      _id: req.params.id,
      endsAt: { $gt: new Date() },
      currentPrice: { $lt: body.amount },
      $and: [
        { $or: [{ approval: 'approved' }, { approval: { $exists: false } }] },
        { $or: [{ startsAt: { $lte: new Date() } }, { startsAt: { $exists: false } }] }
      ]
    }, { $set: { currentPrice: body.amount } }, { returnDocument: "after", session });
    if (!auction) {
      const existing = await Auction.findById(req.params.id, null, { session });
      if (!existing || !canView(req.user, existing)) throw new HttpError(404, "Auction not found");
      if (existing.approval && existing.approval !== 'approved') throw new HttpError(409, 'Auction is awaiting approval');
      if (existing.startsAt?.getTime() > Date.now()) throw new HttpError(409, 'Auction has not started yet');
      if (existing.endsAt.getTime() <= Date.now()) throw new HttpError(409, "Auction has ended; bids are closed");
      throw new HttpError(409, `Bid must be strictly greater than the current price (${existing.currentPrice})`);
    }
    const [bid] = await Bid.create([{
      auctionId: auction._id, bidderId: req.user._id, bidderName: req.user.username, amount: body.amount
    }], { session });
    return { bid, currentPrice: auction.currentPrice };
  }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  res.status(201).json({ success: true, data: result.bid, currentPrice: result.currentPrice });
}

export async function listBids(req, res) {
  validateId(req.params.id);
  const auction = await Auction.findById(req.params.id);
  if (!auction || !canView(req.user, auction)) throw new HttpError(404, "Auction not found");
  const bids = await Bid.find({ auctionId: req.params.id }).sort({ createdAt: -1, _id: -1 });
  // Guests can follow price activity, but bidder identities remain private.
  const data = req.user ? bids : bids.map((bid) => ({ _id: bid._id, auctionId: bid.auctionId, amount: bid.amount, createdAt: bid.createdAt, updatedAt: bid.updatedAt }));
  res.json({ success: true, count: bids.length, data });
}
