import { Router } from 'express';
import { getPublisher, setPublisher, getPublisherStatus, refreshToken } from '../services/publisher';
import { DouyinConfig } from '../../../../src/models/types';

const router = Router();

/**
 * GET /api/auth/status
 * 获取认证状态
 */
router.get('/status', (req, res) => {
  const status = getPublisherStatus();
  res.json({
    success: true,
    data: status,
  });
});

/**
 * POST /api/auth/config
 * 配置认证信息
 */
router.post('/config', (req, res) => {
  try {
    const config: DouyinConfig = req.body;
    
    // 验证必要参数
    if (!config.clientKey || !config.clientSecret || !config.redirectUri) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: clientKey, clientSecret, redirectUri',
      });
    }

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
router.get('/url', (req, res) => {
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
router.post('/callback', async (req, res) => {
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
router.post('/refresh', async (req, res) => {
  try {
    const tokenInfo = await refreshToken();
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
