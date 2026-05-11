import { Router } from 'express';
import { walletController } from '../controllers/WalletController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /wallets/create:
 *   post:
 *     tags:
 *       - Wallets
 *     summary: Create a wallet
 *     description: Create a new wallet for the authenticated user. Each user can have one wallet.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *           example:
 *             pin: "1234"
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Wallet created successfully"
 *                   data:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     user_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     balance: 0.00
 *                     status: "ACTIVE"
 *                     currency: "NGN"
 *                     created_at: "2026-05-11T10:30:00Z"
 *       400:
 *         description: Wallet already exists or user not found
 *         content:
 *           application/json:
 *             examples:
 *               walletExists:
 *                 value:
 *                   success: false
 *                   message: "Wallet already exists for this user"
 */
router.post('/create', walletController.createWallet);

/**
 * @swagger
 * /wallets/my-wallet:
 *   get:
 *     tags:
 *       - Wallets
 *     summary: Get user's wallet
 *     description: Retrieve the authenticated user's wallet details including balance and status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Wallet retrieved successfully"
 *                   data:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     user_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     balance: 50000.00
 *                     status: "ACTIVE"
 *                     currency: "NGN"
 *                     created_at: "2026-05-11T10:30:00Z"
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   message: "Wallet not found"
 */
router.get('/my-wallet', walletController.getWallet);

export default router;
