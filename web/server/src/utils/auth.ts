import jwt from 'jsonwebtoken';
import { UserPublicInfo } from '../models/user';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'clawoperations-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** JWT Payload */
export interface JwtPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 生成 JWT 令牌
 */
export function generateToken(user: UserPublicInfo, remember?: boolean): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  // 如果选择"记住我"，延长过期时间到 30 天
  const expiresInSeconds = remember ? 30 * 24 * 60 * 60 : getTokenExpiresIn(false);

  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
}

/**
 * 验证 JWT 令牌
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 解析令牌过期时间（秒）
 */
export function getTokenExpiresIn(remember?: boolean): number {
  const expiresIn = remember ? '30d' : JWT_EXPIRES_IN;
  
  // 解析时间字符串
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    return 7 * 24 * 60 * 60; // 默认 7 天
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60;
    case 'h':
      return value * 60 * 60;
    case 'm':
      return value * 60;
    case 's':
      return value;
    default:
      return 7 * 24 * 60 * 60;
  }
}

/**
 * 从 Authorization 头中提取 Token
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}
