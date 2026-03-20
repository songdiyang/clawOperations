import { Router, Request, Response } from 'express';
import { getPublisher, setPublisher, getPublisherStatus, refreshToken, hasPublisherConfig, getPublisherConfig } from '../services/publisher';
import { DouyinConfig } from '../../../../src/models/types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { userAuthConfigService } from '../services/user-auth-config-service';
import { userService } from '../services/user-service';
import { generateToken } from '../utils/auth';
import { DouyinUserInfo } from '../models/user';
import axios from 'axios';
import { appConfigService } from '../services/app-config-service';

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
    appConfigService.setDouyinConfig({
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      openId: config.openId,
    });
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
    appConfigService.setDouyinConfig({
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      openId: tokenInfo.openId,
      expiresAt: tokenInfo.expiresAt,
    });
    const currentConfig = getPublisherConfig();
    if (currentConfig) {
      setPublisher({
        ...currentConfig,
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
    appConfigService.setDouyinConfig({
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      openId: tokenInfo.openId,
      expiresAt: tokenInfo.expiresAt,
    });
    const currentConfig = getPublisherConfig();
    if (currentConfig) {
      setPublisher({
        ...currentConfig,
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

/**
 * GET /api/auth/login/douyin/url
 * 获取抖音 OAuth 登录授权 URL
 */
router.get('/login/douyin/url', (req: Request, res: Response) => {
  try {
    if (!hasPublisherConfig()) {
      return res.status(400).json({
        success: false,
        error: '请先配置抖音应用信息（Client Key、Client Secret、Redirect URI）',
      });
    }
    
    const pub = getPublisher();
    // 生成登录用的授权URL，使用默认 scopes，带上 login 状态标识
    const url = pub.getAuthUrl(undefined, 'login');
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
 * POST /api/auth/login/douyin/callback
 * 处理抖音 OAuth 登录回调
 */
router.post('/login/douyin/callback', async (req: Request, res: Response) => {
  try {
    const { code, remember } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少授权码',
      });
    }

    const config = getPublisherConfig();
    
    if (!config || !config.clientKey || !config.clientSecret) {
      return res.status(400).json({
        success: false,
        error: '抖音应用配置不完整',
      });
    }

    // 1. 用授权码换取 access_token
    const tokenResponse = await axios.post('https://open.douyin.com/oauth/access_token/', null, {
      params: {
        client_key: config.clientKey,
        client_secret: config.clientSecret,
        code: code,
        grant_type: 'authorization_code',
      },
    });

    const tokenData = tokenResponse.data;
    if (tokenData.data.error_code !== 0) {
      return res.status(400).json({
        success: false,
        error: tokenData.data.description || '获取抖音 Token 失败',
      });
    }

    const accessToken = tokenData.data.access_token;
    const refreshTokenValue = tokenData.data.refresh_token;
    const openId = tokenData.data.open_id;
    const expiresIn = tokenData.data.expires_in;

    // 2. 获取抖音用户信息
    const userInfoResponse = await axios.get('https://open.douyin.com/oauth/userinfo/', {
      params: {
        access_token: accessToken,
        open_id: openId,
      },
    });

    const userInfoData = userInfoResponse.data;
    if (userInfoData.data.error_code !== 0) {
      return res.status(400).json({
        success: false,
        error: userInfoData.data.description || '获取抖音用户信息失败',
      });
    }

    const douyinUserInfo: DouyinUserInfo = {
      open_id: openId,
      nickname: userInfoData.data.nickname || '抖音用户',
      avatar: userInfoData.data.avatar || '',
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      expires_in: expiresIn,
    };

    // 3. 创建或更新本地用户
    const user = await userService.createOrUpdateFromDouyin(douyinUserInfo);

    // 4. 保存抖音 Token 到用户配置
    userAuthConfigService.upsertConfig(user.id, {
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      accessToken: accessToken,
      refreshToken: refreshTokenValue,
      openId: openId,
    });
    userAuthConfigService.updateTokens(user.id, {
      accessToken: accessToken,
      refreshToken: refreshTokenValue,
      openId: openId,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    // 5. 同时更新全局配置（保持向后兼容）
    appConfigService.setDouyinConfig({
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      accessToken: accessToken,
      refreshToken: refreshTokenValue,
      openId: openId,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    setPublisher({
      ...config,
      accessToken: accessToken,
      refreshToken: refreshTokenValue,
      openId: openId,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    // 6. 生成系统 JWT Token
    const token = generateToken(user, remember);

    res.json({
      success: true,
      data: {
        user,
        token,
        expiresIn: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
        douyinInfo: {
          nickname: douyinUserInfo.nickname,
          avatar: douyinUserInfo.avatar,
        },
      },
    });
  } catch (error) {
    console.error('抖音 OAuth 登录失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '抖音登录失败',
    });
  }
});

export default router;
