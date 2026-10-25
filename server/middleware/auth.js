import Session from '../models/Session.js';
import { tokenHash } from '../lib/passwords.js';
import { HttpError } from './errorHandler.js';

export const cookieName = 'auctionxpress_session';
export function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}
export async function optionalAuth(req, res, next) {
  const token = sessionToken(req);
  if (token) {
    const session = await Session.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } }).populate('userId');
    if (session?.userId?.active) req.user = session.userId;
  }
  next();
}
export function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Please log in to continue');
  next();
}
export const roles = (...allowed) => (req, res, next) => {
  if (!req.user) throw new HttpError(401, 'Please log in to continue');
  if (!allowed.includes(req.user.role)) throw new HttpError(403, `This action requires a ${allowed.join(' or ')} account`);
  next();
};
export function checkOrigin(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== (process.env.CLIENT_ORIGIN || 'http://localhost:5173')) throw new HttpError(403, 'Request origin is not allowed');
  next();
}
export function canManage(user, auction) {
  return user?.role === 'admin' || (user?.role === 'seller' && String(auction.sellerId) === String(user._id));
}
export function canView(user, auction) {
  return !auction.approval || auction.approval === 'approved' || canManage(user, auction);
}
