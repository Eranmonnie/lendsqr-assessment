import { Router } from "express";
import { transactionController } from "../controllers/TransactionController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /transactions:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get my transactions
 *     description: Retrieve all transactions for the authenticated user with credit/debit classification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT, ALL]
 *         description: Filter by transaction type (CREDIT = money in, DEBIT = money out)
 *         default: ALL
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of transactions to return (default 10, max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of transactions to skip (for pagination)
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [FUND, TRANSFER, WITHDRAWAL]
 *                           amount:
 *                             type: number
 *                           reference:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [PENDING, SUCCESS, FAILED]
 *                           classification:
 *                             type: string
 *                             enum: [CREDIT, DEBIT]
 *                           direction:
 *                             type: string
 *                             enum: [SENT, RECEIVED, FUNDED]
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
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Transactions retrieved successfully"
 *                   data:
 *                     transactions:
 *                       - id: "770e8400-e29b-41d4-a716-446655440000"
 *                         type: "FUND"
 *                         amount: 5000
 *                         reference: "fund-001"
 *                         status: "SUCCESS"
 *                         classification: "CREDIT"
 *                         direction: "FUNDED"
 *                         created_at: "2026-05-11T10:30:00Z"
 *                       - id: "780e8400-e29b-41d4-a716-446655440000"
 *                         type: "TRANSFER"
 *                         amount: 1500
 *                         reference: "transfer-001"
 *                         status: "SUCCESS"
 *                         classification: "DEBIT"
 *                         direction: "SENT"
 *                         created_at: "2026-05-11T10:40:00Z"
 *                     pagination:
 *                       limit: 10
 *                       offset: 0
 *                       total: 2
 *                       hasMore: false
 *       401:
 *         description: Unauthorized
 */
router.get("/", transactionController.getMyTransactions.bind(transactionController));

/**
 * @swagger
 * /transactions/summary:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get transaction summary
 *     description: Get aggregated transaction data (total credits, debits, and net balance)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
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
 *                     credits:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     debits:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     netBalance:
 *                       type: number
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Summary retrieved successfully"
 *                   data:
 *                     credits:
 *                       total: 8500
 *                       count: 3
 *                     debits:
 *                       total: 3000
 *                       count: 2
 *                     netBalance: 5500
 */
router.get(
  "/summary",
  transactionController.getTransactionSummary.bind(transactionController),
);

/**
 * @swagger
 * /transactions/{transactionId}:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get transaction details
 *     description: Retrieve detailed information about a specific transaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID (UUID)
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "770e8400-e29b-41d4-a716-446655440000"
 *                     type: "TRANSFER"
 *                     amount: 1500
 *                     reference: "transfer-001"
 *                     status: "SUCCESS"
 *                     classification: "DEBIT"
 *                     direction: "SENT"
 *                     sender_wallet_id: "660e8400-e29b-41d4-a716-446655440000"
 *                     receiver_wallet_id: "660e8400-e29b-41d4-a716-446655440001"
 *                     created_at: "2026-05-11T10:40:00Z"
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   message: "Transaction not found"
 *       403:
 *         description: Access denied - transaction doesn't belong to you
 *         content:
 *           application/json:
 *             examples:
 *               accessDenied:
 *                 value:
 *                   success: false
 *                   message: "Access denied"
 */
router.get(
  "/:transactionId",
  transactionController.getTransactionById.bind(transactionController),
);

export default router;
