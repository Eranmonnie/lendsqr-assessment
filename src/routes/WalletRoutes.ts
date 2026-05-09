import { Router } from 'express';
import { walletController } from '../controllers/WalletController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/create', walletController.createWallet);

router.get('/my-wallet', walletController.getWallet);

export default router;
