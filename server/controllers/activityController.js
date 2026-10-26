import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import NotificationRead from '../models/NotificationRead.js';
import Conversation from '../models/Conversation.js';
import DirectMessage from '../models/DirectMessage.js';
import { notificationEvents } from '../lib/notificationEvents.js';
import { objectId } from './communityController.js';
import { HttpError } from '../middleware/errorHandler.js';

async function eventsFor(userId) {
  const ids = await Bid.distinct('auctionId', { bidderId: userId });
  if (!ids.length) return [];
  const [auctions, bids] = await Promise.all([
    Auction.find({ _id: { $in: ids } }).lean(),
    Bid.find({ auctionId: { $in: ids } }).lean()
  ]);
  return notificationEvents(auctions, bids, userId);
}
export async function notifications(req, res) {
  // Derive events from committed bid history and server time: no scheduler or
  // additional write in the bidding transaction, including after a restart.
  const events = await eventsFor(req.user._id);
  const receipts = await NotificationRead.find({ userId: req.user._id, eventId: { $in: events.map((event) => event.id) } }).lean();
  const read = new Set(receipts.map((receipt) => receipt.eventId));
  const data = events.map((event) => ({ ...event, read: read.has(event.id) }));
  res.json({ success: true, unreadCount: data.filter((event) => !event.read).length, data });
}
export async function readNotifications(req, res) {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== 'string')) throw new HttpError(400, 'Provide up to 100 notification IDs');
  const allowed = new Set((await eventsFor(req.user._id)).map((event) => event.id));
  if (ids.some((id) => !allowed.has(id))) throw new HttpError(404, 'Notification not found');
  const unique = [...new Set(ids)];
  if (unique.length) await NotificationRead.bulkWrite(unique.map((eventId) => ({ updateOne: {
    filter: { userId: req.user._id, eventId }, update: { $setOnInsert: { readAt: new Date() } }, upsert: true
  } })));
  res.json({ success: true, message: 'Notifications marked as read' });
}
const participants = (userId) => ({ $or: [{ buyerId: userId }, { sellerId: userId }] });
async function conversationFor(id, userId, session) {
  objectId(id);
  const conversation = await Conversation.findOne({ _id: id, ...participants(userId) }, null, { session });
  if (!conversation) throw new HttpError(404, 'Conversation not found');
  return conversation;
}
export async function startConversation(req, res) {
  objectId(req.body?.auctionId);
  if (Object.keys(req.body).some((key) => key !== 'auctionId')) throw new HttpError(400, 'Only auctionId may be supplied');
  const auction = await Auction.findById(req.body.auctionId);
  if (!auction || (auction.approval && auction.approval !== 'approved')) throw new HttpError(404, 'Auction not found');
  if (!auction.sellerId || !await User.exists({ _id: auction.sellerId, role: 'seller', active: true })) throw new HttpError(409, 'This listing does not have an available seller to message');
  const filter = { auctionId: auction._id, buyerId: req.user._id };
  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate(filter, { $setOnInsert: { sellerId: auction.sellerId } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    conversation = await Conversation.findOne(filter);
  }
  res.json({ success: true, data: conversation });
}
export async function conversations(req, res) {
  const rows = await Conversation.find(participants(req.user._id))
    .populate('auctionId', 'title imageUrl')
    .populate('buyerId', 'username firstName lastName')
    .populate('sellerId', 'username firstName lastName')
    .sort({ updatedAt: -1 }).limit(100).lean();
  const data = await Promise.all(rows.map(async (row) => {
    const ownReadAt = String(row.buyerId?._id) === String(req.user._id) ? row.buyerReadAt : row.sellerReadAt;
    const unreadCount = await DirectMessage.countDocuments({ conversationId: row._id, senderId: { $ne: req.user._id }, createdAt: { $gt: ownReadAt || new Date(0) } });
    return { ...row, unreadCount };
  }));
  res.json({ success: true, unreadCount: data.reduce((sum, row) => sum + row.unreadCount, 0), data });
}
export async function conversationMessages(req, res) {
  const conversation = await conversationFor(req.params.id, req.user._id);
  const data = await DirectMessage.find({ conversationId: conversation._id }).sort({ createdAt: -1, _id: -1 }).limit(200).lean();
  data.reverse();
  // Mark only messages actually returned, so a simultaneous new message stays unread.
  const latest = data.at(-1)?.createdAt;
  if (latest) await Conversation.updateOne({ _id: conversation._id }, { $max: { [String(conversation.buyerId) === String(req.user._id) ? 'buyerReadAt' : 'sellerReadAt']: latest } }, { timestamps: false });
  res.json({ success: true, data });
}
export async function sendDirectMessage(req, res) {
  const body = req.body;
  if (!body || Object.keys(body).some((key) => key !== 'content') || typeof body.content !== 'string' || !body.content.trim() || body.content.trim().length > 2000) throw new HttpError(400, 'Message must contain 1–2000 characters');
  const message = await mongoose.connection.transaction(async (session) => {
    const conversation = await conversationFor(req.params.id, req.user._id, session);
    const partnerId = String(conversation.buyerId) === String(req.user._id) ? conversation.sellerId : conversation.buyerId;
    if (!await User.exists({ _id: partnerId, active: true }).session(session)) throw new HttpError(409, 'This account is no longer available');
    const [record] = await DirectMessage.create([{ conversationId: conversation._id, senderId: req.user._id, content: body.content.trim() }], { session });
    conversation.lastMessage = body.content.trim().slice(0, 160);
    await conversation.save({ session });
    return record;
  });
  res.status(201).json({ success: true, data: message });
}
