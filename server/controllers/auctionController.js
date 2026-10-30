import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { HttpError } from "../middleware/errorHandler.js";
import Payment from '../models/Payment.js';
import { canManage, canView } from '../middleware/auth.js';
import { currencies } from '../lib/currencies.js';

const editable = ["title", "description", "category", "imageUrl", "startingPrice", "currency", "startsAt", "endsAt"];
const sortFields = ["title", "category", "startingPrice", "currentPrice", "endsAt", "createdAt", "updatedAt"];

function validateBody(body, creating = false) {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw new HttpError(400, "Request body must be a JSON object");
	}
	const keys = Object.keys(body);
	if ('currency' in body && !currencies.includes(body.currency)) throw new HttpError(400, `Choose a supported currency: ${currencies.join(', ')}`);
	const unknown = keys.filter((key) => !editable.includes(key));
	if (unknown.length) throw new HttpError(400, `Fields cannot be modified: ${unknown.join(", ")}`);
	if (!keys.length) throw new HttpError(400, "Provide at least one auction field");
	for (const field of ["title", "description", "category", "imageUrl"]) {
		if (field in body && typeof body[field] !== "string") throw new HttpError(400, `${field} must be a string`);
	}
	if ("startingPrice" in body && (typeof body.startingPrice !== "number" || !Number.isFinite(body.startingPrice) || body.startingPrice < 0)) {
		throw new HttpError(400, "startingPrice must be a finite number zero or greater");
	}
	if ("endsAt" in body && (typeof body.endsAt !== "string" || !Number.isFinite(Date.parse(body.endsAt)) || Date.parse(body.endsAt) <= Date.now())) {
		throw new HttpError(400, "endsAt must be a valid future date string");
	}
	if ('startsAt' in body && (typeof body.startsAt !== 'string' || !Number.isFinite(Date.parse(body.startsAt)))) throw new HttpError(400, 'startsAt must be a valid date string');
	if (creating) {
		const missing = ["title", "description", "category", "startingPrice", "endsAt"].filter((field) => !(field in body));
		if (missing.length) throw new HttpError(400, `Missing required fields: ${missing.join(", ")}`);
	}
	return Object.fromEntries(keys.map((key) => [key, body[key]]));
}

async function findAuction(id, session) {
	if (!mongoose.isObjectIdOrHexString(id)) throw new HttpError(400, "Invalid auction ID: expected a 24-character hexadecimal ObjectId");
	const auction = await Auction.findById(id, null, { session });
	if (!auction) throw new HttpError(404, "Auction not found");
	return auction;
}

export async function createAuction(req, res) {
	const fields = validateBody(req.body, true);
	if (fields.startsAt && Date.parse(fields.startsAt) >= Date.parse(fields.endsAt)) throw new HttpError(400, 'Start time must be before end time');
	const auction = await Auction.create({ ...fields, currentPrice: fields.startingPrice, sellerId: req.user._id, sellerName: req.user.username, approval: req.user.role === 'admin' ? 'approved' : 'waiting' });
	res.status(201).json({ success: true, data: auction });
}

export async function listAuctions(req, res) {
	const { search, category, status, seller, approval, scope, sort = "-createdAt" } = req.query;
	for (const [key, value] of Object.entries(req.query)) {
		if (!["search", "category", "status", "sort", 'seller', 'approval', 'scope'].includes(key)) throw new HttpError(400, `Unknown query parameter: ${key}`);
		if (typeof value !== "string") throw new HttpError(400, `${key} must be a single string`);
	}
	const clauses = [];
	const filter = {};
	if (scope === 'mine') {
		if (!req.user) throw new HttpError(401, 'Please log in');
		filter.sellerId = req.user._id;
	} else if (scope === 'all') {
		if (req.user?.role !== 'admin') throw new HttpError(403, 'Admin access required');
	} else {
		if (scope) throw new HttpError(400, 'Invalid scope');
		clauses.push({ $or: [{ approval: 'approved' }, { approval: { $exists: false } }] });
	}
	if (approval) {
		if (!['waiting', 'approved', 'not-approved'].includes(approval)) throw new HttpError(400, 'Invalid approval status');
		filter.approval = approval;
	}
	if (seller) filter.sellerName = seller;
	if (search?.trim()) filter.title = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
	if (category?.trim()) filter.category = category.trim();
	if (status !== undefined) {
		if (!["open", "closed", 'upcoming'].includes(status)) throw new HttpError(400, "status must be open, closed or upcoming");
		const now = new Date();
		filter.endsAt = status === 'closed' ? { $lte: now } : { $gt: now };
		if (status === 'upcoming') filter.startsAt = { $gt: now };
		if (status === 'open') clauses.push({ $or: [{ startsAt: { $lte: now } }, { startsAt: { $exists: false } }] });
	}
	if (clauses.length) filter.$and = clauses;
	const order = {};
	for (const term of sort.split(",")) {
		const field = term.startsWith("-") ? term.slice(1) : term;
		if (!sortFields.includes(field)) throw new HttpError(400, `Invalid sort field. Allowed: ${sortFields.join(", ")} (prefix - for descending)`);
		order[field] = term.startsWith("-") ? -1 : 1;
	}
	order._id = 1;
	const auctions = await Auction.find(filter).sort(order);
	res.json({ success: true, count: auctions.length, data: auctions });
}

export async function getAuction(req, res) {
	const auction = await findAuction(req.params.id);
	if (!canView(req.user, auction)) throw new HttpError(404, 'Auction not found');
	res.json({ success: true, data: auction });
}

export async function updateAuction(req, res) {
	// Check ID/existence before opening a transaction, preserving CRUD error ordering.
	const existing = await findAuction(req.params.id);
	if (!canManage(req.user, existing)) throw new HttpError(403, 'You can only edit your own auctions');
	const fields = validateBody(req.body);
	const auction = await mongoose.connection.transaction(async (session) => {
		const document = await findAuction(req.params.id, session);
		if (!canManage(req.user, document)) throw new HttpError(403, 'You can only edit your own auctions');
		if (await Payment.exists({ auctionId: document._id }).session(session)) throw new HttpError(409, 'Settled auctions cannot be edited');
		const hasBids = await Bid.exists({ auctionId: document._id }).session(session);
		if (hasBids && 'currency' in fields && fields.currency !== (document.currency || 'LKR')) throw new HttpError(409, 'Currency cannot change after bids exist');
		if (hasBids && 'startsAt' in fields && Date.parse(fields.startsAt) !== document.startsAt?.getTime()) throw new HttpError(409, 'Start time cannot change after bids exist');
		if ("startingPrice" in fields && fields.startingPrice !== document.startingPrice) {
			if (hasBids) {
				throw new HttpError(409, "startingPrice cannot be changed after bids exist");
			}
			document.currentPrice = fields.startingPrice;
		}
		document.set(fields);
		if (document.startsAt && document.startsAt >= document.endsAt) throw new HttpError(400, 'Start time must be before end time');
		if (req.user.role === 'seller' && !hasBids) document.approval = 'waiting';
		await document.save({ session });
		return document;
	}, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
	res.json({ success: true, data: auction });
}

export async function deleteAuction(req, res) {
	const existing = await findAuction(req.params.id);
	if (!canManage(req.user, existing)) throw new HttpError(403, 'You can only delete your own auctions');
	await mongoose.connection.transaction(async (session) => {
		const auction = await findAuction(req.params.id, session);
		if (!canManage(req.user, auction)) throw new HttpError(403, 'You can only delete your own auctions');
		// Bids only exist in the context of their auction, so remove them with it
		// to avoid leaving orphaned bid history behind.
		await Bid.deleteMany({ auctionId: auction._id }, { session });
		await auction.deleteOne({ session });
	}, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
	res.json({ success: true, message: "Auction deleted successfully" });
}

export async function approveAuction(req, res) {
	const approval = req.body?.approval;
	if (!['waiting', 'approved', 'not-approved'].includes(approval)) throw new HttpError(400, 'Choose waiting, approved or not-approved');
	const auction = await mongoose.connection.transaction(async (session) => {
		const item = await findAuction(req.params.id, session);
		if (approval !== 'approved' && await Bid.exists({ auctionId: item._id }).session(session)) throw new HttpError(409, 'An auction with bids must remain approved');
		item.approval = approval;
		await item.save({ session });
		return item;
	});
	res.json({ success: true, data: auction });
}
