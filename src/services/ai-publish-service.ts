/**
 * AI 发布编排服务
 * 统一协调需求分析、内容生成、文案生成和发布流程
 */

import { RequirementAnalyzer } from './ai/requirement-analyzer';
import { ContentGenerator, ProgressCallback } from './ai/content-generator';
import { CopywritingGenerator } from './ai/copywriting-generator';
import { PublishService } from './publish-service';
import { DouyinClient } from '../api/douyin-client';
import { DouyinAuth } from '../api/auth';
import {
  AIPublishConfig,
  AIPublishResult,
  AITaskStatus,
  RequirementAnalysis,
  GeneratedContent,
  GeneratedCopywriting,
  VideoPublishOptions,
} from '../models/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIPublishService');

/**
 * AI 发布服务配置
 */
export interface AIPublishServiceConfig {
  /** DeepSeek API Key */
  deepseekApiKey?: string;
  /** 豆包 API Key */
  doubaoApiKey?: string;
}

/**
 * 任务进度回调
 */
export type TaskProgressCallback = (status: AITaskStatus) => void;

/**
 * AI 发布编排服务
 */
export class AIPublishService {
  private requirementAnalyzer: RequirementAnalyzer;
  private contentGenerator: ContentGenerator;
  private copywritingGenerator: CopywritingGenerator;
  private publishService: PublishService | null = null;
  
  // 任务状态存储
  private taskStore: Map<string, AITaskStatus> = new Map();

  /**
   * 生成唯一任务 ID
   */
  private generateTaskId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  constructor(config?: AIPublishServiceConfig) {
    this.requirementAnalyzer = new RequirementAnalyzer({
      apiKey: config?.deepseekApiKey,
    });
    
    this.contentGenerator = new ContentGenerator({
      apiKey: config?.doubaoApiKey,
    });
    
    this.copywritingGenerator = new CopywritingGenerator({
      apiKey: config?.deepseekApiKey,
    });

    logger.info('AI 发布编排服务初始化完成');
  }

  /**
   * 初始化发布服务（需要抖音认证）
   */
  initPublishService(client: DouyinClient, auth: DouyinAuth): void {
    this.publishService = new PublishService(client, auth);
    logger.info('发布服务已初始化');
  }

  /**
   * 一站式创建并发布内容
   * @param userInput 用户输入的需求描述
   * @param config 发布配置
   * @param onProgress 进度回调
   * @returns 发布结果
   */
  async createAndPublish(
    userInput: string,
    config?: AIPublishConfig,
    onProgress?: TaskProgressCallback
  ): Promise<AIPublishResult> {
    const taskId = this.generateTaskId();
    
    logger.info('开始 AI 创作流程', { taskId, inputLength: userInput.length });

    // 初始化任务状态
    this.updateTaskStatus(taskId, {
      taskId,
      status: 'pending',
      progress: 0,
      currentStep: '准备中...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, onProgress);

    try {
      // 步骤 1: 需求分析
      this.updateTaskStatus(taskId, {
        status: 'analyzing',
        progress: 10,
        currentStep: '正在分析需求...',
      }, onProgress);

      const analysis = await this.analyzeRequirement(userInput, config);

      this.updateTaskStatus(taskId, {
        progress: 25,
        currentStep: '需求分析完成',
      }, onProgress);

      // 步骤 2: 生成内容
      this.updateTaskStatus(taskId, {
        status: 'generating',
        progress: 30,
        currentStep: `正在生成${analysis.contentType === 'image' ? '图片' : '视频'}...`,
      }, onProgress);

      const content = await this.generateContent(analysis, (progress) => {
        this.updateTaskStatus(taskId, {
          progress: 30 + Math.floor(progress.percentage * 0.35),
          currentStep: progress.message,
        }, onProgress);
      });

      this.updateTaskStatus(taskId, {
        progress: 65,
        currentStep: '内容生成完成',
      }, onProgress);

      // 步骤 3: 生成文案
      this.updateTaskStatus(taskId, {
        status: 'copywriting',
        progress: 70,
        currentStep: '正在生成推广文案...',
      }, onProgress);

      const copywriting = await this.generateCopywriting(analysis);

      this.updateTaskStatus(taskId, {
        progress: 80,
        currentStep: '文案生成完成',
      }, onProgress);

      // 步骤 4: 发布（如果配置了自动发布）
      let publishResult;
      if (config?.autoPublish !== false && this.publishService) {
        this.updateTaskStatus(taskId, {
          status: 'publishing',
          progress: 85,
          currentStep: '正在发布到抖音...',
        }, onProgress);

        publishResult = await this.publish(content, copywriting, config);

        this.updateTaskStatus(taskId, {
          progress: 100,
          currentStep: publishResult?.success ? '发布成功' : '发布失败',
        }, onProgress);
      }

      // 完成
      const result: AIPublishResult = {
        success: true,
        taskId,
        analysis,
        content,
        copywriting,
        publishResult,
      };

      this.updateTaskStatus(taskId, {
        status: 'completed',
        progress: 100,
        currentStep: '全部完成',
        result,
      }, onProgress);

      logger.info('AI 创作流程完成', { taskId, success: true });

      return result;
    } catch (error: any) {
      logger.error('AI 创作流程失败', { taskId, error: error.message });

      const result: AIPublishResult = {
        success: false,
        taskId,
        error: error.message,
      };

      this.updateTaskStatus(taskId, {
        status: 'failed',
        progress: 0,
        currentStep: '执行失败',
        error: error.message,
        result,
      }, onProgress);

      return result;
    }
  }

  /**
   * 仅分析需求
   */
  async analyzeRequirement(
    userInput: string,
    config?: AIPublishConfig
  ): Promise<RequirementAnalysis> {
    const analysis = await this.requirementAnalyzer.analyze(userInput);

    // 应用配置中的内容类型偏好
    if (config?.contentTypePreference && config.contentTypePreference !== 'auto') {
      analysis.contentType = config.contentTypePreference;
    }

    return analysis;
  }

  /**
   * 仅生成内容
   */
  async generateContent(
    analysis: RequirementAnalysis,
    onProgress?: ProgressCallback
  ): Promise<GeneratedContent> {
    return this.contentGenerator.generate(analysis, onProgress);
  }

  /**
   * 仅生成文案
   */
  async generateCopywriting(
    analysis: RequirementAnalysis
  ): Promise<GeneratedCopywriting> {
    return this.copywritingGenerator.generate(analysis);
  }

  /**
   * 发布内容
   */
  async publish(
    content: GeneratedContent,
    copywriting: GeneratedCopywriting,
    config?: AIPublishConfig
  ): Promise<AIPublishResult['publishResult']> {
    if (!this.publishService) {
      throw new Error('发布服务未初始化，请先调用 initPublishService');
    }

    // 构建发布选项
    const publishOptions: VideoPublishOptions = {
      title: copywriting.title,
      description: copywriting.description,
      hashtags: copywriting.hashtags,
      poiName: copywriting.suggestedPoiName,
      ...config?.overrides,
    };

    // 如果是定时发布
    if (config?.scheduleTime) {
      publishOptions.schedulePublishTime = new Date(config.scheduleTime).getTime();
    }

    // 调用发布服务
    return this.publishService.publishVideo({
      videoPath: content.localPath,
      options: publishOptions,
      isRemoteUrl: false,
    });
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): AITaskStatus | undefined {
    return this.taskStore.get(taskId);
  }

  /**
   * 更新任务状态
   */
  private updateTaskStatus(
    taskId: string,
    updates: Partial<AITaskStatus>,
    onProgress?: TaskProgressCallback
  ): void {
    const current = this.taskStore.get(taskId) || {
      taskId,
      status: 'pending',
      progress: 0,
      currentStep: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as AITaskStatus;

    const updated: AITaskStatus = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    this.taskStore.set(taskId, updated);

    // 调用进度回调
    onProgress?.(updated);

    logger.debug('任务状态更新', {
      taskId,
      status: updated.status,
      progress: updated.progress,
    });
  }

  /**
   * 清理过期任务
   * @param maxAge 最大保留时间（毫秒），默认 1 小时
   */
  cleanupTasks(maxAge: number = 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of this.taskStore.entries()) {
      if (now - task.updatedAt > maxAge) {
        this.taskStore.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('清理过期任务', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): AITaskStatus[] {
    return Array.from(this.taskStore.values());
  }
}

export default AIPublishService;
