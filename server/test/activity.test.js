import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationEvents } from '../lib/notificationEvents.js';
import DirectMessage from '../models/DirectMessage.js';
import app from '../app.js';

test('notification events distinguish outbid, self-raises, closure and winning with stable IDs', () => {
	const endsAt = new Date('2030-01-01T12:00:00Z');
	const auction = { _id: 'auction', title: 'Watch', endsAt, currency: 'USD' };
	const bids = [
		{ _id: 'one', auctionId: 'auction', bidderId: 'me', amount: 100, createdAt: new Date('2030-01-01T10:00:00Z') },
		{ _id: 'two', auctionId: 'auction', bidderId: 'me', amount: 200, createdAt: new Date('2030-01-01T10:01:00Z') },
		{ _id: 'three', auctionId: 'auction', bidderId: 'other', amount: 300, createdAt: new Date('2030-01-01T10:02:00Z') }
	];
	const open = notificationEvents([auction], bids, 'me', new Date('2030-01-01T11:00:00Z'));
	assert.deepEqual(open.map((event) => event.type), ['outbid']);
	assert.equal(open[0].id, 'outbid:three');
	assert.equal(open[0].currency, 'USD');
	const lost = notificationEvents([auction], bids, 'me', endsAt);
	assert.deepEqual(lost.map((event) => event.type), ['closed', 'outbid']);
	assert.equal(notificationEvents([auction], bids, 'other', endsAt)[0].type, 'won');
	assert.deepEqual(notificationEvents([auction], bids, 'stranger', endsAt), []);
	assert.deepEqual(notificationEvents([auction], bids, 'me', endsAt).map((event) => event.id), lost.map((event) => event.id));
	bids.push({ _id:'four',auctionId:'auction',bidderId:'me',amount:400,createdAt:new Date('2030-01-01T10:03:00Z') });
	assert.equal(notificationEvents([auction], bids, 'me', endsAt)[0].type, 'won');
});

test('private activity endpoints require authentication and message validation rejects blanks', async (t) => {
	const invalid = new DirectMessage({ content:' ',conversationId:'000000000000000000000001',senderId:'000000000000000000000002' });
	await assert.rejects(invalid.validate());
	invalid.content = 'x'.repeat(2001);
	await assert.rejects(invalid.validate());
	const server = app.listen(0,'127.0.0.1');
	await new Promise((resolve) => server.once('listening',resolve));
	t.after(() => new Promise((resolve) => server.close(resolve)));
	for (const path of ['notifications','conversations','conversations/000000000000000000000001/messages']) {
		const response = await fetch(`http://127.0.0.1:${server.address().port}/api/activity/${path}`);
		assert.equal(response.status,401);
	}
});
