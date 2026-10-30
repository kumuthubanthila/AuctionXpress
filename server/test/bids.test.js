import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import app from "../app.js";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { mockAuth } from '../test-support/auth.js';

async function http(t) {
	const server = app.listen(0, "127.0.0.1");
	await new Promise((resolve) => server.once("listening", resolve));
	t.after(() => new Promise((resolve) => server.close(resolve)));
	return async (path, method = "GET", body) => {
		const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auctions${path}`, {
			method, headers: { "Content-Type": "application/json", Cookie: `auctionxpress_session=${method === 'POST' && path.endsWith('/bids') ? 'test-buyer' : 'test-admin'}` },
			...(body !== undefined && { body: JSON.stringify(body) })
		});
		return { status: response.status, body: await response.json() };
	};
}

test("bid HTTP validation, duplicate/expired conflicts, history and CRUD guards", async (t) => {
	mockAuth(t);
	const request = await http(t);
	const id = new mongoose.Types.ObjectId().toString();
	const auction = new Auction({ _id: id, title: "Item", description: "Demo", category: "Other", startingPrice: 10, currentPrice: 20, endsAt: new Date(Date.now() + 60000) });
	const session = {};
	let missing = false;
	t.mock.method(mongoose.connection, "transaction", async (callback) => callback(session));
	t.mock.method(Auction, "findById", async () => missing ? null : auction);
	t.mock.method(Auction, "exists", async () => missing ? null : ({ _id: id }));
	t.mock.method(Auction, "findOneAndUpdate", async (filter, update, options) => {
		assert.equal(options.session, session);
		assert.equal(filter._id, id);
		assert.equal(filter.currentPrice.$lt, update.$set.currentPrice);
		assert.ok(filter.endsAt.$gt instanceof Date);
		if (auction.endsAt <= new Date() || auction.currentPrice >= update.$set.currentPrice) return null;
		auction.currentPrice = update.$set.currentPrice;
		return auction;
	});
	const bids = [];
	auction.deleteOne = async () => { missing = true; };
	t.mock.method(Bid, "create", async ([data], options) => {
		assert.equal(options.session, session);
		const bid = new Bid(data);
		await bid.validate();
		bids.push(bid);
		return [bid];
	});
	t.mock.method(Bid, "find", () => ({ sort: async () => bids }));
	t.mock.method(Bid, "exists", () => ({ session: async () => bids.length ? { _id: bids[0]._id } : null }));
	t.mock.method(Bid, "deleteMany", async () => { bids.length = 0; });
	for (const body of [null, [], {}, { bidderName: " ", amount: 30 }, { bidderName: 42, amount: 30 }, { bidderName: "x".repeat(101), amount: 30 }, { bidderName: "Sam", amount: "30" }, { bidderName: "Sam", amount: -1 }, { bidderName: "Sam", amount: 0 }, { bidderName: "Sam", amount: 30, auctionId: id }]) {
		assert.equal((await request(`/${id}/bids`, "POST", body)).status, 400);
	}
	assert.equal((await request("/invalid/bids", "POST", { bidderName: "Sam", amount: 30 })).status, 400);
	assert.equal((await request("/invalid/bids")).status, 400);
	assert.equal((await request(`/${id}/bids`, "POST", { bidderName: "Sam", amount: 20 })).status, 409);
	const accepted = await request(`/${id}/bids`, "POST", { bidderName: " Sam ", amount: 30 });
	assert.equal(accepted.status, 201);
	assert.equal(accepted.body.data.bidderName, "sam");
	assert.equal(accepted.body.currentPrice, 30);
	assert.equal((await request(`/${id}/bids`, "POST", { bidderName: "Lee", amount: 30 })).status, 409);
	assert.equal((await request(`/${id}/bids`)).body.count, 1);
	assert.equal((await request(`/${id}`, "PUT", { startingPrice: 15 })).status, 409);
	assert.equal((await request(`/${id}`, 'PUT', { currency: 'USD' })).status, 409);
	auction.endsAt = new Date(Date.now() - 1000);
	const expired = await request(`/${id}/bids`, "POST", { bidderName: "Lee", amount: 40 });
	assert.equal(expired.status, 409);
	assert.match(expired.body.message, /ended/);
	assert.equal((await request(`/${id}`, "DELETE")).status, 200);
	assert.equal(bids.length, 0);
	assert.equal((await request(`/${id}/bids`)).status, 404);
	assert.equal((await request(`/${id}/bids`, "POST", { bidderName: "Lee", amount: 40 })).status, 404);
});

// Explicit URI only; never use MONGO_URI or load the application's .env here.
test("replica-set integration: competing bids, rollback, and racing CRUD", { skip: !process.env.TEST_MONGO_URI }, async (t) => {
	mockAuth(t, false);
	const database = `ax_test_${new mongoose.Types.ObjectId()}`;
	t.after(async () => {
		try {
			if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
		} finally { await mongoose.disconnect(); }
	});
	await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: database, serverSelectionTimeoutMS: 10000, readConcern: { level: "majority" }, readPreference: "primary" });
	await Promise.all([Auction.init(), Bid.init()]);
	const request = await http(t);
	async function create() {
		return Auction.create({ title: "Race", description: "Test only", category: "Other", startingPrice: 10, currentPrice: 10, endsAt: new Date(Date.now() + 60000) });
	}
	const auction = await create();
	const path = `/${auction.id}`;
	const equal = await Promise.all(Array.from({ length: 8 }, (_, index) => request(`${path}/bids`, "POST", { bidderName: `Bidder ${index}`, amount: 20 })));
	assert.equal(equal.filter((result) => result.status === 201).length, 1);
	assert.equal(equal.filter((result) => result.status === 409).length, 7);
	const different = await Promise.all([30, 40, 50, 60].map((amount) => request(`${path}/bids`, "POST", { bidderName: "Race", amount })));
	assert.ok(different.every((result) => [201, 409].includes(result.status)));
	assert.equal((await Auction.findById(auction.id)).currentPrice, 60, JSON.stringify(different));
	const history = await Bid.find({ auctionId: auction.id });
	assert.equal(history.length, 1 + different.filter((result) => result.status === 201).length);
	assert.equal(Math.max(...history.map((bid) => bid.amount)), 60);

	// Fail after the price write: transaction must roll it back.
	const originalCreate = Bid.create;
	Bid.create = async () => { throw new Error("Simulated bid insert failure"); };
	try {
		assert.equal((await request(`${path}/bids`, "POST", { bidderName: "Rollback", amount: 70 })).status, 500);
	} finally { Bid.create = originalCreate; }
	assert.equal((await Auction.findById(auction.id)).currentPrice, 60);
	assert.equal(await Bid.countDocuments({ auctionId: auction.id }), history.length);
	assert.equal((await request(path, "PUT", { startingPrice: 5 })).status, 409);
	assert.equal((await request(path, "PUT", { startingPrice: 10, title: "Still editable" })).status, 200);
	assert.equal((await Auction.findById(auction.id)).currentPrice, 60);
	await Auction.updateOne({ _id: auction.id }, { $set: { endsAt: new Date(Date.now() - 1000) } });
	assert.equal((await request(`${path}/bids`, "POST", { bidderName: "Late", amount: 80 })).status, 409);
	assert.equal((await request(path, "DELETE")).status, 200);
	assert.equal(await Auction.exists({ _id: auction.id }), null);
	assert.equal(await Bid.exists({ auctionId: auction.id }), null);

	for (let attempt = 0; attempt < 5; attempt++) {
		const target = await create();
		const [bid, deletion] = await Promise.all([
			request(`/${target.id}/bids`, "POST", { bidderName: "Race", amount: 20 }),
			request(`/${target.id}`, "DELETE")
		]);
		assert.equal(deletion.status, 200);
		assert.ok([201, 404].includes(bid.status));
		assert.equal(await Auction.exists({ _id: target.id }), null);
		assert.equal(await Bid.exists({ auctionId: target.id }), null);

		const editable = await create();
		const [offer, edit] = await Promise.all([
			request(`/${editable.id}/bids`, "POST", { bidderName: "Race", amount: 20 }),
			request(`/${editable.id}`, "PUT", { startingPrice: 30 })
		]);
		assert.ok((offer.status === 201 && edit.status === 409) || (offer.status === 409 && edit.status === 200));
		const final = await Auction.findById(editable.id);
		assert.equal(final.currentPrice, offer.status === 201 ? 20 : 30);
	}
});
