import express from "express";
import cors from "cors";
import auctionRoutes from "./routes/auctionRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from './routes/authRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import { optionalAuth, checkOrigin } from './middleware/auth.js';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(checkOrigin);
app.use('/uploads', express.static(fileURLToPath(new URL('./uploads/', import.meta.url)), { dotfiles: 'deny', setHeaders(res) { res.set('X-Content-Type-Options', 'nosniff'); } }));
app.get("/", (req, res) => {
	res.send("AuctionXpress Backend is Running!");
});
app.get("/api/health", (req, res) => {
	res.json({ success: true, message: "AuctionXpress API is working!" });
});
app.use('/api', optionalAuth);
app.use('/api/auth', authRoutes);
app.use('/api', communityRoutes);
app.use('/api/activity', activityRoutes);
app.use("/api/auctions", auctionRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
