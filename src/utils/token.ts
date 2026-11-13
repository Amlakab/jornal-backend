import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'trader';
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'trading_journal_jwt_access_super_secret_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'trading_journal_jwt_refresh_super_secret_key_2026';

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};
