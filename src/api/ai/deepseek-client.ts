/**
 * DeepSeek AI 客户端
 * 用于需求分析和文案生成
 */

import axios, { AxiosInstance } from 'axios';
import { AI_CONFIG } from '../../../config/default';
import { createLogger } from '../../utils/logger';
import { RequirementAnalysis, GeneratedCopywriting } from '../../models/types';

const logger = createLogger('DeepSeekClient');

/**
 * DeepSeek 聊天消息
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * DeepSeek 聊天请求
 */
interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * DeepSeek 聊天响应
 */
interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek AI 客户端类
 */
export class DeepSeekClient {
  private client: AxiosInstance;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DeepSeek API Key 未配置，请设置 DEEPSEEK_API_KEY 环境变量');
    }

    this.client = axios.create({
      baseURL: AI_CONFIG.DEEPSEEK.BASE_URL,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 秒超时
    });

    this.model = AI_CONFIG.DEEPSEEK.MODEL;
    this.maxTokens = AI_CONFIG.DEEPSEEK.MAX_TOKENS;
    this.temperature = AI_CONFIG.DEEPSEEK.TEMPERATURE;

    logger.info('DeepSeek 客户端初始化完成');
  }

  /**
   * 发送聊天请求
   */
  private async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const request: ChatRequest = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false,
      };

      logger.debug('发送 DeepSeek 请求', { messageCount: messages.length });

      const response = await this.client.post<ChatResponse>('/chat/completions', request);
      
      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek 返回空响应');
      }

      logger.debug('DeepSeek 响应成功', { 
        tokens: response.data.usage?.total_tokens 
      });

      return content;
    } catch (error: any) {
      logger.error('DeepSeek 请求失败', { error: error.message });
      throw new Error(`DeepSeek API 调用失败: ${error.message}`);
    }
  }

  /**
   * 分析用户需求
   * @param userInput 用户输入的需求描述
   * @returns 需求分析结果
   */
  async analyzeRequirement(userInput: string): Promise<RequirementAnalysis> {
    logger.info('开始分析用户需求', { inputLength: userInput.length });

    const systemPrompt = `你是一个专业的内容营销分析师，擅长分析用户的内容创作需求。
请根据用户的输入，分析并提取以下信息，以JSON格式返回：

{
  "contentType": "image" | "video" | "auto",  // 判断用户需要图片还是视频，如果不确定则为auto
  "theme": "主题描述",  // 内容的核心主题
  "style": "风格描述",  // 内容的风格（如：温馨、时尚、专业、幽默等）
  "targetAudience": "目标受众描述",  // 目标观看人群
  "keyPoints": ["卖点1", "卖点2", "卖点3"],  // 关键卖点或亮点，最多5个
  "imagePrompt": "图片生成提示词",  // 用于AI图片生成的英文提示词，要详细描述画面内容、风格、色调等
  "videoPrompt": "视频生成提示词"  // 用于AI视频生成的英文提示词
}

注意事项：
1. imagePrompt 和 videoPrompt 必须是英文，要详细、具体
2. 如果用户没有明确要求，默认 contentType 为 "video"（抖音以视频为主）
3. keyPoints 最多提取5个最重要的卖点
4. 只返回JSON，不要有其他文字`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ];

    const response = await this.chat(messages);
    
    try {
      // 提取 JSON（处理可能被 markdown 代码块包裹的情况）
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const analysis = JSON.parse(jsonStr) as Omit<RequirementAnalysis, 'originalInput'>;
      
      logger.info('需求分析完成', { 
        contentType: analysis.contentType,
        theme: analysis.theme 
      });

      return {
        ...analysis,
        originalInput: userInput,
      };
    } catch (error) {
      logger.error('解析需求分析结果失败', { response });
      throw new Error('需求分析结果解析失败，请重试');
    }
  }

  /**
   * 生成推广文案
   * @param analysis 需求分析结果
   * @returns 生成的文案
   */
  async generateCopywriting(analysis: RequirementAnalysis): Promise<GeneratedCopywriting> {
    logger.info('开始生成推广文案', { theme: analysis.theme });

    const systemPrompt = `你是一个专业的抖音短视频文案创作者，擅长撰写吸引人的标题和描述。
请根据内容分析结果，生成适合抖音发布的文案，以JSON格式返回：

{
  "title": "视频标题",  // 最多55个字符，要吸引眼球
  "description": "视频描述",  // 最多300个字符，包含关键信息和引导互动
  "hashtags": ["话题1", "话题2", "话题3"],  // 相关话题标签，最多5个，不要带#号
  "suggestedPoiName": "建议的位置名称"  // 可选，如果内容与地点相关
}

文案创作技巧：
1. 标题要有悬念、数字或情感共鸣
2. 描述要包含关键卖点，并加入互动引导（如：点赞、评论、关注）
3. hashtag 要包含热门话题和精准话题的组合
4. 使用表情符号增加吸引力
5. 只返回JSON，不要有其他文字`;

    const userMessage = `请为以下内容生成抖音文案：
主题：${analysis.theme}
风格：${analysis.style}
目标受众：${analysis.targetAudience}
关键卖点：${analysis.keyPoints.join('、')}
原始需求：${analysis.originalInput}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await this.chat(messages);

    try {
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const copywriting = JSON.parse(jsonStr) as GeneratedCopywriting;

      // 确保符合限制
      if (copywriting.title.length > 55) {
        copywriting.title = copywriting.title.substring(0, 55);
      }
      if (copywriting.description.length > 300) {
        copywriting.description = copywriting.description.substring(0, 300);
      }
      if (copywriting.hashtags.length > 5) {
        copywriting.hashtags = copywriting.hashtags.slice(0, 5);
      }

      logger.info('文案生成完成', { 
        titleLength: copywriting.title.length,
        hashtagCount: copywriting.hashtags.length 
      });

      return copywriting;
    } catch (error) {
      logger.error('解析文案生成结果失败', { response });
      throw new Error('文案生成结果解析失败，请重试');
    }
  }

  /**
   * 优化图片生成提示词
   * @param basicPrompt 基础提示词
   * @param style 风格要求
   * @returns 优化后的提示词
   */
  async optimizeImagePrompt(basicPrompt: string, style?: string): Promise<string> {
    logger.info('优化图片生成提示词');

    const systemPrompt = `你是一个专业的AI图片生成提示词工程师。
请将用户的图片描述优化为适合AI图片生成模型的英文提示词。

要求：
1. 使用英文
2. 包含主体描述、场景、光线、色调、风格等要素
3. 使用逗号分隔不同的描述元素
4. 添加提升画质的关键词如：high quality, 8k, detailed, professional
5. 只返回提示词，不要有其他文字`;

    const userMessage = style 
      ? `描述：${basicPrompt}\n风格要求：${style}`
      : basicPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await this.chat(messages);
    
    logger.debug('提示词优化完成', { promptLength: response.length });
    
    return response.trim();
  }
}

export default DeepSeekClient;
