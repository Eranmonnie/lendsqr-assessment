import { Router } from 'express';
import { accountsController } from '../controllers/AccountsController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /accounts/banks:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: Get list of banks
 *     description: Retrieve a paginated list of banks available for withdrawals and recipient setup
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of banks to return (default 50, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of banks to skip (for pagination)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country code (default 'nigeria')
 *       - in: query
 *         name: use_cursor
 *         schema:
 *           type: boolean
 *         description: Use cursor-based pagination from Paystack
 *       - in: query
 *         name: pay_with_bank_transfer
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: enabled_for_verification
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Banks retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     banks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           country:
 *                             type: string
 *                           currency:
 *                             type: string
 *                           type:
 *                             type: string
 *                           active:
 *                             type: boolean
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         per_page:
 *                           type: integer
 *                         cursor_next:
 *                           type: string
 *                         cursor_previous:
 *                           type: string
 */
router.get('/banks', accountsController.getBanks);

/**
 * @swagger
 * /accounts/fund:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Initialize wallet funding
 *     description: Initiate a wallet funding transaction with Paystack. Returns authorization URL for payment.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - idempotency_key
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *               idempotency_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Funding initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authorization_url:
 *                       type: string
 *       400:
 *         description: Invalid amount or duplicate idempotency_key
 */
router.post('/fund', authenticate, accountsController.fundWallet);

/**
 * @swagger
 * /accounts/withdraw:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Withdraw funds to bank account
 *     description: Withdraw funds from wallet to a saved bank recipient account. Requires PIN verification.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - pin
 *               - account_number
 *               - idempotency_key
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *               pin:
 *                 type: string
 *               account_number:
 *                 type: string
 *               idempotency_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid PIN, insufficient funds, or recipient not found
 */
router.post('/withdraw', authenticate, accountsController.withdrawFunds);

/**
 * @swagger
 * /accounts/transfer:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Transfer between wallets
 *     description: Transfer funds from user's wallet to another user's wallet within the platform. Requires PIN verification.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - receiver_wallet_id
 *               - pin
 *               - idempotency_key
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *               receiver_wallet_id:
 *                 type: string
 *                 format: uuid
 *               pin:
 *                 type: string
 *               idempotency_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid PIN, insufficient funds, receiver wallet inactive, or self-transfer is not allowed
 */
router.post('/transfer', authenticate, accountsController.walletToWalletTransfer);

/**
 * @swagger
 * /accounts/bank-enquiry:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Verify bank account
 *     description: Resolve account name for a given account number and bank code. Used before adding recipients.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - bank_code
 *             properties:
 *               account_number:
 *                 type: string
 *               bank_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     account_number:
 *                       type: string
 *                     account_name:
 *                       type: string
 *                     bank_code:
 *                       type: string
 *       400:
 *         description: Invalid account or bank code
 */
router.post('/bank-enquiry', authenticate, accountsController.bankEnquiry);

/**
 * @swagger
 * /accounts/wallet-enquiry:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Verify recipient wallet
 *     description: Check if a wallet exists and is active before initiating a wallet-to-wallet transfer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_wallet_id
 *             properties:
 *               receiver_wallet_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Wallet found and active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         is_active:
 *                           type: boolean
 *       404:
 *         description: Wallet not found
 */
router.post('/wallet-enquiry', authenticate, accountsController.walletEnquiry);

/**
 * @swagger
 * /accounts/add-recipient:
 *   post:
 *     tags:
 *       - Accounts
 *     summary: Save a bank recipient
 *     description: Add a new bank account as a recipient after verifying it with bank-enquiry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_number
 *               - bank_code
 *             properties:
 *               account_number:
 *                 type: string
 *               bank_code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recipient added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     account_number:
 *                       type: string
 *                     account_name:
 *                       type: string
 *                     bank_code:
 *                       type: string
 *       400:
 *         description: Invalid account or recipient already exists
 */
router.post('/add-recipient', authenticate, accountsController.addRecipient);

/**
 * @swagger
 * /accounts/recipients:
 *   get:
 *     tags:
 *       - Accounts
 *     summary: Get saved recipients
 *     description: Retrieve saved bank recipients for the authenticated user with pagination support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of recipients to return (default 10, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of recipients to skip (for pagination)
 *     responses:
 *       200:
 *         description: Recipients retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     recipients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           account_number:
 *                             type: string
 *                           account_name:
 *                             type: string
 *                           bank_code:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 */
router.get('/recipients', authenticate, accountsController.getRecipients);

export default router;
