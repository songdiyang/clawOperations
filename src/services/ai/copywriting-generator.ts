/**
 * 文案生成服务
 * 使用 DeepSeek AI 生成推广文案
 */

import { DeepSeekClient } from '../../api/ai/deepseek-client';
import { RequirementAnalysis, GeneratedCopywriting } from '../../models/types';
import { CONTENT_CONFIG } from '../../../config/default';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CopywritingGenerator');

/**
 * 文案生成器配置
 */
export interface CopywritingConfig {
  /** DeepSeek API Key (可选，默认使用环境变量) */
  apiKey?: string;
  /** 标题最大长度 */
  maxTitleLength?: number;
  /** 描述最大长度 */
  maxDescriptionLength?: number;
  /** 最大 hashtag 数量 */
  maxHashtagCount?: number;
}

/**
 * 文案生成服务类
 */
export class CopywritingGenerator {
  private deepseekClient: DeepSeekClient;
  private maxTitleLength: number;
  private maxDescriptionLength: number;
  private maxHashtagCount: number;

  constructor(config?: CopywritingConfig) {
    this.deepseekClient = new DeepSeekClient(config?.apiKey);
    this.maxTitleLength = config?.maxTitleLength || CONTENT_CONFIG.MAX_TITLE_LENGTH;
    this.maxDescriptionLength = config?.maxDescriptionLength || CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH;
    this.maxHashtagCount = config?.maxHashtagCount || CONTENT_CONFIG.MAX_HASHTAG_COUNT;

    logger.info('文案生成服务初始化完成', {
      maxTitleLength: this.maxTitleLength,
      maxDescriptionLength: this.maxDescriptionLength,
      maxHashtagCount: this.maxHashtagCount,
    });
  }

  /**
   * 根据需求分析结果生成文案
   * @param analysis 需求分析结果
   * @returns 生成的文案
   */
  async generate(analysis: RequirementAnalysis): Promise<GeneratedCopywriting> {
    logger.info('开始生成文案', { theme: analysis.theme });

    try {
      const copywriting = await this.deepseekClient.generateCopywriting(analysis);

      // 确保符合平台限制
      this.validateAndTrim(copywriting);

      logger.info('文案生成完成', {
        titleLength: copywriting.title.length,
        descriptionLength: copywriting.description.length,
        hashtagCount: copywriting.hashtags.length,
      });

      return copywriting;
    } catch (error: any) {
      logger.error('文案生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证并修剪文案以符合限制
   */
  private validateAndTrim(copywriting: GeneratedCopywriting): void {
    // 修剪标题
    if (copywriting.title.length > this.maxTitleLength) {
      copywriting.title = copywriting.title.substring(0, this.maxTitleLength - 3) + '...';
      logger.warn('标题被截断', { 
        originalLength: copywriting.title.length,
        maxLength: this.maxTitleLength 
      });
    }

    // 修剪描述
    if (copywriting.description.length > this.maxDescriptionLength) {
      copywriting.description = copywriting.description.substring(0, this.maxDescriptionLength - 3) + '...';
      logger.warn('描述被截断', { 
        originalLength: copywriting.description.length,
        maxLength: this.maxDescriptionLength 
      });
    }

    // 限制 hashtag 数量
    if (copywriting.hashtags.length > this.maxHashtagCount) {
      copywriting.hashtags = copywriting.hashtags.slice(0, this.maxHashtagCount);
      logger.warn('hashtag 被截断', { 
        originalCount: copywriting.hashtags.length,
        maxCount: this.maxHashtagCount 
      });
    }

    // 清理 hashtag（去除 # 号前缀）
    copywriting.hashtags = copywriting.hashtags.map(tag => 
      tag.replace(/^#/, '').trim()
    ).filter(tag => tag.length > 0);
  }

  /**
   * 快速生成文案（简化版）
   * @param theme 主题
   * @param keyPoints 关键卖点
   * @returns 生成的文案
   */
  async quickGenerate(theme: string, keyPoints: string[]): Promise<GeneratedCopywriting> {
    logger.info('快速文案生成模式', { theme });

    const analysis: RequirementAnalysis = {
      contentType: 'video',
      theme,
      style: '专业',
      targetAudience: '通用受众',
      keyPoints,
      originalInput: `${theme}: ${keyPoints.join(', ')}`,
    };

    return this.generate(analysis);
  }

  /**
   * 优化现有文案
   * @param existingCopy 现有文案
   * @param suggestions 优化建议
   * @returns 优化后的文案
   */
  async optimize(
    existingCopy: GeneratedCopywriting,
    suggestions?: string
  ): Promise<GeneratedCopywriting> {
    logger.info('优化现有文案');

    // 构造用于优化的分析结果
    const analysis: RequirementAnalysis = {
      contentType: 'video',
      theme: existingCopy.title,
      style: '优化后',
      targetAudience: '通用受众',
      keyPoints: existingCopy.hashtags,
      originalInput: `请优化以下文案：
标题：${existingCopy.title}
描述：${existingCopy.description}
标签：${existingCopy.hashtags.join(', ')}
${suggestions ? `优化建议：${suggestions}` : ''}`,
    };

    return this.generate(analysis);
  }

  /**
   * 生成 A/B 测试版本文案
   * @param analysis 需求分析结果
   * @param count 生成数量
   * @returns 多个版本的文案
   */
  async generateVariants(
    analysis: RequirementAnalysis,
    count: number = 3
  ): Promise<GeneratedCopywriting[]> {
    logger.info('生成文案变体', { count });

    const variants: GeneratedCopywriting[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const variant = await this.generate({
          ...analysis,
          originalInput: `${analysis.originalInput} (变体 ${i + 1}/${count}，请提供不同风格的文案)`,
        });
        variants.push(variant);
      } catch (error) {
        logger.warn(`生成变体 ${i + 1} 失败`, { error });
      }
    }

    return variants;
  }
}

export default CopywritingGenerator;
