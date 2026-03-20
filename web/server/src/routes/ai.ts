/**
 * AI 创作相关 API 路由
 */

import { Router, Request, Response } from 'express';
import { AIPublishService } from '../../../../src/services/ai-publish-service';
import { RequirementAnalyzer } from '../../../../src/services/ai/requirement-analyzer';
import { ContentGenerator } from '../../../../src/services/ai/content-generator';
import { CopywritingGenerator } from '../../../../src/services/ai/copywriting-generator';
import { AIPublishConfig, AITaskStatus } from '../../../../src/models/types';
import { appConfigService } from '../services/app-config-service';

const router = Router();

// 创建服务实例（懒加载）
let aiPublishService: AIPublishService | null = null;
let requirementAnalyzer: RequirementAnalyzer | null = null;
let contentGenerator: ContentGenerator | null = null;
let copywritingGenerator: CopywritingGenerator | null = null;
let cachedDeepseekApiKey: string | null = null;

function resetAIServices() {
  aiPublishService = null;
  requirementAnalyzer = null;
  contentGenerator = null;
  copywritingGenerator = null;
  cachedDeepseekApiKey = null;
}

function getCurrentDeepseekApiKey(): string | undefined {
  return appConfigService.getAIConfig().deepseekApiKey || process.env.DEEPSEEK_API_KEY || undefined;
}

function ensureAIServiceCache(): void {
  const currentKey = getCurrentDeepseekApiKey() || null;
  if (currentKey !== cachedDeepseekApiKey) {
    resetAIServices();
    cachedDeepseekApiKey = currentKey;
  }
}

/**
 * 获取或初始化 AI 发布服务
 */
function getAIPublishService(): AIPublishService {
  ensureAIServiceCache();
  if (!aiPublishService) {
    aiPublishService = new AIPublishService({
      deepseekApiKey: getCurrentDeepseekApiKey(),
    });
  }
  return aiPublishService;
}

/**
 * 获取或初始化需求分析服务
 */
function getRequirementAnalyzer(): RequirementAnalyzer {
  ensureAIServiceCache();
  if (!requirementAnalyzer) {
    requirementAnalyzer = new RequirementAnalyzer({
      apiKey: getCurrentDeepseekApiKey(),
    });
  }
  return requirementAnalyzer;
}

/**
 * 获取或初始化内容生成服务
 */
function getContentGenerator(): ContentGenerator {
  if (!contentGenerator) {
    contentGenerator = new ContentGenerator();
  }
  return contentGenerator;
}

/**
 * 获取或初始化文案生成服务
 */
function getCopywritingGenerator(): CopywritingGenerator {
  ensureAIServiceCache();
  if (!copywritingGenerator) {
    copywritingGenerator = new CopywritingGenerator({
      apiKey: getCurrentDeepseekApiKey(),
    });
  }
  return copywritingGenerator;
}

/**
 * POST /api/ai/analyze - 分析用户需求
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: appConfigService.getAIStatus(),
  });
});

router.post('/config', (req: Request, res: Response) => {
  try {
    const { deepseekApiKey } = req.body as { deepseekApiKey?: string };

    if (typeof deepseekApiKey !== 'string' || !deepseekApiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: '璇锋彁渚涙湁鏁堢殑 DeepSeek API Key',
      });
    }

    appConfigService.setAIConfig({
      deepseekApiKey: deepseekApiKey.trim(),
    });
    resetAIServices();

    res.json({
      success: true,
      message: 'AI 閰嶇疆宸蹭繚瀛?',
      data: appConfigService.getAIStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'AI 閰嶇疆淇濆瓨澶辫触',
    });
  }
});

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { input, contentTypePreference } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的需求描述',
      });
    }

    const analyzer = getRequirementAnalyzer();
    const analysis = await analyzer.analyze(input);

    // 应用内容类型偏好
    if (contentTypePreference && ['image', 'video'].includes(contentTypePreference)) {
      analysis.contentType = contentTypePreference;
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('需求分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '需求分析失败',
    });
  }
});

/**
 * POST /api/ai/generate - 生成内容（图片/视频）
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { analysis } = req.body;

    if (!analysis || !analysis.contentType) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的需求分析结果',
      });
    }

    const generator = getContentGenerator();
    const content = await generator.generate(analysis);

    res.json({
      success: true,
      data: content,
    });
  } catch (error: any) {
    console.error('内容生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '内容生成失败',
    });
  }
});

/**
 * POST /api/ai/copywriting - 生成文案
 */
router.post('/copywriting', async (req: Request, res: Response) => {
  try {
    const { analysis } = req.body;

    if (!analysis || !analysis.theme) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的需求分析结果',
      });
    }

    const generator = getCopywritingGenerator();
    const copywriting = await generator.generate(analysis);

    res.json({
      success: true,
      data: copywriting,
    });
  } catch (error: any) {
    console.error('文案生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '文案生成失败',
    });
  }
});

/**
 * POST /api/ai/create - 一键创建内容（分析 + 生成内容 + 生成文案）
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { input, config } = req.body as {
      input: string;
      config?: AIPublishConfig;
    };

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的需求描述',
      });
    }

    const service = getAIPublishService();
    
    // 创建但不自动发布
    const result = await service.createAndPublish(input, {
      ...config,
      autoPublish: false, // 先不自动发布
    });

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('AI 创作失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI 创作失败',
    });
  }
});

/**
 * POST /api/ai/publish - 一键创建并发布
 */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const { input, config } = req.body as {
      input: string;
      config?: AIPublishConfig;
    };

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的需求描述',
      });
    }

    const service = getAIPublishService();
    
    // 创建并自动发布
    const result = await service.createAndPublish(input, {
      ...config,
      autoPublish: true,
    });

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('AI 发布失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI 发布失败',
    });
  }
});

/**
 * GET /api/ai/task/:taskId - 查询任务状态
 */
router.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '请提供任务 ID',
      });
    }

    const service = getAIPublishService();
    const status = service.getTaskStatus(taskId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '查询失败',
    });
  }
});

/**
 * GET /api/ai/tasks - 获取所有任务
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const service = getAIPublishService();
    const tasks = service.getAllTasks();

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取失败',
    });
  }
});

/**
 * POST /api/ai/quick-copywriting - 快速生成文案
 */
router.post('/quick-copywriting', async (req: Request, res: Response) => {
  try {
    const { theme, keyPoints } = req.body;

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: '请提供主题',
      });
    }

    const generator = getCopywritingGenerator();
    const copywriting = await generator.quickGenerate(
      theme,
      keyPoints || []
    );

    res.json({
      success: true,
      data: copywriting,
    });
  } catch (error: any) {
    console.error('快速文案生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '生成失败',
    });
  }
});

export default router;
