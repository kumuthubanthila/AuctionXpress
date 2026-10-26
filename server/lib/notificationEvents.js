export function notificationEvents(auctions, bids, userId, now = new Date()) {
  const events = [];
  const grouped = new Map();
  for (const bid of bids) {
    const key = String(bid.auctionId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(bid);
  }
  for (const auction of auctions) {
    const history = (grouped.get(String(auction._id)) || []).sort((a, b) => a.amount - b.amount);
    if (!history.some((bid) => String(bid.bidderId) === String(userId))) continue;
    let leader;
    for (const bid of history) {
      if (leader && String(leader.bidderId) === String(userId) && String(bid.bidderId) !== String(userId)) {
        events.push({ id: `outbid:${bid._id}`, type: 'outbid', title: 'Someone outbid your bid', message: `You were outbid on “${auction.title}”.`, auctionId: String(auction._id), amount: bid.amount, currency: auction.currency || 'LKR', createdAt: bid.createdAt });
      }
      leader = bid;
    }
    if (leader && new Date(auction.endsAt) <= now) {
      const won = String(leader.bidderId) === String(userId);
      events.push({ id: `closed:${auction._id}:${new Date(auction.endsAt).getTime()}`, type: won ? 'won' : 'closed', title: won ? 'You won the auction!' : 'Your auction has ended', message: won ? `Your bid won “${auction.title}”. Open the auction to view checkout.` : `Bidding for “${auction.title}” has ended. Another buyer placed the winning bid.`, auctionId: String(auction._id), amount: leader.amount, currency: auction.currency || 'LKR', createdAt: auction.endsAt });
    }
  }
  return events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 100);
}
