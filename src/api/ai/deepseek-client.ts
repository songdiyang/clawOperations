/**
 * DeepSeek AI 客户端
 * 用于需求分析和文案生成
 */

import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import { AI_CONFIG } from '../../../config/default';
import { createLogger } from '../../utils/logger';
import { RequirementAnalysis, GeneratedCopywriting, MarketingEvaluation } from '../../models/types';

// 确保环境变量已加载（处理模块导入顺序问题）
const projectRoot = process.cwd().toLowerCase().includes('clawoperations')
  ? process.cwd().replace(/[\/]web[\/]server.*$/, '').replace(/[\/]dist.*$/, '')
  : process.cwd();
dotenv.config({ path: path.join(projectRoot, '.env') });

const logger = createLogger('DeepSeekClient');

// 防御性配置检查，确保 AI_CONFIG.DEEPSEEK 存在
const DEEPSEEK_CONFIG = AI_CONFIG?.DEEPSEEK ?? {
  BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  MODEL: 'deepseek-chat',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
};

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
    // 每次创建实例时重新读取环境变量（支持运行时配置更新）
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DeepSeek API Key 未配置。请在系统设置中配置 DEEPSEEK_API_KEY，或设置环境变量。');
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || DEEPSEEK_CONFIG.BASE_URL;

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 秒超时
    });

    this.model = DEEPSEEK_CONFIG.MODEL;
    this.maxTokens = DEEPSEEK_CONFIG.MAX_TOKENS;
    this.temperature = DEEPSEEK_CONFIG.TEMPERATURE;

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
   * 分析用户需求（营销策略师视角）
   * @param userInput 用户输入的需求描述
   * @returns 需求分析结果（含营销策略信息）
   */
  async analyzeRequirement(userInput: string): Promise<RequirementAnalysis> {
    logger.info('开始分析用户需求', { inputLength: userInput.length });

    const systemPrompt = `你是一个专业的内容营销策略师，精通抖音短视频营销，擅长从营销角度深入分析内容创作需求。
请根据用户的输入，以营销专家视角分析并提取以下信息，以JSON格式返回：

{
  "contentType": "image" | "video" | "auto",
  "theme": "内容核心主题（简洁描述）",
  "style": "内容风格（如：温馨治愈、热情活力、专业权威、幽默搞笑、时尚精致）",
  "targetAudience": "目标受众（年龄/性别/兴趣/消费习惯等画像描述）",
  "keyPoints": ["卖点1", "卖点2", "卖点3"],
  "imagePrompt": "图片生成英文提示词（详细描述画面、风格、色调、构图）",
  "videoPrompt": "视频生成英文提示词（描述场景、动感、光线、情绪氛围）",
  "marketingAngle": "最佳营销切入角度，从以下选择并说明理由：痛点式（解决受众困扰）/ 渴望式（激发向往情绪）/ 好奇式（制造悬念引发探索）/ 社交证明式（借助口碑影响力）",
  "emotionalTriggers": ["情感触发词1", "情感触发词2", "情感触发词3"],
  "contentHooks": ["开场钩子1（前3秒台词或画面）", "开场钩子2", "开场钩子3"],
  "audiencePainPoints": ["痛点1", "痛点2", "痛点3"],
  "platformTips": ["发布建议1", "发布建议2", "平台互动引导建议"]
}

营销分析要点：
1. imagePrompt 和 videoPrompt 必须是英文，要详细具体，包含视觉风格和情绪氛围
2. 默认 contentType 为 "video"（抖音以视频为主）
3. keyPoints 最多5个核心卖点，突出差异化优势
4. emotionalTriggers 选择能引发情感共鸣的关键词，如：限时、独家、口感炸裂、治愈、记忆中的味道等
5. contentHooks 要具体可执行，如实际开场台词或画面描述
6. platformTips 包含：最佳发布时段、互动引导语、话题选择建议
7. 只返回JSON，不要有其他文字`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ];

    const response = await this.chat(messages);
    
    try {
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const analysis = JSON.parse(jsonStr) as Omit<RequirementAnalysis, 'originalInput'>;
      
      logger.info('需求分析完成', { 
        contentType: analysis.contentType,
        theme: analysis.theme,
        marketingAngle: analysis.marketingAngle,
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
   * 生成推广文案（AIDA 营销框架）
   * @param analysis 需求分析结果
   * @returns 生成的文案（含营销评分和备选标题）
   */
  async generateCopywriting(analysis: RequirementAnalysis): Promise<GeneratedCopywriting> {
    logger.info('开始生成推广文案', { theme: analysis.theme });

    const systemPrompt = `你是一个专业的抖音短视频营销文案专家，精通 AIDA 营销框架（注意→兴趣→欲望→行动），擅长撰写高转化率的营销文案。
请根据内容分析结果，生成适合抖音发布的高质量营销文案，以JSON格式返回：

{
  "title": "最优视频标题（≤55字符）",
  "description": "视频描述文案（≤300字符，按AIDA结构：前2句制造注意/好奇，中间激发欲望突出核心卖点，最后引导行动）",
  "hashtags": ["话题1", "话题2", "话题3", "话题4", "话题5"],
  "suggestedPoiName": "建议的位置名称（如果内容与地点相关，否则留空）",
  "callToAction": "个性化行动号召语（如：立即预约、点击领券、评论区告诉我、关注获取更多）",
  "marketingScore": 85,
  "alternativeTitles": [
    "备选标题1（悬念式：制造好奇引发点击）",
    "备选标题2（数字式：用数据增加可信度）",
    "备选标题3（情感式：触发情感共鸣）"
  ],
  "improvementSuggestions": [
    "具体改进建议1",
    "具体改进建议2",
    "具体改进建议3"
  ]
}

文案创作技巧：
1. 主标题要强力：使用疑问、数字、反转、情感触发其中一种方式
2. 描述按AIDA：A-吸引注意（开头用数字/悬念/反问），I-激发兴趣（描述使用场景/故事），D-制造欲望（突出独特价值和情感满足），A-引导行动（具体指令+紧迫感）
3. hashtags 搭配：2个大流量话题（千万级）+ 2个垂类话题（百万级）+ 1个品牌/活动话题
4. callToAction 要具体、有创意，避免通用的"点赞关注"
5. marketingScore：0-100分，基于标题吸引力、情感共鸣度、行动引导力综合评定
6. alternativeTitles 三个备选标题要风格各异
7. improvementSuggestions 提供可立即执行的具体改进建议
8. 使用适量表情符号增加吸引力（标题1-2个，描述2-3个）
9. 只返回JSON，不要有其他文字`;

    const userMessage = `请为以下内容生成抖音营销文案：
主题：${analysis.theme}
风格：${analysis.style}
目标受众：${analysis.targetAudience}
关键卖点：${analysis.keyPoints.join('、')}
营销角度：${analysis.marketingAngle || '未指定'}
情感触发词：${analysis.emotionalTriggers?.join('、') || '未指定'}
受众痛点：${analysis.audiencePainPoints?.join('、') || '未指定'}
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
      // 确保评分在有效范围内
      if (copywriting.marketingScore !== undefined) {
        copywriting.marketingScore = Math.max(0, Math.min(100, copywriting.marketingScore));
      }

      logger.info('文案生成完成', { 
        titleLength: copywriting.title.length,
        hashtagCount: copywriting.hashtags.length,
        marketingScore: copywriting.marketingScore,
      });

      return copywriting;
    } catch (error) {
      logger.error('解析文案生成结果失败', { response });
      throw new Error('文案生成结果解析失败，请重试');
    }
  }

  /**
   * 优化图片/视频生成提示词
   * @param basicPrompt 基础提示词
   * @param style 风格要求
   * @returns 优化后的提示词
   */
  async optimizeImagePrompt(basicPrompt: string, style?: string): Promise<string> {
    logger.info('优化图片生成提示词');

    const systemPrompt = `你是一个专业的AI图片/视频生成提示词工程师，精通营销视觉设计。
请将用户的描述优化为适合AI生成模型的英文提示词，重点突出营销视觉冲击力。

要求：
1. 使用英文
2. 包含主体描述、场景、光线、色调、构图、情绪氛围
3. 加入营销相关视觉词汇：vibrant colors, eye-catching, commercial quality 等
4. 添加提升画质关键词：8k, ultra-detailed, professional photography, cinematic
5. 使用逗号分隔各描述元素
6. 只返回提示词，不要有其他文字`;

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

  /**
   * 评估营销潜力（专项评估已有文案）
   * @param title 标题
   * @param description 描述文案
   * @param hashtags 话题标签
   * @param contentType 内容类型
   * @returns 营销效果评估结果
   */
  async evaluateMarketingPotential(
    title: string,
    description: string,
    hashtags: string[],
    contentType?: 'image' | 'video'
  ): Promise<MarketingEvaluation> {
    logger.info('开始评估营销潜力');

    const systemPrompt = `你是一个专业的短视频营销效果分析师，精通抖音平台的内容运营和数据分析。
请对提供的内容文案进行全面的营销效果评估，以JSON格式返回：

{
  "score": 75,
  "dimensions": {
    "titleAttractiveness": 80,
    "emotionalResonance": 70,
    "callToActionStrength": 65,
    "hashtagQuality": 75
  },
  "suggestions": [
    "具体可执行的改进建议1",
    "具体可执行的改进建议2",
    "具体可执行的改进建议3"
  ],
  "bestPublishTime": "建议发布时间段（如：工作日 12:00-13:00 或 周末 18:00-21:00）",
  "predictedEngagement": "high" | "medium" | "low",
  "contentHooks": [
    "建议的内容开场钩子1（具体台词或画面）",
    "建议的内容开场钩子2"
  ]
}

评估维度说明（0-100分）：
- titleAttractiveness：标题是否有悬念/数字/情感触发，是否能引发点击
- emotionalResonance：内容是否触发情感共鸣（渴望/认同/怀念/好奇）
- callToActionStrength：行动引导是否明确具体，是否有紧迫感
- hashtagQuality：话题搭配是否合理，大流量+垂类话题组合
- score：综合评分，根据4个维度加权计算
- predictedEngagement：根据综合评分预测：high(≥75) / medium(50-74) / low(<50)
- suggestions：3条最有效的改进建议，要具体可执行
- contentHooks：2个适合该内容的开场钩子
7. 只返回JSON，不要有其他文字`;

    const userMessage = `请评估以下抖音内容的营销效果：

标题：${title}

描述：
${description}

话题标签：${hashtags.map(t => '#' + t).join(' ')}

内容类型：${contentType === 'image' ? '图片' : '视频'}`;

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

      const evaluation = JSON.parse(jsonStr) as MarketingEvaluation;
      
      // 确保分数在有效范围内
      evaluation.score = Math.max(0, Math.min(100, evaluation.score));
      Object.keys(evaluation.dimensions).forEach(key => {
        const k = key as keyof typeof evaluation.dimensions;
        evaluation.dimensions[k] = Math.max(0, Math.min(100, evaluation.dimensions[k]));
      });

      logger.info('营销潜力评估完成', { score: evaluation.score, engagement: evaluation.predictedEngagement });
      
      return evaluation;
    } catch (error) {
      logger.error('解析营销评估结果失败', { response });
      throw new Error('营销评估结果解析失败，请重试');
    }
  }

  /**
   * 生成内容开场钩子
   * @param theme 主题
   * @param targetAudience 目标受众
   * @param keyPoints 关键卖点
   * @returns 3-5个内容开场钩子
   */
  async generateContentHooks(
    theme: string,
    targetAudience: string,
    keyPoints: string[]
  ): Promise<string[]> {
    logger.info('生成内容开场钩子', { theme });

    const systemPrompt = `你是一个专业的短视频开场设计师，精通抖音黄金3秒法则。
请为给定的内容主题生成5个高质量的开场钩子，以JSON数组格式返回：

["钩子1", "钩子2", "钩子3", "钩子4", "钩子5"]

开场钩子设计原则：
1. 痛点式：直击受众痛点，如"你是不是也遇到过..."
2. 数字式：用具体数字制造冲击，如"90%的人都不知道的..."
3. 反转式：先设悬念再揭晓，如"我以为...结果..."
4. 提问式：引发思考和共鸣，如"为什么..."
5. 宣言式：强势开场建立权威，如"今天带你看看..."
每个钩子长度控制在20-30字，适合作为短视频开场台词
只返回JSON数组，不要有其他文字`;

    const userMessage = `请为以下内容生成开场钩子：
主题：${theme}
目标受众：${targetAudience}
核心卖点：${keyPoints.join('、')}`;

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

      const hooks = JSON.parse(jsonStr) as string[];
      logger.info('内容钩子生成完成', { count: hooks.length });
      return hooks;
    } catch (error) {
      logger.error('解析内容钩子失败', { response });
      throw new Error('内容钩子生成失败，请重试');
    }
  }
}

export default DeepSeekClient;
