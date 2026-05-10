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
 *       404:
 *         description: Transaction not found
 *       403:
 *         description: Access denied - transaction doesn't belong to you
 */
router.get(
  "/:transactionId",
  transactionController.getTransactionById.bind(transactionController),
);

export default router;
