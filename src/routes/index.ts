import { Router } from 'express';
import authRoutes from './AuthRoutes';
import walletRoutes from './WalletRoutes';
import accountRoutes from './AccountRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallets', walletRoutes);
router.use('/accounts', accountRoutes);

export default router;
