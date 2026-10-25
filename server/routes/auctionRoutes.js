import { Router } from "express";
import { createAuction, listAuctions, getAuction, updateAuction, deleteAuction, approveAuction } from "../controllers/auctionController.js";
import { createBid, listBids } from "../controllers/bidController.js";
import { roles } from '../middleware/auth.js';
import { auctionResult, demoPayment } from '../controllers/communityController.js';

const router = Router();
router.route("/").post(roles('seller', 'admin'), createAuction).get(listAuctions);
router.route("/:id/bids").post(roles('buyer'), createBid).get(listBids);
router.get('/:id/result', auctionResult);
router.post('/:id/payment', roles('buyer'), demoPayment);
router.patch('/:id/approval', roles('admin'), approveAuction);
router.route("/:id").get(getAuction).put(roles('seller', 'admin'), updateAuction).delete(roles('seller', 'admin'), deleteAuction);
export default router;
