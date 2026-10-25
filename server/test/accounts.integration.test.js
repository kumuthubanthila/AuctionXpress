import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Payment from '../models/Payment.js';
import Message from '../models/Message.js';
import { ensureDemoAdmin } from '../controllers/authController.js';

test('Atlas accounts, seller ownership, approval, bids, winner checkout and admin management', { skip: !process.env.TEST_MONGO_URI }, async (t) => {
  const database = `ax_auth_${new mongoose.Types.ObjectId()}`;
  t.after(async () => {
    try { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); }
    finally { await mongoose.disconnect(); }
  });
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: database, serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Session.init(), Auction.init(), Bid.init(), Payment.init(), Message.init()]);
  await ensureDemoAdmin();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, cookie) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) }, ...(body !== undefined && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const profile = { firstName: 'Integration', lastName: 'Test', email: 'test@example.com', contactNo: '0771234567', password: 'password123' };
  const buyer = await request('/auth/signup','POST',{ ...profile, role: 'buyer', username: 'buyer' });
  const seller = await request('/auth/signup','POST',{ ...profile, role: 'seller', username: 'seller' });
  const other = await request('/auth/signup','POST',{ ...profile, role: 'seller', username: 'other_seller' });
  const admin = await request('/auth/login','POST',{ username: 'admin', password: 'admin' });
  for (const account of [buyer,seller,other]) assert.equal(account.status,201,JSON.stringify(account.body));
  assert.equal(admin.status,200);
  assert.equal((await request('/auth/login','POST',{ username:'admin',password:'wrong' })).status,401);
  assert.equal((await request('/admin/users','GET',undefined,buyer.cookie)).status,403);
  assert.equal((await request('/admin/users','GET',undefined,admin.cookie)).body.data.length,4);
  const fields = { title:'Integration watch',description:'Demo item',category:'Watches',startingPrice:100,endsAt:new Date(Date.now()+600000).toISOString() };
  const listing = await request('/auctions','POST',fields,seller.cookie);
  assert.equal(listing.status,201,JSON.stringify(listing.body));
  const id = listing.body.data._id;
  assert.equal(listing.body.data.approval,'waiting');
  assert.equal((await request('/auctions')).body.count,0);
  assert.equal((await request(`/auctions/${id}`)).status,404);
  assert.equal((await request(`/auctions/${id}`,'PUT',{title:'Wrong owner'},other.cookie)).status,403);
  assert.equal((await request('/auctions?scope=mine','GET',undefined,seller.cookie)).body.count,1);
  assert.equal((await request(`/auctions/${id}/approval`,'PATCH',{approval:'approved'},admin.cookie)).status,200);
  assert.equal((await request('/auctions?seller=seller')).body.count,1);
  const scheduled = await request('/auctions','POST',{...fields,title:'Scheduled watch',startsAt:new Date(Date.now()+60000).toISOString()},seller.cookie);
  assert.equal(scheduled.status,201);
  const scheduledId = scheduled.body.data._id;
  assert.equal((await request(`/auctions/${scheduledId}/approval`,'PATCH',{approval:'approved'},admin.cookie)).status,200);
  assert.equal((await request('/auctions?status=upcoming&category=Watches&seller=seller')).body.count,1);
  assert.equal((await request(`/auctions/${scheduledId}/bids`,'POST',{amount:150},buyer.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}/bids`,'POST',{amount:150},seller.cookie)).status,403);
  const placed = await request(`/auctions/${id}/bids`,'POST',{amount:150,bidderName:'spoofed'},buyer.cookie);
  assert.equal(placed.status,201,JSON.stringify(placed.body));
  assert.equal(placed.body.data.bidderName,'buyer');
  assert.equal(placed.body.data.bidderId,buyer.body.data._id);
  assert.equal((await request(`/auctions/${id}/bids`,'POST',{amount:150},buyer.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}`,'DELETE',undefined,seller.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}`,'PUT',{startingPrice:90},seller.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}/approval`,'PATCH',{approval:'not-approved'},admin.cookie)).status,409);
  assert.equal((await request('/account/bids','GET',undefined,buyer.cookie)).body.data.length,1);
  await Auction.updateOne({_id:id},{$set:{endsAt:new Date(Date.now()-1000)}});
  const result = await request(`/auctions/${id}/result`,'GET',undefined,buyer.cookie);
  assert.equal(result.body.data.won,true);
  assert.equal((await request(`/auctions/${id}/payment`,'POST',{method:'card',reference:'DEMO-ONLY'},buyer.cookie)).status,201);
  assert.equal((await request(`/auctions/${id}/payment`,'POST',{method:'card',reference:'DUPLICATE'},buyer.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}`,'PUT',{endsAt:new Date(Date.now()+60000).toISOString()},admin.cookie)).status,409);
  assert.equal((await request(`/auctions/${id}/result`,'GET',undefined,buyer.cookie)).body.data.payment.status,'demo-completed');
  await Auction.updateOne({_id:scheduledId},{$set:{startsAt:new Date(Date.now()-1000)}});
  assert.equal((await request(`/auctions/${scheduledId}/bids`,'POST',{amount:175},buyer.cookie)).status,201);
  await Auction.updateOne({_id:scheduledId},{$set:{endsAt:new Date(Date.now()-1000)}});
  assert.equal((await request(`/auctions/${scheduledId}/payment`,'POST',{method:'bank',reference:'DEMO-BANK'},buyer.cookie)).status,201);
  assert.equal((await request('/messages','POST',{name:'Buyer',email:'test@example.com',subject:'Feedback',message:'Integration message'},buyer.cookie)).status,201);
  const inbox = await request('/admin/messages','GET',undefined,admin.cookie);
  assert.equal(inbox.body.data.length,1);
  assert.equal((await request(`/admin/messages/${inbox.body.data[0]._id}`,'DELETE',undefined,admin.cookie)).status,200);
  const added = await request('/admin/users','POST',{...profile,username:'new_admin',role:'admin'},admin.cookie);
  assert.equal(added.status,201);
  const secondAdmin = await request('/auth/login','POST',{username:'new_admin',password:profile.password});
  assert.equal((await request(`/admin/users/${added.body.data._id}`,'DELETE',undefined,secondAdmin.cookie)).status,409);
  assert.equal((await request(`/admin/users/${admin.body.data._id}`,'DELETE',undefined,secondAdmin.cookie)).status,409);
  assert.equal((await request(`/admin/users/${other.body.data._id}`,'PUT',{firstName:'Edited'},admin.cookie)).status,200);
  // If session revocation fails, the transaction must restore the user as well.
  const deleteSessions = Session.deleteMany;
  Session.deleteMany = async () => { throw new Error('Simulated session cleanup failure'); };
  try {
    assert.equal((await request(`/admin/users/${other.body.data._id}`,'DELETE',undefined,admin.cookie)).status,500);
  } finally { Session.deleteMany = deleteSessions; }
  assert.ok(await User.exists({_id:other.body.data._id}));
  assert.equal((await request('/auth/me','GET',undefined,other.cookie)).body.data._id,other.body.data._id);
  assert.equal((await request(`/admin/users/${other.body.data._id}`,'DELETE',undefined,admin.cookie)).status,200);
  assert.equal(await User.findById(other.body.data._id),null);
  assert.equal(await Session.countDocuments({userId:other.body.data._id}),0);
  assert.equal((await request('/admin/users?role=seller','GET',undefined,admin.cookie)).body.data.some((user) => user._id === other.body.data._id),false);
  assert.equal((await request('/auth/me','GET',undefined,other.cookie)).body.data,null);
  assert.equal((await request('/auth/login','POST',{username:'other_seller',password:profile.password})).status,401);
  assert.equal((await request(`/admin/users/${other.body.data._id}`,'DELETE',undefined,admin.cookie)).status,404);
  // Legacy inactive accounts can be deleted too, releasing their usernames.
  const inactive = await User.create({...profile, username:'inactive_user',role:'buyer',active:false,passwordHash:'unused'});
  assert.equal((await request(`/admin/users/${inactive.id}`,'DELETE',undefined,admin.cookie)).status,200);
  assert.equal((await request('/auth/signup','POST',{...profile,username:'inactive_user',role:'buyer'})).status,201);
  // Delete accounts with history without cascading into financial/bid records.
  const historical = { auctions:await Auction.countDocuments(), bids:await Bid.countDocuments(), payments:await Payment.countDocuments() };
  assert.equal((await request(`/admin/users/${seller.body.data._id}`,'DELETE',undefined,admin.cookie)).status,200);
  assert.equal((await request(`/admin/users/${buyer.body.data._id}`,'DELETE',undefined,admin.cookie)).status,200);
  assert.equal(await User.findById(seller.body.data._id),null);
  assert.equal(await User.findById(buyer.body.data._id),null);
  assert.equal(await Auction.countDocuments(),historical.auctions);
  assert.equal(await Bid.countDocuments(),historical.bids);
  assert.equal(await Payment.countDocuments(),historical.payments);
  assert.equal((await Bid.findOne({auctionId:id})).bidderName,'buyer');
  assert.equal((await Auction.findById(id)).sellerName,'seller');
  assert.equal((await request('/auth/logout','POST',undefined,buyer.cookie)).status,200);
  assert.equal((await request('/auth/me','GET',undefined,buyer.cookie)).body.data,null);
});
