import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

const router = Router();

router.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ success: true, message: 'Server is healthy' });
});

export default router;
