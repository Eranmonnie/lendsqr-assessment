import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userRepository } from '../repositories/UserRepository';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { userService } from '@/services/UserService';
import { AuthenticatedRequest } from '@/middlewares/authMiddleware';

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

      //cosequently check blacklist first 

      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Email is already in use.',
        });
      }

      const password_hash = await hashPassword(password);

      const user = await userService.crteateUser({
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

      if (user.is_active === false) {
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
        data: user,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}

export const authController = new AuthController();
