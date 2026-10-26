import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });
schema.index({ conversationId: 1, createdAt: -1, _id: -1 });
export default mongoose.model('DirectMessage', schema);
