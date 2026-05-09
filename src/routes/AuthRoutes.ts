import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
