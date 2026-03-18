import { Router, Request, Response } from 'express';
import { getPublisher, setPublisher, getPublisherStatus, refreshToken } from '../services/publisher';
import { DouyinConfig } from '../../../../src/models/types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { userAuthConfigService } from '../services/user-auth-config-service';

const router = Router();

/**
 * GET /api/auth/status
 * 获取认证状态
 * 如果已登录，返回用户的配置状态；否则返回全局状态
 */
router.get('/status', optionalAuthMiddleware, (req: Request, res: Response) => {
  if (req.userId) {
    // 已登录用户，返回用户特定配置状态
    const status = userAuthConfigService.getStatus(req.userId);
    res.json({
      success: true,
      data: status,
    });
  } else {
    // 未登录，返回全局状态
    const status = getPublisherStatus();
    res.json({
      success: true,
      data: status,
    });
  }
});

/**
 * POST /api/auth/config
 * 配置认证信息
 * 如果已登录，保存到用户特定配置；否则保存到全局配置
 */
router.post('/config', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const config: DouyinConfig = req.body;
    
    // 验证必要参数
    if (!config.clientKey || !config.clientSecret || !config.redirectUri) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: clientKey, clientSecret, redirectUri',
      });
    }

    if (req.userId) {
      // 已登录用户，保存到用户配置
      userAuthConfigService.upsertConfig(req.userId, {
        clientKey: config.clientKey,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        openId: config.openId,
      });
    }
    
    // 同时保存到全局配置（保持向后兼容）
    setPublisher(config);
    
    res.json({
      success: true,
      message: '配置已保存',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '配置失败',
    });
  }
});

/**
 * GET /api/auth/url
 * 获取授权 URL
 */
router.get('/url', (req: Request, res: Response) => {
  try {
    const pub = getPublisher();
    const url = pub.getAuthUrl();
    res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取授权 URL 失败',
    });
  }
});

/**
 * POST /api/auth/callback
 * 处理授权回调
 */
router.post('/callback', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少授权码',
      });
    }

    const pub = getPublisher();
    const tokenInfo = await pub.handleAuthCallback(code);
    
    // 如果已登录，保存 Token 到用户配置
    if (req.userId) {
      userAuthConfigService.updateTokens(req.userId, {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        openId: tokenInfo.openId,
        expiresAt: tokenInfo.expiresAt,
      });
    }
    
    res.json({
      success: true,
      data: tokenInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '授权失败',
    });
  }
});

/**
 * POST /api/auth/refresh
 * 刷新 Token
 */
router.post('/refresh', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tokenInfo = await refreshToken();
    
    // 如果已登录，更新用户配置中的 Token
    if (req.userId) {
      userAuthConfigService.updateTokens(req.userId, {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        openId: tokenInfo.openId,
        expiresAt: tokenInfo.expiresAt,
      });
    }
    
    res.json({
      success: true,
      data: tokenInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '刷新 Token 失败',
    });
  }
});

export default router;
