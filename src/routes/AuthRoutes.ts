import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '@/middlewares/authMiddleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);

export default router;
