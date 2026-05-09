import { Router } from 'express';
import { accountsController } from '../controllers/AccountsController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Public route - get banks list
router.get('/banks', accountsController.getBanks);

// Protect the initialization route
router.post('/fund', authenticate, accountsController.fundWallet);
router.post('/withdraw', authenticate, accountsController.withdrawFunds);
router.post('/transfer', authenticate, accountsController.walletToWalletTransfer);
router.post('/bank-enquiry', authenticate, accountsController.bankEnquiry);
router.post('/add-recipient', authenticate, accountsController.addRecipient);
router.get('/recipients', authenticate, accountsController.getRecipients);

export default router;
