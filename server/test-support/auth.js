import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import { tokenHash } from '../lib/passwords.js';
export function mockAuth(t, mockPayment = true) {
	const users = {
		'test-admin': { _id: '000000000000000000000001', username: 'admin', role: 'admin', active: true },
		'test-buyer': { _id: '000000000000000000000002', username: 'sam', role: 'buyer', active: true },
		'test-seller': { _id: '000000000000000000000003', username: 'seller', role: 'seller', active: true }
	};
	t.mock.method(Session, 'findOne', (filter) => ({ populate: async () => {
		const token = Object.keys(users).find((value) => tokenHash(value) === filter.tokenHash);
		return token ? { userId: users[token] } : null;
	} }));
	if (mockPayment) t.mock.method(Payment, 'exists', () => ({ session: async () => null }));
}
