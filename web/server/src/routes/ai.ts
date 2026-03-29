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
import { AIPublishConfig, AITaskStatus, CreationTask, QualityCheckInput } from '../../../../src/models/types';
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
    
    // 如果使用模板
    if (templateId) {
      const template = creationTaskService.useTemplate(templateId);
      if (template) {
        taskRequirement = template.requirement;
        taskContentType = template.contentTypePreference;
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
        
        // 执行生成
        const generator = getContentGenerator();
        const content = await generator.generate(task.analysis!);
        
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

export default router;
