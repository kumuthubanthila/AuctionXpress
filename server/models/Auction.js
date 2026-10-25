import mongoose from "mongoose";

const price = {
  type: Number,
  required: true,
  min: [0, "Price must be zero or greater"],
  validate: { validator: Number.isFinite, message: "Price must be finite" }
};

const auctionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  imageUrl: {
    type: String, trim: true, default: "",
    validate: {
      validator: (value) => {
        if (!value) return true;
        try { return ["http:", "https:"].includes(new URL(value).protocol); }
        catch { return false; }
      },
      message: "imageUrl must be an HTTP or HTTPS URL"
    }
  },
  startingPrice: { ...price },
  currentPrice: { ...price },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sellerName: { type: String, default: 'Legacy listing' },
  approval: { type: String, enum: ['waiting', 'approved', 'not-approved'], default: 'approved' },
  startsAt: { type: Date, default: Date.now },
  settlementVersion: { type: Number, default: 0 },
  endsAt: {
    type: Date, required: true,
    validate: {
      validator: function (value) {
        return !this.isModified("endsAt") || value.getTime() > Date.now();
      },
      message: "endsAt must be a future date"
    }
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

auctionSchema.virtual("status").get(function () {
  if (this.startsAt?.getTime() > Date.now() && this.endsAt.getTime() > Date.now()) return 'upcoming';
  return this.endsAt.getTime() > Date.now() ? "open" : "closed";
});

export default mongoose.model("Auction", auctionSchema);
