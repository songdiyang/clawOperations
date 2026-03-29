/**
 * 内容生成服务
 * 使用豆包 AI 生成图片和视频内容
 */

import { DoubaoClient } from '../../api/ai/doubao-client';
import { RequirementAnalysis, GeneratedContent } from '../../models/types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ContentGenerator');

/**
 * 内容生成器配置
 */
export interface GeneratorConfig {
  /** 豆包 API Key (可选，默认使用环境变量) */
  apiKey?: string;
  /** 图片尺寸 */
  imageSize?: string;
  /** 视频时长（秒） */
  videoDuration?: number;
  /** 视频分辨率 */
  videoResolution?: string;
}

/**
 * 生成进度回调
 */
export type ProgressCallback = (progress: {
  stage: 'preparing' | 'generating' | 'downloading' | 'completed';
  percentage: number;
  message: string;
}) => void;

/**
 * 生成选项
 */
export interface GenerateOptions {
  /** 参考图 URL */
  referenceImageUrl?: string;
  /** 进度回调 */
  onProgress?: ProgressCallback;
}

/**
 * 内容生成服务类
 */
export class ContentGenerator {
  private doubaoClient: DoubaoClient;
  private imageSize: string;
  private videoDuration: number;
  private videoResolution: string;

  constructor(config?: GeneratorConfig) {
    this.doubaoClient = new DoubaoClient(config?.apiKey);
    this.imageSize = config?.imageSize || '1024x1024';
    this.videoDuration = config?.videoDuration || 5;
    this.videoResolution = config?.videoResolution || '720p';

    logger.info('内容生成服务初始化完成', {
      imageSize: this.imageSize,
      videoDuration: this.videoDuration,
    });
  }

  /**
   * 根据需求分析结果生成内容
   * @param analysis 需求分析结果
   * @param options 生成选项（包含参考图、进度回调等）
   * @returns 生成的内容
   */
  async generate(
    analysis: RequirementAnalysis,
    options?: GenerateOptions | ProgressCallback
  ): Promise<GeneratedContent> {
    // 兼容旧版 API（直接传 onProgress 回调）
    const opts: GenerateOptions = typeof options === 'function' 
      ? { onProgress: options } 
      : (options || {});
    
    const { referenceImageUrl, onProgress } = opts;

    logger.info('开始生成内容', { 
      contentType: analysis.contentType,
      theme: analysis.theme,
      hasReferenceImage: !!referenceImageUrl
    });

    onProgress?.({
      stage: 'preparing',
      percentage: 10,
      message: '正在准备生成任务...',
    });

    try {
      let content: GeneratedContent;

      if (analysis.contentType === 'image') {
        content = await this.generateImage(analysis, onProgress, referenceImageUrl);
      } else {
        content = await this.generateVideo(analysis, onProgress, referenceImageUrl);
      }

      onProgress?.({
        stage: 'completed',
        percentage: 100,
        message: '内容生成完成',
      });

      logger.info('内容生成完成', {
        type: content.type,
        localPath: content.localPath,
      });

      return content;
    } catch (error: any) {
      logger.error('内容生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成图片
   */
  private async generateImage(
    analysis: RequirementAnalysis,
    onProgress?: ProgressCallback,
    _referenceImageUrl?: string  // 图片生成目前不支持参考图，保留参数以便后续扩展
  ): Promise<GeneratedContent> {
    const prompt = analysis.imagePrompt || this.buildDefaultImagePrompt(analysis);

    logger.info('生成图片', { promptLength: prompt.length });

    onProgress?.({
      stage: 'generating',
      percentage: 30,
      message: '正在生成图片...',
    });

    const content = await this.doubaoClient.generateImage(prompt, {
      size: this.imageSize,
    });

    onProgress?.({
      stage: 'downloading',
      percentage: 80,
      message: '正在下载图片...',
    });

    return content;
  }

  /**
   * 生成视频
   */
  private async generateVideo(
    analysis: RequirementAnalysis,
    onProgress?: ProgressCallback,
    referenceImageUrl?: string
  ): Promise<GeneratedContent> {
    const prompt = analysis.videoPrompt || this.buildDefaultVideoPrompt(analysis);

    logger.info('生成视频', { 
      promptLength: prompt.length,
      hasReferenceImage: !!referenceImageUrl 
    });

    onProgress?.({
      stage: 'generating',
      percentage: 30,
      message: referenceImageUrl 
        ? '正在根据参考图生成视频，这可能需要几分钟...' 
        : '正在生成视频，这可能需要几分钟...',
    });

    const content = await this.doubaoClient.generateVideo(prompt, {
      duration: this.videoDuration,
      resolution: this.videoResolution,
      referenceImageUrl,
    });

    onProgress?.({
      stage: 'downloading',
      percentage: 80,
      message: '正在下载视频...',
    });

    return content;
  }

  /**
   * 构建默认图片提示词
   */
  private buildDefaultImagePrompt(analysis: RequirementAnalysis): string {
    const parts = [
      analysis.theme,
      analysis.style || 'professional style',
      'high quality',
      'detailed',
      '8k resolution',
    ];

    if (analysis.keyPoints.length > 0) {
      parts.push(`featuring: ${analysis.keyPoints.slice(0, 3).join(', ')}`);
    }

    return parts.join(', ');
  }

  /**
   * 构建默认视频提示词
   */
  private buildDefaultVideoPrompt(analysis: RequirementAnalysis): string {
    const parts = [
      analysis.theme,
      analysis.style || 'cinematic style',
      'smooth motion',
      'professional quality',
      'dynamic camera movement',
    ];

    if (analysis.keyPoints.length > 0) {
      parts.push(`showcasing: ${analysis.keyPoints.slice(0, 3).join(', ')}`);
    }

    return parts.join(', ');
  }

  /**
   * 查询生成任务状态
   * @param taskId 任务ID
   */
  async checkTaskStatus(taskId: string): Promise<{
    status: string;
    error?: string;
  }> {
    const result = await this.doubaoClient.checkTaskStatus(taskId);
    return {
      status: result.status,
      error: result.error?.message,
    };
  }

  /**
   * 获取输出目录
   */
  getOutputDir(): string {
    return this.doubaoClient.getOutputDir();
  }
}

export default ContentGenerator;
