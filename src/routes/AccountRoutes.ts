import { Router } from 'express';
import { accountsController } from '../controllers/AccountsController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Protect the initialization route
router.post('/fund', authenticate, accountsController.fundWallet);
router.post('/withdraw', authenticate, accountsController.withdrawFunds);
router.post('/add-recipient', authenticate, accountsController.addRecipient);
router.get('/recipients', authenticate, accountsController.getReciepients);

//TODO walle to wallet transfer


export default router;
