/**
 * 系统配置 API 路由
 * 管理员可配置 AI 服务、抖音应用等系统级配置
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { systemConfigService, UpdateAIConfigDTO, UpdateDouyinConfigDTO } from '../services/system-config-service';

const router = Router();

/**
 * GET /api/system/config
 * 获取系统配置概览（脱敏）
 * 需要管理员权限
 */
router.get('/config', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const aiConfig = systemConfigService.getMaskedAIConfig();
    const douyinConfig = systemConfigService.getMaskedDouyinConfig();

    res.json({
      success: true,
      data: {
        ai: aiConfig,
        douyin: douyinConfig,
      },
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统配置失败',
    });
  }
});

/**
 * GET /api/system/config/ai
 * 获取 AI 配置（脱敏）
 * 需要管理员权限
 */
router.get('/config/ai', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const config = systemConfigService.getMaskedAIConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('获取 AI 配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取 AI 配置失败',
    });
  }
});

/**
 * PUT /api/system/config/ai
 * 更新 AI 配置
 * 需要管理员权限
 */
router.put('/config/ai', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const dto: UpdateAIConfigDTO = req.body;

    // 验证输入
    if (dto.deepseek_api_key !== undefined && typeof dto.deepseek_api_key !== 'string') {
      res.status(400).json({
        success: false,
        error: 'deepseek_api_key 必须是字符串',
      });
      return;
    }

    if (dto.doubao_api_key !== undefined && typeof dto.doubao_api_key !== 'string') {
      res.status(400).json({
        success: false,
        error: 'doubao_api_key 必须是字符串',
      });
      return;
    }

    const updatedConfig = await systemConfigService.updateAIConfig(dto);
    const maskedConfig = systemConfigService.getMaskedAIConfig();

    res.json({
      success: true,
      message: 'AI 配置更新成功',
      data: maskedConfig,
    });
  } catch (error) {
    console.error('更新 AI 配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新 AI 配置失败',
    });
  }
});

/**
 * GET /api/system/config/douyin
 * 获取抖音配置（脱敏）
 * 需要管理员权限
 */
router.get('/config/douyin', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const config = systemConfigService.getMaskedDouyinConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('获取抖音配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取抖音配置失败',
    });
  }
});

/**
 * PUT /api/system/config/douyin
 * 更新抖音配置
 * 需要管理员权限
 */
router.put('/config/douyin', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const dto: UpdateDouyinConfigDTO = req.body;

    // 验证输入
    if (dto.client_key !== undefined && typeof dto.client_key !== 'string') {
      res.status(400).json({
        success: false,
        error: 'client_key 必须是字符串',
      });
      return;
    }

    if (dto.client_secret !== undefined && typeof dto.client_secret !== 'string') {
      res.status(400).json({
        success: false,
        error: 'client_secret 必须是字符串',
      });
      return;
    }

    const updatedConfig = await systemConfigService.updateDouyinConfig(dto);
    const maskedConfig = systemConfigService.getMaskedDouyinConfig();

    res.json({
      success: true,
      message: '抖音配置更新成功',
      data: maskedConfig,
    });
  } catch (error) {
    console.error('更新抖音配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新抖音配置失败',
    });
  }
});

/**
 * POST /api/system/config/reload
 * 重新加载配置到环境变量
 * 需要管理员权限
 */
router.post('/config/reload', adminMiddleware, async (req: Request, res: Response) => {
  try {
    await systemConfigService.loadConfigToEnv();
    res.json({
      success: true,
      message: '配置已重新加载',
    });
  } catch (error) {
    console.error('重新加载配置失败:', error);
    res.status(500).json({
      success: false,
      error: '重新加载配置失败',
    });
  }
});

export default router;
