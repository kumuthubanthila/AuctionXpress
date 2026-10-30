import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const key = await scrypt(password, salt, 64);
	return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, hash) {
	const [salt, encoded] = (hash || '').split(':');
	if (!salt || !encoded) return false;
	const expected = Buffer.from(encoded, 'hex');
	const actual = await scrypt(password, salt, 64);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}
