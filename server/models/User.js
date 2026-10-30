import mongoose from 'mongoose';

const schema = new mongoose.Schema({
	username: { type: String, required: true, lowercase: true, trim: true, unique: true, match: /^[a-z0-9_]{3,30}$/ },
	passwordHash: { type: String, required: true, select: false },
	role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
	firstName: { type: String, required: true, trim: true, maxlength: 80 },
	lastName: { type: String, required: true, trim: true, maxlength: 80 },
	email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
	contactNo: { type: String, required: true, trim: true, maxlength: 30 },
	active: { type: Boolean, default: true }
}, { timestamps: true });
schema.set('toJSON', { transform(doc, result) { delete result.passwordHash; return result; } });
export default mongoose.model('User', schema);
