import mongoose from 'mongoose';
const schema = new mongoose.Schema({
	auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
	buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	buyerReadAt: { type: Date, default: null },
	sellerReadAt: { type: Date, default: null },
	lastMessage: { type: String, default: '' }
}, { timestamps: true });
schema.index({ auctionId: 1, buyerId: 1 }, { unique: true });
export default mongoose.model('Conversation', schema);
