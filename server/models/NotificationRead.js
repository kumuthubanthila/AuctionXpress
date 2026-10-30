import mongoose from 'mongoose';
const schema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	eventId: { type: String, required: true },
	readAt: { type: Date, default: Date.now }
});
schema.index({ userId: 1, eventId: 1 }, { unique: true });
export default mongoose.model('NotificationRead', schema);
