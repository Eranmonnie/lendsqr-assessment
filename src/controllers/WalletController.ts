import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { walletService } from '../services/WalletService';

export class WalletController {
  /**
   * Creates a wallet for the authenticated user.
   * @param req AuthenticatedRequest (wallet creation payload)
   * @param res Response (HTTP response object)
   * @returns Promise<any> (wallet creation response)
   * @throws Error if wallet creation fails
   */
  async createWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const { pin } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // check if user already has a wallet
      const existingWallet = await walletService.findByUserId(userId);
      if (existingWallet) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'User already has a wallet.',
        });
      }

      if (!pin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'PIN is required to create a wallet.',
        });
      }

      const wallet = await walletService.createWalletWithPin(userId, pin);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Wallet created successfully',
        data: wallet,
      });
    } catch (error: any) {
      if (error.message === 'User already has a wallet.') {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message === 'PIN must be a 4-digit number.') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * Retrieves the authenticated user's wallet.
   * @param req AuthenticatedRequest (current request context)
   * @param res Response (HTTP response object)
   * @returns Promise<any> (wallet retrieval response)
   * @throws Error if wallet lookup fails
   */
  async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const wallet = await walletService.findByUserId(userId);

      if (!wallet) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Wallet not found.',
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: wallet,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}

export const walletController = new WalletController();
