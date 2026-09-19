import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'ner-routeai-secret-key-sih-2024-production';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '24h';

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookieToken = req.cookies.get('ner_token')?.value || req.cookies.get('sb-access-token')?.value;
  if (cookieToken) return cookieToken;
  return null;
}

export function authenticateRequest(req: NextRequest): TokenPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
