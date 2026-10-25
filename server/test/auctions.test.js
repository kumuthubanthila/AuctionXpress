import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";
import { mockAuth } from '../test-support/auth.js';

test("auction HTTP routes, validation, filters and errors", async (t) => {
  mockAuth(t);
  t.mock.method(mongoose.connection, "transaction", async (callback) => callback({}));
  t.mock.method(Bid, "exists", () => ({ session: async () => null }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = "GET", body) {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: 'auctionxpress_session=test-admin' }, ...(body !== undefined && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  const fields = { title: "Camera", description: "Used camera", category: "Electronics", startingPrice: 50, endsAt: new Date(Date.now() + 86400000).toISOString() };
  let stored;
  let deleted = false;
  let capturedFilter;
  let capturedSort;
  t.mock.method(Auction, "create", async (data) => {
    const candidate = new Auction(data);
    await candidate.validate();
    stored = candidate;
    stored.isNew = false;
    stored.$__reset();
    stored.save = async () => { await stored.validate(); stored.$__reset(); return stored; };
    stored.deleteOne = async () => { deleted = true; };
    return stored;
  });
  t.mock.method(Auction, "findById", async (id) => stored && id === stored.id && !deleted ? stored : null);
  t.mock.method(Auction, "find", (filter) => {
    capturedFilter = filter;
    return { sort: async (order) => { capturedSort = order; return stored && !deleted ? [stored] : []; } };
  });

  assert.equal((await request("/api/health")).status, 200);
  const created = await request("/api/auctions", "POST", fields);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.currentPrice, 50);
  assert.equal(created.body.data.status, "open");
  const path = `/api/auctions/${created.body.data._id}`;
  assert.equal((await request(path)).body.data.title, "Camera");
  const list = await request("/api/auctions?search=a.%2A&category=Electronics&status=open&sort=-startingPrice,title");
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(capturedFilter.title.$regex, "a\\.\\*");
  assert.equal(capturedFilter.category, "Electronics");
  assert.ok(capturedFilter.endsAt.$gt instanceof Date);
  assert.equal(capturedSort.startingPrice, -1);
  assert.equal(capturedSort.title, 1);
  await request("/api/auctions?status=closed");
  assert.ok(capturedFilter.endsAt.$lte instanceof Date);
  assert.equal((await request(path, "PUT", { title: "Updated", startingPrice: 75 })).body.data.currentPrice, 75);

  for (const body of [{ ...fields, startingPrice: -1 }, { ...fields, startingPrice: "50" }, { ...fields, endsAt: "2020-01-01" }, { ...fields, endsAt: "invalid" }, { ...fields, title: " " }, { ...fields, imageUrl: "javascript:alert(1)" }, { ...fields, currentPrice: 1 }, {}]) {
    assert.equal((await request("/api/auctions", "POST", body)).status, 400);
  }
  for (const body of [{ currentPrice: 1 }, { status: "closed" }, { endsAt: null }, { category: "" }, { startingPrice: -1 }, {}]) {
    assert.equal((await request(path, "PUT", body)).status, 400);
  }
  for (const query of ["status=invalid", "sort=invalid", "search[x]=value", "category=a&category=b"]) {
    assert.equal((await request(`/api/auctions?${query}`)).status, 400);
  }
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal((await request("/api/auctions/invalid", method)).status, 400);
    assert.equal((await request("/api/auctions/000000000000000000000000", method)).status, 404);
  }
  const malformed = await fetch(base + "/api/auctions", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).success, false);
  assert.equal((await request("/missing")).status, 404);
  assert.equal((await request(path, "DELETE")).status, 200);
  assert.equal((await request(path)).status, 404);
});

test("schema rejects nonfinite prices and past dates, derives status", async () => {
  const auction = new Auction({ title: "Item", description: "Description", category: "Other", startingPrice: Infinity, currentPrice: -1, endsAt: new Date(Date.now() - 1000) });
  const error = await auction.validate().catch((failure) => failure);
  assert.ok(error.errors.startingPrice);
  assert.ok(error.errors.currentPrice);
  assert.ok(error.errors.endsAt);
  assert.equal(auction.status, "closed");
  auction.startingPrice = 0;
  auction.currentPrice = 0;
  auction.endsAt = new Date(Date.now() + 86400000);
  await auction.validate();
  assert.equal(auction.status, "open");
});
