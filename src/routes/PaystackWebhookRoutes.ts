import { paystackWebhookController } from "../controllers/PaystackWebhookController";
import { Router } from "express";


const router = Router();

/**
 * @swagger
 * /paystack/webhook:
 *   post:
 *     tags:
 *       - Paystack
 *     summary: Handle Paystack webhooks
 *     description: Receive and process Paystack events such as charge.success, transfer.success, and transfer.failed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum:
 *                   - charge.success
 *                   - transfer.success
 *                   - transfer.failed
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid webhook signature
 */
router.post('/webhook', paystackWebhookController.paystackWebhook);

export default router;