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
 *       400:
 *         description: Wallet already exists or user not found
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
 *       404:
 *         description: Wallet not found
 */
router.get('/my-wallet', walletController.getWallet);

export default router;
