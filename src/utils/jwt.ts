import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as any,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
};
