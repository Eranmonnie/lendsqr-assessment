import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
}

/**
 * Signs a JWT for the authenticated user.
 * @param payload JwtPayload (token payload)
 * @returns string (signed JWT)
 * @throws Error if signing fails
 */
export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as any,
  });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * @param token string (JWT token)
 * @returns JwtPayload (decoded token payload)
 * @throws Error if the token is invalid or expired
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
};
