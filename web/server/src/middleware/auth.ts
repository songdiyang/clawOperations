import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/auth';
import { userService } from '../services/user-service';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userId?: number;
    }
  }
}

/**
 * 认证中间件 - 必须登录
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    res.status(401).json({
      success: false,
      error: '未提供认证令牌',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: '认证令牌无效或已过期',
    });
    return;
  }

  // 验证用户是否存在且有效
  const user = userService.findById(payload.userId);
  if (!user || user.is_active !== 1) {
    res.status(401).json({
      success: false,
      error: '用户不存在或已被禁用',
    });
    return;
  }

  // 将用户信息附加到请求对象
  req.user = payload;
  req.userId = payload.userId;

  next();
}

/**
 * 可选认证中间件 - 登录时附加用户信息，未登录也可继续
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = userService.findById(payload.userId);
      if (user && user.is_active === 1) {
        req.user = payload;
        req.userId = payload.userId;
      }
    }
  }

  next();
}

/**
 * 管理员认证中间件
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 先执行普通认证
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: '需要管理员权限',
      });
      return;
    }
    next();
  });
}
