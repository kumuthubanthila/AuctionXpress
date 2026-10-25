import { randomBytes } from 'node:crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { hashPassword, tokenHash, verifyPassword } from '../lib/passwords.js';
import { cookieName, sessionToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export function userFields(body, { creating = false, admin = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Provide a JSON object');
  const allowed = ['firstName', 'lastName', 'email', 'contactNo', 'password', ...(creating ? ['username', 'role'] : [])];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, 'Unrecognized account fields');
  const fields = {};
  for (const key of Object.keys(body)) {
    if (typeof body[key] !== 'string') throw new HttpError(400, `${key} must be a string`);
    fields[key] = key === 'password' ? body[key] : body[key].trim();
  }
  if (creating) {
    fields.username = fields.username?.toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(fields.username || '')) throw new HttpError(400, 'Username must contain 3–30 letters, numbers or underscores');
    if (!(admin ? ['buyer', 'seller', 'admin'] : ['buyer', 'seller']).includes(fields.role)) throw new HttpError(400, 'Choose buyer or seller');
    if (fields.username === 'admin') throw new HttpError(409, 'This username is reserved');
    if (fields.role === 'admin' && admin) {
      fields.firstName ||= 'Admin'; fields.lastName ||= 'Account'; fields.email ||= `${fields.username}@auctionxpress.local`; fields.contactNo ||= '0000000000';
    }
  }
  for (const key of ['firstName', 'lastName', 'email', 'contactNo']) {
    if ((creating || key in fields) && !fields[key]) throw new HttpError(400, `${key} is required`);
  }
  if ('email' in fields && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new HttpError(400, 'Enter a valid email address');
  if ('contactNo' in fields && !/^[+()\d\s.-]{7,30}$/.test(fields.contactNo)) throw new HttpError(400, 'Enter a valid contact number (7–30 characters)');
  if ((creating || 'password' in fields) && (typeof fields.password !== 'string' || fields.password.length < 8 || fields.password.length > 128)) throw new HttpError(400, 'Password must contain 8–128 characters');
  return fields;
}
export async function createUser(body, admin = false) {
  const fields = userFields(body, { creating: true, admin });
  const passwordHash = await hashPassword(fields.password);
  delete fields.password;
  return User.create({ ...fields, passwordHash });
}
const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
async function signIn(req, res, user, status = 200) {
  const old = sessionToken(req);
  if (old) await Session.deleteOne({ tokenHash: tokenHash(old) });
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 86400000);
  await Session.create({ tokenHash: tokenHash(token), userId: user._id, expiresAt });
  res.cookie(cookieName, token, { ...cookieOptions(), maxAge: 86400000 });
  res.status(status).json({ success: true, data: user });
}
export async function signup(req, res) { await signIn(req, res, await createUser(req.body), 201); }
export async function login(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 128) throw new HttpError(400, 'Enter your username and password');
  const user = await User.findOne({ username: username.trim().toLowerCase(), active: true }).select('+passwordHash');
  const valid = await verifyPassword(password, user?.passwordHash || dummyHash);
  if (!user || !valid) throw new HttpError(401, 'Invalid username or password');
  await signIn(req, res, user);
}
// Valid dummy scrypt encoding keeps unknown-user checks on the password hashing path.
const dummyHash = `${'0'.repeat(32)}:${'0'.repeat(128)}`;
export async function logout(req, res) {
  const token = sessionToken(req);
  if (token) await Session.deleteOne({ tokenHash: tokenHash(token) });
  res.clearCookie(cookieName, cookieOptions()).json({ success: true, message: 'Logged out' });
}
export function me(req, res) { res.json({ success: true, data: req.user || null }); }
export async function updateProfile(req, res) {
  const fields = userFields(req.body);
  const user = await User.findById(req.user._id);
  if (fields.password) { fields.passwordHash = await hashPassword(fields.password); delete fields.password; }
  user.set(fields);
  await user.save();
  if (fields.passwordHash) await Session.deleteMany({ userId: user._id, tokenHash: { $ne: tokenHash(sessionToken(req)) } });
  res.json({ success: true, data: user });
}
export async function ensureDemoAdmin() {
  await User.init();
  if (!await User.exists({ username: 'admin' })) {
    try {
      await User.create({ username: 'admin', passwordHash: await hashPassword('admin'), role: 'admin', firstName: 'Demo', lastName: 'Admin', email: 'admin@auctionxpress.local', contactNo: '0000000000' });
    } catch (error) { if (error.code !== 11000) throw error; }
  }
}
