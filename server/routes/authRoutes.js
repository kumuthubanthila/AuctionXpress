import { Router } from 'express';
import { signup, login, logout, me, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
const router = Router();
const attempts = new Map();
function limit(req, res, next) {
	const now = Date.now();
	for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
	const key = req.ip;
	const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
	attempts.set(key, entry);
	if (++entry.count > 40) throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.');
	next();
}
router.post('/signup', limit, signup);
router.post('/login', limit, login);
router.post('/logout', logout);
router.get('/me', me);
router.put('/profile', requireAuth, updateProfile);
export default router;
