import mongoose from 'mongoose';
import { currencies } from '../lib/currencies.js';
const schema = new mongoose.Schema({
	auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, unique: true },
	buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	amount: { type: Number, required: true },
	currency: { type: String, enum: currencies, default: 'LKR', required: true },
	method: { type: String, enum: ['card', 'bank'], required: true },
	reference: { type: String, required: true },
	status: { type: String, default: 'demo-completed', enum: ['demo-completed'] }
}, { timestamps: true });
export default mongoose.model('Payment', schema);
