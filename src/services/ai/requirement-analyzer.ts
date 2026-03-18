/**
 * 需求分析服务
 * 使用 DeepSeek AI 分析用户输入的需求
 */

import { DeepSeekClient } from '../../api/ai/deepseek-client';
import { RequirementAnalysis } from '../../models/types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RequirementAnalyzer');

/**
 * 需求分析器配置
 */
export interface AnalyzerConfig {
  /** DeepSeek API Key (可选，默认使用环境变量) */
  apiKey?: string;
  /** 默认内容类型 */
  defaultContentType?: 'image' | 'video' | 'auto';
}

/**
 * 需求分析服务类
 */
export class RequirementAnalyzer {
  private deepseekClient: DeepSeekClient;
  private defaultContentType: 'image' | 'video' | 'auto';

  constructor(config?: AnalyzerConfig) {
    this.deepseekClient = new DeepSeekClient(config?.apiKey);
    this.defaultContentType = config?.defaultContentType || 'video';
    
    logger.info('需求分析服务初始化完成');
  }

  /**
   * 分析用户需求
   * @param userInput 用户输入的需求描述
   * @returns 需求分析结果
   */
  async analyze(userInput: string): Promise<RequirementAnalysis> {
    if (!userInput?.trim()) {
      throw new Error('用户输入不能为空');
    }

    logger.info('开始分析用户需求', { inputLength: userInput.length });

    try {
      const analysis = await this.deepseekClient.analyzeRequirement(userInput);

      // 如果分析结果的 contentType 是 auto，使用默认值
      if (analysis.contentType === 'auto') {
        analysis.contentType = this.defaultContentType === 'auto' 
          ? 'video' 
          : this.defaultContentType;
      }

      // 验证分析结果
      this.validateAnalysis(analysis);

      logger.info('需求分析完成', {
        contentType: analysis.contentType,
        theme: analysis.theme,
        keyPointsCount: analysis.keyPoints.length,
      });

      return analysis;
    } catch (error: any) {
      logger.error('需求分析失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证分析结果
   */
  private validateAnalysis(analysis: RequirementAnalysis): void {
    if (!analysis.theme) {
      throw new Error('需求分析失败：未能提取主题');
    }

    if (!analysis.contentType || !['image', 'video'].includes(analysis.contentType)) {
      analysis.contentType = 'video';
    }

    if (!analysis.keyPoints || analysis.keyPoints.length === 0) {
      analysis.keyPoints = [analysis.theme];
    }

    // 确保有生成提示词
    if (analysis.contentType === 'image' && !analysis.imagePrompt) {
      analysis.imagePrompt = `${analysis.theme}, ${analysis.style || 'professional'}, high quality, detailed`;
    }

    if (analysis.contentType === 'video' && !analysis.videoPrompt) {
      analysis.videoPrompt = `${analysis.theme}, ${analysis.style || 'dynamic'}, cinematic, high quality`;
    }
  }

  /**
   * 快速分析（简化版，适用于简单场景）
   */
  async quickAnalyze(userInput: string, contentType: 'image' | 'video'): Promise<RequirementAnalysis> {
    logger.info('快速分析模式', { contentType });

    // 简化分析，主要提取关键信息
    const analysis: RequirementAnalysis = {
      contentType,
      theme: userInput.substring(0, 50),
      style: '专业',
      targetAudience: '通用受众',
      keyPoints: [userInput.substring(0, 30)],
      originalInput: userInput,
    };

    // 使用 DeepSeek 优化提示词
    if (contentType === 'image') {
      analysis.imagePrompt = await this.deepseekClient.optimizeImagePrompt(userInput);
    } else {
      analysis.videoPrompt = await this.deepseekClient.optimizeImagePrompt(userInput, 'video style');
    }

    return analysis;
  }
}

export default RequirementAnalyzer;
