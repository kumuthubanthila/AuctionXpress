import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { hashPassword } from './passwords.js';

const password = 'welcome2026';

const users = [
	{ username: 'lakmal_perera', role: 'seller', firstName: 'Lakmal', lastName: 'Perera', email: 'lakmal.perera@example.com', contactNo: '+94 77 410 8214' },
	{ username: 'natures_craft', role: 'seller', firstName: 'Shenali', lastName: 'Dias', email: 'shenali.dias@example.com', contactNo: '+94 76 238 9401' },
	{ username: 'urban_findslk', role: 'seller', firstName: 'Ravindu', lastName: 'Silva', email: 'ravindu.silva@example.com', contactNo: '+94 71 682 1150' },
	{ username: 'isuru_j', role: 'buyer', firstName: 'Isuru', lastName: 'Jayawardena', email: 'isuru.j@example.com', contactNo: '+94 77 312 7890' },
	{ username: 'amaya_fernando', role: 'buyer', firstName: 'Amaya', lastName: 'Fernando', email: 'amaya.fernando@example.com', contactNo: '+94 76 541 2863' },
	{ username: 'kasun_g', role: 'buyer', firstName: 'Kasun', lastName: 'Gunasekara', email: 'kasun.g@example.com', contactNo: '+94 77 824 1905' },
	{ username: 'tharushi_m', role: 'buyer', firstName: 'Tharushi', lastName: 'Maduranga', email: 'tharushi.m@example.com', contactNo: '+94 71 925 4418' },
	{ username: 'dilan_rodrigo', role: 'buyer', firstName: 'Dilan', lastName: 'Rodrigo', email: 'dilan.rodrigo@example.com', contactNo: '+94 77 603 7721' }
];

const listings = [
	{ seller: 'lakmal_perera', title: 'Canon EOS 200D II Camera Kit', description: 'Lightly used DSLR with the 18–55 mm kit lens, two batteries, charger, and original neck strap. All controls and autofocus work properly.', category: 'Electronics', startingPrice: 78000, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', startsOffset: -4, endsOffset: 4, bids: [['isuru_j', 82000], ['amaya_fernando', 86000], ['kasun_g', 90000]] },
	{ seller: 'lakmal_perera', title: 'Nintendo Switch OLED Console', description: 'White Nintendo Switch OLED with dock, original Joy-Cons, HDMI cable, and protective travel case. Clean screen and fully tested.', category: 'Electronics', startingPrice: 68000, imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=900&q=80', startsOffset: -2, endsOffset: 6, bids: [['tharushi_m', 72000], ['dilan_rodrigo', 76000]] },
	{ seller: 'lakmal_perera', title: 'Apple Watch Series 8 GPS 45 mm', description: 'Midnight aluminium Apple Watch in excellent condition. Includes charging cable and two spare silicone bands.', category: 'Watches', startingPrice: 55000, imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=900&q=80', startsOffset: 1, endsOffset: 9, bids: [] },
	{ seller: 'natures_craft', title: 'Handwoven Cane Lounge Chair', description: 'Locally made cane lounge chair with a solid timber frame and a removable neutral cushion. Suitable for a reading corner or covered veranda.', category: 'Home & Living', startingPrice: 24000, imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80', startsOffset: -5, endsOffset: 3, bids: [['amaya_fernando', 27000], ['isuru_j', 29500], ['amaya_fernando', 32000]] },
	{ seller: 'natures_craft', title: 'Original Coastal Watercolour Painting', description: 'Framed original watercolour, 45 x 60 cm. A calm coastal scene in soft blues and warm sand tones, ready to hang.', category: 'Arts', startingPrice: 15000, imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=80', startsOffset: -3, endsOffset: 8, bids: [['kasun_g', 17000], ['tharushi_m', 19000]] },
	{ seller: 'natures_craft', title: 'Brass Table Lamp Pair', description: 'Matching pair of brass table lamps with linen shades. Both have been rewired and use standard LED bulbs.', category: 'Home & Living', startingPrice: 18500, imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', startsOffset: -1, endsOffset: 10, bids: [['dilan_rodrigo', 21000]] },
	{ seller: 'natures_craft', title: 'Sterling Silver Moonstone Pendant', description: 'Hand-finished sterling silver pendant with a natural moonstone cabochon. Includes a 45 cm silver chain and gift box.', category: 'Jewelries', startingPrice: 12500, imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80', startsOffset: 2, endsOffset: 13, bids: [] },
	{ seller: 'urban_findslk', title: 'Trek Marlin 6 Mountain Bicycle', description: 'Medium-frame 29-inch mountain bicycle with hydraulic disc brakes and 1x drivetrain. Recently serviced; tyres have plenty of tread.', category: 'Sports', startingPrice: 98000, imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80', startsOffset: -6, endsOffset: 2, bids: [['kasun_g', 105000], ['isuru_j', 112000], ['kasun_g', 118000]] },
	{ seller: 'urban_findslk', title: 'Yamaha FZ-S V3 Motorcycle Helmet', description: 'Full-face motorcycle helmet, size M, with clear visor and washable inner padding. No drops or structural damage.', category: 'Vehicles', startingPrice: 9500, imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80', startsOffset: -4, endsOffset: 5, bids: [['tharushi_m', 11000], ['dilan_rodrigo', 12500]] },
	{ seller: 'urban_findslk', title: 'Samsonite Carry-On Suitcase', description: 'Hard-shell four-wheel carry-on suitcase with combination lock, telescopic handle, and clean interior lining.', category: 'Fashion', startingPrice: 14500, imageUrl: 'https://images.unsplash.com/photo-1553531889-56cd4e9fb0b8?auto=format&fit=crop&w=900&q=80', startsOffset: -2, endsOffset: 7, bids: [['amaya_fernando', 16500]] },
	{ seller: 'urban_findslk', title: 'Vintage Seiko 5 Automatic Watch', description: 'Classic Seiko 5 automatic watch with a stainless-steel bracelet. Keeps time reliably; light wear consistent with age.', category: 'Watches', startingPrice: 22000, imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80', startsOffset: -12, endsOffset: -2, bids: [['isuru_j', 25000], ['dilan_rodrigo', 28000], ['isuru_j', 31000]] },
	{ seller: 'lakmal_perera', title: 'Leather Messenger Bag', description: 'Brown full-grain leather messenger bag with padded laptop sleeve, organiser pockets, and adjustable shoulder strap.', category: 'Handbags', startingPrice: 18000, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', startsOffset: 3, endsOffset: 14, bids: [] }
];

function dateAfterDays(days) {
	return new Date(Date.now() + days * 86400000);
}

async function ensureUser(data) {
	let user = await User.findOne({ username: data.username });
	if (!user) user = await User.create({ ...data, passwordHash: await hashPassword(password) });
	return user;
}

export async function seedSampleData() {
	const accounts = Object.fromEntries(await Promise.all(users.map(async (data) => [data.username, await ensureUser(data)])));
	let createdAuctions = 0;
	let createdBids = 0;

	for (const listing of listings) {
		const { seller: sellerUsername, startsOffset, endsOffset, bids, ...fields } = listing;
		const seller = accounts[sellerUsername];
		let auction = await Auction.findOne({ title: listing.title, sellerId: seller._id });
		if (!auction) {
			const closed = endsOffset < 0;
			// The schema requires a future end date on creation. Close sample
			// listings immediately afterwards so Browse also contains history.
			auction = await Auction.create({ ...fields, currency: 'LKR', startsAt: dateAfterDays(startsOffset), endsAt: dateAfterDays(closed ? 1 : endsOffset), currentPrice: fields.startingPrice, sellerId: seller._id, sellerName: seller.username, approval: 'approved' });
			if (closed) await Auction.updateOne({ _id: auction._id }, { $set: { endsAt: dateAfterDays(endsOffset) } });
			createdAuctions++;
		}

		for (const [username, amount] of bids) {
			const bidder = accounts[username];
			if (!await Bid.exists({ auctionId: auction._id, bidderId: bidder._id, amount })) {
				await Bid.create({ auctionId: auction._id, bidderId: bidder._id, bidderName: bidder.username, amount });
				createdBids++;
			}
		}

		const highest = await Bid.findOne({ auctionId: auction._id }).sort({ amount: -1, createdAt: 1 });
		const currentPrice = highest?.amount ?? auction.startingPrice;
		if (auction.currentPrice !== currentPrice) await Auction.updateOne({ _id: auction._id }, { $set: { currentPrice } });
	}

	return { users: users.length, createdAuctions, createdBids };
}
