import 'dotenv/config';
import mongoose from 'mongoose';
import { ensureDemoAdmin } from './controllers/authController.js';
import { seedSampleData } from './lib/sampleData.js';

if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to seed sample data');

try {
	console.log('Connecting to MongoDB...');
	await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 10000 });
	console.log('Connected. Creating sample marketplace data...');
	await ensureDemoAdmin();
	const result = await seedSampleData();
	console.log(`Sample data ready: ${result.users} users, ${result.createdAuctions} new auctions, ${result.createdBids} new bids.`);
	process.exitCode = 0;
} catch (error) {
	console.error(`Could not seed sample data: ${error.message}`);
	console.error('Check MONGO_URI in server/.env and, for MongoDB Atlas, allow this device IP in Network Access.');
	process.exitCode = 1;
} finally {
	await mongoose.disconnect();
}
