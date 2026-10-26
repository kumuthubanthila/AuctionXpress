import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Payment from '../models/Payment.js';
import { createUser, userFields } from './authController.js';
import { hashPassword } from '../lib/passwords.js';
import { canView } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export function objectId(id) { if (!mongoose.isObjectIdOrHexString(id)) throw new HttpError(400, 'Invalid ID'); }
export async function sellers(req, res) {
  const users = await User.find({ role: 'seller', active: true }).select('username firstName lastName email contactNo').sort({ username: 1 });
  res.json({ success: true, data: users });
}
export async function myBids(req, res) {
  const bids = await Bid.find({ bidderId: req.user._id }).populate('auctionId', 'title currentPrice currency endsAt').sort({ createdAt: -1 });
  res.json({ success: true, data: bids });
}
export async function users(req, res) {
  const filter = {};
  if (req.query.role) {
    if (!['buyer', 'seller', 'admin'].includes(req.query.role)) throw new HttpError(400, 'Invalid role');
    filter.role = req.query.role;
  }
  res.json({ success: true, data: await User.find(filter).sort({ createdAt: -1 }) });
}
export async function addUser(req, res) { res.status(201).json({ success: true, data: await createUser(req.body, true) }); }
export async function editUser(req, res) {
  objectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  const fields = userFields(req.body, { admin: true });
  if ('password' in fields) { fields.passwordHash = await hashPassword(fields.password); delete fields.password; }
  user.set(fields); await user.save({ validateBeforeSave: false });
  if (fields.passwordHash) await Session.deleteMany({ userId: user._id });
  res.json({ success: true, data: user });
}
export async function deleteUser(req, res) {
  objectId(req.params.id);
  const deleted = await mongoose.connection.transaction(async (session) => {
    const user = await User.findById(req.params.id, null, { session });
    if (!user) throw new HttpError(404, 'User not found');
    if (user.username === 'admin') throw new HttpError(409, 'The main admin account cannot be deleted');
    if (String(user._id) === String(req.user._id)) throw new HttpError(409, 'You cannot delete your own account while logged in');
    // Preserve auction/bid/payment records and their stored names for history.
    // Account removal and revoking all its sessions must succeed together.
    await User.deleteOne({ _id: user._id }, { session });
    await Session.deleteMany({ userId: user._id }, { session });
    return { _id: user._id, username: user.username };
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  res.json({ success: true, data: deleted, message: `Account "${deleted.username}" deleted. Auction and bid history is retained.` });
}
export async function sendMessage(req, res) {
  const body = req.body;
  if (!body || Object.keys(body).some((key) => !['name', 'email', 'subject', 'message'].includes(key))) throw new HttpError(400, 'Provide name, email, subject and message');
  for (const field of ['name', 'email', 'subject', 'message']) if (typeof body[field] !== 'string' || !body[field].trim()) throw new HttpError(400, `${field} is required`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new HttpError(400, 'Invalid email');
  res.status(201).json({ success: true, data: await Message.create({ ...body, userId: req.user._id, role: req.user.role }) });
}
export async function messages(req, res) { res.json({ success: true, data: await Message.find().sort({ createdAt: -1 }) }); }
export async function removeMessage(req, res) {
  objectId(req.params.id);
  if (!await Message.findByIdAndDelete(req.params.id)) throw new HttpError(404, 'Message not found');
  res.json({ success: true, message: 'Message removed' });
}
export async function uploadImage(req, res) {
  const data = req.body?.data;
  if (typeof data !== 'string') throw new HttpError(400, 'Provide a base64 image data URL');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw new HttpError(400, 'Choose a PNG, JPEG or WebP image');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 12) throw new HttpError(400, 'Image must be between 12 bytes and 5 MB');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new HttpError(400, 'Image content does not match its file type');
  const filename = `${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  const directory = new URL('../uploads/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(filename, directory), bytes, { flag: 'wx' });
  const origin = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`;
  res.status(201).json({ success: true, data: { imageUrl: `${origin}/uploads/${filename}` } });
}
export async function auctionResult(req, res) {
  objectId(req.params.id);
  const auction = await Auction.findById(req.params.id);
  if (!auction || !canView(req.user, auction)) throw new HttpError(404, 'Auction not found');
  const winner = await Bid.findOne({ auctionId: auction._id }).sort({ amount: -1, createdAt: 1 });
  const ended = auction.endsAt.getTime() <= Date.now();
  const won = Boolean(ended && winner?.bidderId && String(winner.bidderId) === String(req.user?._id));
  const payment = won ? await Payment.findOne({ auctionId: auction._id, buyerId: req.user._id }) : null;
  const winningBid = ended && winner ? { amount: winner.amount, ...(req.user && { bidderName: winner.bidderName }) } : null;
  res.json({ success: true, data: { currency: auction.currency || 'LKR', ended, winner: winningBid, won, payment } });
}
export async function demoPayment(req, res) {
  objectId(req.params.id);
  if (!req.body || Object.keys(req.body).some((key) => !['method', 'reference'].includes(key)) || !['card', 'bank'].includes(req.body.method)) throw new HttpError(400, 'Choose card or bank. Do not submit card or bank account details.');
  if (typeof req.body.reference !== 'string' || !req.body.reference.trim() || req.body.reference.length > 100) throw new HttpError(400, 'Provide a payment reference (maximum 100 characters)');
  const payment = await mongoose.connection.transaction(async (session) => {
    // A document write serializes settlement against auction edits/extension.
    const auction = await Auction.findOneAndUpdate({ _id: req.params.id, endsAt: { $lte: new Date() } }, { $inc: { settlementVersion: 1 } }, { session, returnDocument: 'after' });
    if (!auction) throw new HttpError(409, 'Auction must have ended before checkout');
    const winner = await Bid.findOne({ auctionId: auction._id }, null, { session }).sort({ amount: -1 });
    if (!winner?.bidderId || String(winner.bidderId) !== String(req.user._id)) throw new HttpError(403, 'Only the winning buyer can record a payment reference');
    if (await Payment.exists({ auctionId: auction._id }).session(session)) throw new HttpError(409, 'Payment reference already recorded');
    const [record] = await Payment.create([{ auctionId: auction._id, buyerId: req.user._id, amount: winner.amount, currency: auction.currency || 'LKR', method: req.body.method, reference: req.body.reference.trim() }], { session });
    return record;
  });
  res.status(201).json({ success: true, data: payment, message: 'Payment reference recorded. No money was transferred.' });
}
