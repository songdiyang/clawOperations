/**
 * AI 创作相关 API 路由
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AIPublishService } from '../../../../src/services/ai-publish-service';
import { RequirementAnalyzer } from '../../../../src/services/ai/requirement-analyzer';
import { ContentGenerator } from '../../../../src/services/ai/content-generator';
import { CopywritingGenerator } from '../../../../src/services/ai/copywriting-generator';
import { ContentQualityChecker } from '../../../../src/services/ai/content-quality-checker';
import { AIPublishConfig, AITaskStatus, CreationTask, QualityCheckInput, MarketingEvaluation } from '../../../../src/models/types';
import { appConfigService } from '../services/app-config-service';
import { creationTaskService } from '../services/creation-task-service';

const router = Router();

// 配置参考图上传
const referenceImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'reference-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, filename);
  },
});

const referenceImageUpload = multer({
  storage: referenceImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  },
});

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

// ==================== 内容质量校验 API ====================

/**
 * POST /api/ai/quality-check - 内容质量校验
 */
router.post('/quality-check', async (req: Request, res: Response) => {
  try {
    const input: QualityCheckInput = req.body;

    if (!input.title && !input.description) {
      return res.status(400).json({
        success: false,
        error: '请提供标题或描述内容',
      });
    }

    const checker = new ContentQualityChecker();
    const result = await checker.check(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('质量校验失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '质量校验失败',
    });
  }
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

    // 保存到历史记录（持久化）
    try {
      creationTaskService.saveToHistory({
        id: result.taskId || `ai_${Date.now()}`,
        status: result.success ? 'completed' : 'failed',
        requirement: input,
        contentTypePreference: config?.contentTypePreference,
        analysis: result.analysis,
        content: result.content,
        copywriting: result.copywriting,
        progress: 100,
        currentStepMessage: result.success ? '完成' : (result.error || '失败'),
        error: result.error,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        canResume: false,
        lastCompletedStep: result.success ? 4 : 0,
      });
    } catch (saveError) {
      console.error('保存到历史记录失败:', saveError);
      // 不影响主流程
    }

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
 * GET /api/ai/tasks - 获取所有 AI 创作任务（从持久化存储读取）
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    // 从内存中获取正在进行的任务
    const service = getAIPublishService();
    const inProgressTasks = service.getAllTasks();
    
    // 从数据库获取历史任务（最近 50 条）
    const historyTasks = creationTaskService.getHistory({ limit: 50 });
    
    // 将历史任务转换为 AI 任务格式
    const persistedTasks = historyTasks.map(task => ({
      taskId: task.id,
      status: task.status === 'completed' ? 'completed' : 
              task.status === 'failed' ? 'failed' : 'pending',
      progress: task.progress || (task.status === 'completed' ? 100 : 0),
      currentStep: task.currentStepMessage || '',
      createdAt: new Date(task.createdAt).getTime(),
      updatedAt: new Date(task.updatedAt).getTime(),
      error: task.error,
      result: task.content ? {
        success: task.status === 'completed',
        analysis: task.analysis,
        content: task.content,
        copywriting: task.copywriting,
      } : undefined,
    }));
    
    // 合并内存中的任务和持久化的任务，去重（优先显示内存中的实时状态）
    const inProgressIds = new Set(inProgressTasks.map(t => t.taskId));
    const allTasks = [
      ...inProgressTasks,
      ...persistedTasks.filter(t => !inProgressIds.has(t.taskId)),
    ];

    res.json({
      success: true,
      data: allTasks,
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

// ==================== 草稿管理 API ====================

/**
 * POST /api/ai/drafts - 保存草稿
 */
router.post('/drafts', async (req: Request, res: Response) => {
  try {
    const draftData = req.body as Partial<CreationTask>;
    
    if (!draftData.requirement) {
      return res.status(400).json({
        success: false,
        error: '请提供需求描述',
      });
    }

    const draft = creationTaskService.saveDraft(draftData);
    
    res.json({
      success: true,
      data: draft,
    });
  } catch (error: any) {
    console.error('保存草稿失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '保存草稿失败',
    });
  }
});

/**
 * GET /api/ai/drafts - 获取草稿列表
 */
router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const drafts = creationTaskService.listDrafts();
    
    res.json({
      success: true,
      data: drafts,
    });
  } catch (error: any) {
    console.error('获取草稿列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取草稿列表失败',
    });
  }
});

/**
 * GET /api/ai/drafts/:id - 获取单个草稿
 */
router.get('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draft = creationTaskService.getDraft(id);
    
    if (!draft) {
      return res.status(404).json({
        success: false,
        error: '草稿不存在',
      });
    }
    
    res.json({
      success: true,
      data: draft,
    });
  } catch (error: any) {
    console.error('获取草稿失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取草稿失败',
    });
  }
});

/**
 * PUT /api/ai/drafts/:id - 更新草稿
 */
router.put('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draftData = req.body as Partial<CreationTask>;
    
    const draft = creationTaskService.updateDraft(id, draftData);
    
    if (!draft) {
      return res.status(404).json({
        success: false,
        error: '草稿不存在',
      });
    }
    
    res.json({
      success: true,
      data: draft,
    });
  } catch (error: any) {
    console.error('更新草稿失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新草稿失败',
    });
  }
});

/**
 * DELETE /api/ai/drafts/:id - 删除草稿
 */
router.delete('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = creationTaskService.deleteDraft(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '草稿不存在',
      });
    }
    
    res.json({
      success: true,
      message: '草稿已删除',
    });
  } catch (error: any) {
    console.error('删除草稿失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除草稿失败',
    });
  }
});

/**
 * POST /api/ai/drafts/:id/resume - 恢复草稿继续创作
 */
router.post('/drafts/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draft = creationTaskService.resumeDraft(id);
    
    if (!draft) {
      return res.status(404).json({
        success: false,
        error: '草稿不存在',
      });
    }
    
    res.json({
      success: true,
      data: draft,
    });
  } catch (error: any) {
    console.error('恢复草稿失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '恢复草稿失败',
    });
  }
});

// ==================== 历史记录 API ====================

/**
 * GET /api/ai/history - 获取历史记录
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = creationTaskService.getHistory({ limit, offset });
    const total = creationTaskService.getHistoryCount();
    
    res.json({
      success: true,
      data: {
        items: history,
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取历史记录失败',
    });
  }
});

/**
 * GET /api/ai/history/:id - 获取单条历史记录
 */
router.get('/history/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = creationTaskService.getHistoryById(id);
    
    if (!history) {
      return res.status(404).json({
        success: false,
        error: '历史记录不存在',
      });
    }
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取历史记录失败',
    });
  }
});

// ==================== 模板管理 API ====================

/**
 * POST /api/ai/upload-reference-image - 上传参考图
 */
router.post('/upload-reference-image', referenceImageUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件',
      });
    }

    // 返回文件 URL
    const url = `/uploads/reference-images/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error: any) {
    console.error('上传参考图失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '上传失败',
    });
  }
});

/**
 * POST /api/ai/templates - 创建模板
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { name, description, requirement, contentTypePreference, tags, referenceImageUrl } = req.body;
    
    if (!name || !requirement) {
      return res.status(400).json({
        success: false,
        error: '请提供模板名称和需求描述',
      });
    }

    const template = creationTaskService.createTemplate({
      name,
      description,
      requirement,
      contentTypePreference,
      tags: tags || [],
      referenceImageUrl,
    });
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('创建模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '创建模板失败',
    });
  }
});

/**
 * GET /api/ai/templates - 获取模板列表
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = creationTaskService.listTemplates();
    
    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取模板列表失败',
    });
  }
});

/**
 * GET /api/ai/templates/:id - 获取单个模板
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = creationTaskService.getTemplate(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('获取模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取模板失败',
    });
  }
});

/**
 * DELETE /api/ai/templates/:id - 删除模板
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = creationTaskService.deleteTemplate(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '模板不存在',
      });
    }
    
    res.json({
      success: true,
      message: '模板已删除',
    });
  } catch (error: any) {
    console.error('删除模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除模板失败',
    });
  }
});

/**
 * POST /api/ai/templates/:id/use - 使用模板
 */
router.post('/templates/:id/use', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = creationTaskService.useTemplate(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('使用模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '使用模板失败',
    });
  }
});

// ==================== 工作流 API ====================

/**
 * POST /api/ai/workflow/start - 开始新的创作流程
 */
router.post('/workflow/start', async (req: Request, res: Response) => {
  try {
    const { requirement, contentTypePreference, templateId } = req.body;
    
    let taskRequirement = requirement;
    let taskContentType = contentTypePreference;
    let taskReferenceImageUrl: string | undefined;
    
    // 如果使用模板
    if (templateId) {
      const template = creationTaskService.useTemplate(templateId);
      if (template) {
        taskRequirement = template.requirement;
        taskContentType = template.contentTypePreference;
        taskReferenceImageUrl = template.referenceImageUrl;  // 从模板获取参考图
      }
    }
    
    if (!taskRequirement) {
      return res.status(400).json({
        success: false,
        error: '请提供需求描述',
      });
    }

    // 创建新的创作任务
    const task = creationTaskService.saveDraft({
      requirement: taskRequirement,
      contentTypePreference: taskContentType,
      referenceImageUrl: taskReferenceImageUrl,
      status: 'draft',
      lastCompletedStep: 0,
      progress: 0,
      currentStepMessage: '已创建创作任务',
    });
    
    // 获取下一步建议
    const nextAction = creationTaskService.getNextActionSuggestion(task);
    
    res.json({
      success: true,
      data: {
        task,
        nextAction,
      },
    });
  } catch (error: any) {
    console.error('开始创作流程失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '开始创作流程失败',
    });
  }
});

/**
 * POST /api/ai/workflow/step - 执行单步操作
 */
router.post('/workflow/step', async (req: Request, res: Response) => {
  try {
    const { taskId, step } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '请提供任务 ID',
      });
    }

    let task = creationTaskService.getDraft(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    // 根据步骤执行不同操作
    switch (step) {
      case 'analyze': {
        // 更新状态为分析中
        task = creationTaskService.updateDraft(taskId, {
          status: 'analyzing',
          currentStepMessage: '正在分析需求...',
          progress: 10,
        })!;
        
        // 执行分析
        const analyzer = getRequirementAnalyzer();
        const analysis = await analyzer.analyze(task.requirement);
        
        // 应用内容类型偏好
        if (task.contentTypePreference && ['image', 'video'].includes(task.contentTypePreference)) {
          analysis.contentType = task.contentTypePreference;
        }
        
        // 更新任务
        task = creationTaskService.updateDraft(taskId, {
          status: 'draft',
          analysis,
          lastCompletedStep: 1,
          progress: 25,
          currentStepMessage: '需求分析完成',
        })!;
        break;
      }
      
      case 'generate': {
        if (!task.analysis) {
          return res.status(400).json({
            success: false,
            error: '请先完成需求分析',
          });
        }
        
        // 更新状态为生成中
        task = creationTaskService.updateDraft(taskId, {
          status: 'generating',
          currentStepMessage: `正在生成${task.analysis.contentType === 'image' ? '图片' : '视频'}...`,
          progress: 35,
        })!;
        
        // 执行生成，传递参考图 URL
        const generator = getContentGenerator();
        const content = await generator.generate(task.analysis!, {
          referenceImageUrl: task.referenceImageUrl,
        });
        
        // 更新任务
        task = creationTaskService.updateDraft(taskId, {
          status: 'draft',
          content,
          lastCompletedStep: 2,
          progress: 50,
          currentStepMessage: '内容生成完成',
        })!;
        break;
      }
      
      case 'copywriting': {
        if (!task.analysis) {
          return res.status(400).json({
            success: false,
            error: '请先完成需求分析',
          });
        }
        
        // 更新状态为文案生成中
        task = creationTaskService.updateDraft(taskId, {
          status: 'copywriting',
          currentStepMessage: '正在生成文案...',
          progress: 60,
        })!;
        
        // 执行文案生成
        const copyGenerator = getCopywritingGenerator();
        const copywriting = await copyGenerator.generate(task.analysis!);
        
        // 更新任务
        task = creationTaskService.updateDraft(taskId, {
          status: 'draft',
          copywriting,
          lastCompletedStep: 3,
          progress: 75,
          currentStepMessage: '文案生成完成',
        })!;
        break;
      }
      
      case 'preview': {
        // 标记预览完成
        task = creationTaskService.updateDraft(taskId, {
          status: 'preview',
          lastCompletedStep: 4,
          progress: 90,
          currentStepMessage: '预览就绪',
        })!;
        break;
      }
      
      case 'complete': {
        // 标记完成并保存到历史
        task = creationTaskService.updateDraft(taskId, {
          status: 'completed',
          lastCompletedStep: 5,
          progress: 100,
          currentStepMessage: '创作完成',
        })!;
        
        // 保存到历史记录
        creationTaskService.saveToHistory(task);
        break;
      }
      
      default:
        return res.status(400).json({
          success: false,
          error: '未知的步骤',
        });
    }
    
    // 获取下一步建议
    const nextAction = creationTaskService.getNextActionSuggestion(task);
    
    res.json({
      success: true,
      data: {
        task,
        nextAction,
      },
    });
  } catch (error: any) {
    console.error('执行步骤失败:', error);
    
    // 如果有任务 ID，更新状态为失败
    const { taskId } = req.body;
    if (taskId) {
      creationTaskService.updateDraft(taskId, {
        status: 'failed',
        error: error.message,
        currentStepMessage: '执行失败: ' + error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '执行步骤失败',
    });
  }
});

/**
 * GET /api/ai/workflow/:id/next-action - 获取下一步建议
 */
router.get('/workflow/:id/next-action', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = creationTaskService.getDraft(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }
    
    const nextAction = creationTaskService.getNextActionSuggestion(task);
    
    res.json({
      success: true,
      data: nextAction,
    });
  } catch (error: any) {
    console.error('获取下一步建议失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取下一步建议失败',
    });
  }
});

/**
 * POST /api/ai/marketing-evaluate - 评估营销潜力
 */
router.post('/marketing-evaluate', async (req: Request, res: Response) => {
  try {
    const { title, description, hashtags, contentType } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: '请提供标题和描述',
      });
    }

    const analyzer = getRequirementAnalyzer();
    // 使用 DeepSeekClient 直接调用评估方法
    const deepseekKey = getCurrentDeepseekApiKey();
    const { DeepSeekClient } = await import('../../../../src/api/ai/deepseek-client');
    const dsClient = new DeepSeekClient(deepseekKey);
    const evaluation = await dsClient.evaluateMarketingPotential(
      title,
      description,
      hashtags || [],
      contentType
    );

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error: any) {
    console.error('营销潜力评估失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '营销潜力评估失败',
    });
  }
});

/**
 * POST /api/ai/generate-hooks - 生成内容开场钩子
 */
router.post('/generate-hooks', async (req: Request, res: Response) => {
  try {
    const { theme, targetAudience, keyPoints } = req.body;

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: '请提供内容主题',
      });
    }

    const deepseekKey = getCurrentDeepseekApiKey();
    const { DeepSeekClient } = await import('../../../../src/api/ai/deepseek-client');
    const dsClient = new DeepSeekClient(deepseekKey);
    const hooks = await dsClient.generateContentHooks(
      theme,
      targetAudience || '通用受众',
      keyPoints || []
    );

    res.json({
      success: true,
      data: { hooks },
    });
  } catch (error: any) {
    console.error('内容钩子生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '内容钩子生成失败',
    });
  }
});

/**
 * GET /api/ai/analytics - 获取营销数据分析
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const allTasks = creationTaskService.getHistory({ limit: 1000 }) || [];

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: any) => t.status === 'completed').length;
    const failedTasks = allTasks.filter((t: any) => t.status === 'failed').length;

    // 内容类型分布
    const contentTypeBreakdown = { image: 0, video: 0 };
    allTasks.forEach((t: any) => {
      const type = t.content?.type || t.analysis?.contentType;
      if (type === 'image') contentTypeBreakdown.image++;
      else if (type === 'video') contentTypeBreakdown.video++;
    });

    // 平均营销评分
    const scoredTasks = allTasks.filter((t: any) => t.copywriting?.marketingScore != null);
    const averageMarketingScore = scoredTasks.length > 0
      ? Math.round(scoredTasks.reduce((sum: number, t: any) => sum + t.copywriting.marketingScore, 0) / scoredTasks.length)
      : null;

    // 最常用话题
    const hashtagMap: Record<string, number> = {};
    allTasks.forEach((t: any) => {
      (t.copywriting?.hashtags || []).forEach((tag: string) => {
        hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
      });
    });
    const topHashtags = Object.entries(hashtagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // 近7天创作趋势
    const now = Date.now();
    const recentTrend = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = allTasks.filter((t: any) => {
        const createdAt = new Date(t.createdAt).getTime();
        return createdAt >= dayStart && createdAt < dayEnd;
      }).length;
      return {
        date: new Date(dayStart).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count,
      };
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        failedTasks,
        successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        contentTypeBreakdown,
        averageMarketingScore,
        topHashtags,
        recentTrend,
      },
    });
  } catch (error: any) {
    console.error('获取营销分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取营销分析失败',
    });
  }
});

export default router;
