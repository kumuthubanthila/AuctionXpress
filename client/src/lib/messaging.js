export const OPEN_MESSAGES_EVENT = 'auctionxpress:open-messages'

export function openSellerChat(auction) {
	window.dispatchEvent(new CustomEvent(OPEN_MESSAGES_EVENT, {
		detail: { auctionId: auction._id, auctionTitle: auction.title, sellerName: auction.sellerName }
	}))
}
