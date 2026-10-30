import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
	bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
	auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true },
	bidderName: { type: String, required: true, trim: true, maxlength: 100 },
	amount: {
		type: Number, required: true, min: [0, "amount must be positive"],
		validate: { validator: (value) => Number.isFinite(value) && value > 0, message: "amount must be a finite positive number" }
	}
}, { timestamps: true });

bidSchema.index({ auctionId: 1, createdAt: -1, _id: -1 });
export default mongoose.model("Bid", bidSchema);
