import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userRepository } from '../repositories/UserRepository';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { userService } from '../services/UserService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { adjutorService } from '../services/AdjutorService';
import { blacklistService } from '../services/BlacklistService';
import { logger } from '@/config/logger';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { first_name, last_name, email, phone, password } = req.body;

      if (!first_name || !last_name || !email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'First name, last name, email, and password are required.',
        });
      }

      // Check if user is blacklisted before proceeding with registration
      const blacklistResult = await this.isBlacklisted({ email, phone });
      if (blacklistResult.status) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Registration denied due to blacklist status.',
          data: {
            blacklist: blacklistResult.blacklist,
          },
        });
      }

      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Email is already in use.',
        });
      }

      const password_hash = await hashPassword(password);

      const user = await userService.createUser({
        first_name,
        last_name,
        email,
        phone,
        password_hash,
      });


      const token = signToken({ userId: user.id as string });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          },
          token,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Email and password are required.',
        });
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (!user.is_active) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      const token = signToken({ userId: user.id as string });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          },
          token,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async logout(req: Request, res: Response) {
    // faux logout
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async profile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await userService.findById(userId as string);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'User not found.',
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          is_active: Boolean(user.is_active),
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  private async isBlacklisted(data: any): Promise<{ status: boolean; blacklist: any | null }> {
    logger.info('Checking blacklist status for:', data);
    try {
      const { email, phone } = data;
      //check db for existing blacklist
      const existingCheck = await blacklistService.findByEmail(email);
      if (existingCheck) {
        return { status: true, blacklist: existingCheck };
      }
      const karmaResult = await adjutorService.checkKarma(email);
      logger.info('Adjutor Karma result:', karmaResult);
      if (karmaResult?.data) {
        // Persist blacklist check result
        const blacklist = await blacklistService.create({
          email,
          phone,
          raw_response: JSON.stringify(karmaResult),
        });
        return { status: true, blacklist: blacklist };
      }
      logger.info('No blacklist found for:', data);
      return { status: false, blacklist: null };
    } catch (err) {
      // If Adjutor API fails, allow registration but log error
      logger.error('Adjutor Karma check failed:', err);
      return { status: false, blacklist: null };
    }
  }
}

export const authController = new AuthController();
