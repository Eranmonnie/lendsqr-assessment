import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Create a new user account with email, phone, and personal information. Includes Adjutor blacklist check.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *           example:
 *             email: john@example.com
 *             phone: "08012345678"
 *             password: SecurePass123
 *             first_name: John
 *             last_name: Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "User registered successfully"
 *                   data:
 *                     id: "550e8400-e29b-41d4-a716-446655440000"
 *                     email: "john@example.com"
 *                     phone: "08012345678"
 *                     first_name: "John"
 *                     last_name: "Doe"
 *                     created_at: "2026-05-11T10:30:00Z"
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             examples:
 *               userExists:
 *                 value:
 *                   success: false
 *                   message: "User with this email already exists"
 *       500:
 *         description: Server error
 */
router.post('/register', authController.register.bind(authController));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Authenticate user with email and password. Returns JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *           example:
 *             email: john@example.com
 *             password: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Login successful"
 *                   data:
 *                     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       id: "550e8400-e29b-41d4-a716-446655440000"
 *                       email: "john@example.com"
 *                       phone: "08012345678"
 *                       first_name: "John"
 *                       last_name: "Doe"
 *                       created_at: "2026-05-11T10:30:00Z"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             examples:
 *               invalidCredentials:
 *                 value:
 *                   success: false
 *                   message: "Invalid email or password"
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get authenticated user profile
 *     description: Retrieve the currently authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Profile retrieved successfully"
 *                   data:
 *                     id: "550e8400-e29b-41d4-a716-446655440000"
 *                     first_name: "John"
 *                     last_name: "Doe"
 *                     email: "john@example.com"
 *                     phone: "08012345678"
 *                     is_active: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/profile', authenticate, authController.profile.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     description: Logout the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Logged out successfully"
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
