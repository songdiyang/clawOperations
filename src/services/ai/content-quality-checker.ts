/**
 * 内容质量校验服务
 * 检查生成内容的合规性、品牌问题、平台适配性等
 */

import { 
  QualityCheckInput, 
  QualityCheckResult, 
  QualityIssue,
  IssueCategory,
  IssueSeverity,
} from '../../models/types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ContentQualityChecker');

/**
 * 敏感词规则
 */
interface SensitiveWordRule {
  pattern: RegExp;
  message: string;
  suggestion: string;
  alternatives?: string[];
  severity: IssueSeverity;
}

/**
 * 敏感词规则列表
 */
const SENSITIVE_WORD_RULES: SensitiveWordRule[] = [
  // 绝对化表述
  {
    pattern: /最(便宜|低价|优惠|划算|实惠)/g,
    message: '绝对化表述"最便宜/最低价"可能触发平台风控',
    suggestion: '使用相对表述如"超值""划算"',
    alternatives: ['超值优惠', '性价比高', '划算之选'],
    severity: 'error',
  },
  {
    pattern: /(全网|全国|世界|全球)(第一|最[好佳强大]|领先|独家)/g,
    message: '夸大宣传表述"全网第一/全国最好"容易引发风控',
    suggestion: '使用"广受好评""热销"等表述',
    alternatives: ['广受好评', '热销推荐', '口碑之选'],
    severity: 'error',
  },
  {
    pattern: /(百分之?百|100%)(有效|成功|满意|好评)/g,
    message: '"100%有效"等绝对化承诺可能违规',
    suggestion: '使用"深受好评""效果显著"等表述',
    alternatives: ['效果显著', '深受好评', '备受认可'],
    severity: 'error',
  },
  {
    pattern: /(顶级|极致|完美|绝对|永久)/g,
    message: '夸大修饰词"顶级/完美"可能触发审核',
    suggestion: '使用"优质""精选"等温和表述',
    alternatives: ['优质', '精选', '高品质'],
    severity: 'warning',
  },
  {
    pattern: /(国家级|政府|官方)(认证|推荐|指定)/g,
    message: '虚假认证声明"国家级认证"严重违规',
    suggestion: '删除此类表述或提供真实认证证明',
    alternatives: [],
    severity: 'error',
  },
  // 诱导性表述
  {
    pattern: /(仅限今天|限时|马上涨价|即将售罄|错过不再)/g,
    message: '过度紧迫感表述可能被认定为诱导消费',
    suggestion: '适度使用时效性表述',
    alternatives: ['限时优惠', '活动期间'],
    severity: 'warning',
  },
  // 医疗相关
  {
    pattern: /(治疗|治愈|药效|疗效|根治)/g,
    message: '医疗用语在非医疗内容中可能违规',
    suggestion: '非医疗产品请避免使用医疗术语',
    alternatives: ['改善', '呵护', '调理'],
    severity: 'error',
  },
  // 收益承诺
  {
    pattern: /(稳赚|保本|高收益|日入|月入)\d*/g,
    message: '收益承诺类表述可能涉及违规',
    suggestion: '避免具体收益承诺',
    alternatives: [],
    severity: 'error',
  },
];

/**
 * 平台规则配置
 */
const PLATFORM_RULES = {
  douyin: {
    maxTitleLength: 30,
    maxDescriptionLength: 2200,
    maxHashtags: 5,
    minHashtags: 1,
    forbiddenWords: ['微信', 'wx', 'WeChat', 'QQ', '私聊', '私信领取'],
  },
  tiktok: {
    maxTitleLength: 100,
    maxDescriptionLength: 2200,
    maxHashtags: 30,
    minHashtags: 3,
    forbiddenWords: [],
  },
};

/**
 * 内容质量校验服务类
 */
export class ContentQualityChecker {
  
  constructor() {
    logger.info('内容质量校验服务初始化完成');
  }

  /**
   * 执行质量校验
   */
  async check(input: QualityCheckInput): Promise<QualityCheckResult> {
    logger.info('开始内容质量校验', { 
      titleLength: input.title?.length,
      descLength: input.description?.length,
      platform: input.platform,
    });

    const issues: QualityIssue[] = [];
    
    // 1. 敏感词检查
    issues.push(...this.checkSensitiveWords(input));
    
    // 2. 品牌词检查
    issues.push(...this.checkBrandIssues(input));
    
    // 3. 平台适配检查
    issues.push(...this.checkPlatformCompliance(input));
    
    // 4. 内容结构检查
    issues.push(...this.checkContentStructure(input));
    
    // 5. 发布建议
    issues.push(...this.generatePublishSuggestions(input));

    // 计算评分和汇总
    const summary = this.calculateSummary(issues);
    const score = this.calculateScore(issues);
    const passed = summary.errors === 0;

    const result: QualityCheckResult = {
      passed,
      score,
      issues,
      summary,
      checkedAt: new Date().toISOString(),
      suggestedPublishTime: this.getSuggestedPublishTime(),
      suggestedTags: this.getSuggestedTags(input),
    };

    logger.info('质量校验完成', { passed, score, issueCount: issues.length });
    return result;
  }

  /**
   * 检查敏感词
   */
  private checkSensitiveWords(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const fullText = `${input.title || ''} ${input.description || ''}`;

    for (const rule of SENSITIVE_WORD_RULES) {
      const matches = fullText.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          issues.push({
            category: 'sensitive_word',
            severity: rule.severity,
            message: rule.message,
            original: match,
            suggestion: rule.suggestion,
            alternatives: rule.alternatives,
            location: input.title?.includes(match) ? '标题' : '描述',
          });
        }
      }
    }

    return issues;
  }

  /**
   * 检查品牌问题
   */
  private checkBrandIssues(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const fullText = `${input.title || ''} ${input.description || ''}`;

    // 检查是否包含品牌名（如果指定了品牌）
    if (input.brandName && !fullText.includes(input.brandName)) {
      issues.push({
        category: 'brand_issue',
        severity: 'warning',
        message: `内容中未出现品牌名"${input.brandName}"`,
        suggestion: '建议在标题或描述中包含品牌名称，增强品牌识别度',
      });
    }

    // 检查常见品牌错误拼写
    const brandMisspellings = [
      { wrong: /星巴克?/g, correct: '星巴克' },
      { wrong: /可口可楽/g, correct: '可口可乐' },
      { wrong: /麦当[劳老]/g, correct: '麦当劳' },
    ];

    for (const spelling of brandMisspellings) {
      if (spelling.wrong.test(fullText)) {
        issues.push({
          category: 'brand_issue',
          severity: 'warning',
          message: `可能存在品牌名拼写错误`,
          suggestion: `请确认是否应为"${spelling.correct}"`,
        });
      }
    }

    return issues;
  }

  /**
   * 检查平台适配
   */
  private checkPlatformCompliance(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const platform = input.platform || 'douyin';
    const rules = PLATFORM_RULES[platform];
    const fullText = `${input.title || ''} ${input.description || ''}`;

    // 标题长度检查
    if (input.title && input.title.length > rules.maxTitleLength) {
      issues.push({
        category: 'platform_compliance',
        severity: 'error',
        message: `标题超过${platform === 'douyin' ? '抖音' : 'TikTok'}限制（${rules.maxTitleLength}字）`,
        original: `当前${input.title.length}字`,
        suggestion: `请缩减标题至${rules.maxTitleLength}字以内`,
      });
    }

    // 描述长度检查
    if (input.description && input.description.length > rules.maxDescriptionLength) {
      issues.push({
        category: 'platform_compliance',
        severity: 'warning',
        message: `描述内容较长，建议精简`,
        original: `当前${input.description.length}字`,
        suggestion: '过长的描述可能影响用户阅读体验',
      });
    }

    // 标签数量检查
    const hashtagCount = input.hashtags?.length || 0;
    if (hashtagCount < rules.minHashtags) {
      issues.push({
        category: 'platform_compliance',
        severity: 'warning',
        message: `标签数量不足，建议至少${rules.minHashtags}个`,
        original: `当前${hashtagCount}个`,
        suggestion: '添加更多相关标签可提高内容曝光',
      });
    }
    if (hashtagCount > rules.maxHashtags) {
      issues.push({
        category: 'platform_compliance',
        severity: 'warning',
        message: `标签过多，${platform === 'douyin' ? '抖音' : 'TikTok'}建议不超过${rules.maxHashtags}个`,
        original: `当前${hashtagCount}个`,
        suggestion: '选择最相关的标签，避免过度堆砌',
      });
    }

    // 导流词检查
    for (const word of rules.forbiddenWords) {
      if (fullText.toLowerCase().includes(word.toLowerCase())) {
        issues.push({
          category: 'platform_compliance',
          severity: 'error',
          message: `包含平台禁止的导流词"${word}"`,
          original: word,
          suggestion: '删除站外导流信息，避免内容被限流或下架',
        });
      }
    }

    // 营销腔检测
    const marketingPatterns = [
      /买它[！!]+/,
      /赶紧下单/,
      /不买后悔/,
      /错过等一年/,
    ];
    for (const pattern of marketingPatterns) {
      if (pattern.test(fullText)) {
        issues.push({
          category: 'platform_compliance',
          severity: 'warning',
          message: '存在明显营销腔，可能不像原生内容',
          suggestion: '建议使用更自然的推荐语气，提升用户接受度',
        });
        break;
      }
    }

    return issues;
  }

  /**
   * 检查内容结构
   */
  private checkContentStructure(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // 检查标题是否存在
    if (!input.title || input.title.trim().length < 5) {
      issues.push({
        category: 'content_structure',
        severity: 'error',
        message: '标题过短或缺失',
        suggestion: '请提供至少5个字的标题，突出内容核心卖点',
      });
    }

    // 检查描述是否存在
    if (!input.description || input.description.trim().length < 10) {
      issues.push({
        category: 'content_structure',
        severity: 'warning',
        message: '描述内容过短',
        suggestion: '建议补充更详细的描述，增加内容吸引力',
      });
    }

    // 检查是否包含行动引导（CTA）
    const ctaPatterns = [
      /点击|关注|点赞|收藏|转发|评论|私信|购买|下单|领取|了解/,
    ];
    const hasCtA = ctaPatterns.some(p => p.test(input.description || ''));
    if (!hasCtA) {
      issues.push({
        category: 'content_structure',
        severity: 'info',
        message: '缺少行动引导（CTA）',
        suggestion: '建议添加"关注获取更多""点赞收藏"等引导语',
        alternatives: ['欢迎关注', '点赞收藏不迷路', '评论区告诉我'],
      });
    }

    // 检查表情符号使用
    const emojiCount = (input.description?.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount === 0 && input.platform === 'douyin') {
      issues.push({
        category: 'content_structure',
        severity: 'info',
        message: '未使用表情符号',
        suggestion: '适当使用表情可增加内容亲和力和可读性',
      });
    } else if (emojiCount > 10) {
      issues.push({
        category: 'content_structure',
        severity: 'warning',
        message: '表情符号使用过多',
        original: `使用了${emojiCount}个表情`,
        suggestion: '过多表情可能影响阅读体验，建议适度使用',
      });
    }

    // 检查是否有重复内容
    if (input.title && input.description?.includes(input.title)) {
      issues.push({
        category: 'content_structure',
        severity: 'info',
        message: '描述中重复了完整标题内容',
        suggestion: '建议丰富描述内容，避免简单重复',
      });
    }

    return issues;
  }

  /**
   * 生成发布建议
   */
  private generatePublishSuggestions(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // 检查标签重复
    if (input.hashtags) {
      const uniqueTags = new Set(input.hashtags.map(t => t.toLowerCase()));
      if (uniqueTags.size < input.hashtags.length) {
        issues.push({
          category: 'publish_suggestion',
          severity: 'warning',
          message: '存在重复标签',
          suggestion: '删除重复标签，添加更多相关标签扩大覆盖面',
        });
      }

      // 检查是否有过于泛化的标签
      const genericTags = ['日常', '生活', '记录', '分享', '推荐'];
      const usedGenericTags = input.hashtags.filter(t => genericTags.includes(t));
      if (usedGenericTags.length > 2) {
        issues.push({
          category: 'publish_suggestion',
          severity: 'info',
          message: '使用过多泛化标签',
          original: usedGenericTags.join(', '),
          suggestion: '建议使用更精准的行业/场景标签提升内容定位',
        });
      }
    }

    // 检查发布时间
    if (input.scheduledTime) {
      const scheduledDate = new Date(input.scheduledTime);
      const hour = scheduledDate.getHours();
      
      // 抖音最佳发布时间段: 7-9, 12-14, 17-23
      const isOptimalTime = (hour >= 7 && hour <= 9) || 
                           (hour >= 12 && hour <= 14) || 
                           (hour >= 17 && hour <= 23);
      
      if (!isOptimalTime) {
        issues.push({
          category: 'publish_suggestion',
          severity: 'info',
          message: '发布时间可能非最佳时段',
          original: `计划发布时间: ${hour}:00`,
          suggestion: '抖音用户活跃时段为 7-9点、12-14点、17-23点',
        });
      }
    }

    return issues;
  }

  /**
   * 计算问题汇总
   */
  private calculateSummary(issues: QualityIssue[]): { errors: number; warnings: number; infos: number } {
    return {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      infos: issues.filter(i => i.severity === 'info').length,
    };
  }

  /**
   * 计算评分
   */
  private calculateScore(issues: QualityIssue[]): number {
    let score = 100;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取建议发布时间
   */
  private getSuggestedPublishTime(): string {
    const now = new Date();
    const hour = now.getHours();
    
    // 计算下一个最佳时段
    let targetHour: number;
    if (hour < 7) {
      targetHour = 7;
    } else if (hour < 12) {
      targetHour = 12;
    } else if (hour < 17) {
      targetHour = 17;
    } else if (hour < 20) {
      targetHour = 20;
    } else {
      // 明天早上
      now.setDate(now.getDate() + 1);
      targetHour = 7;
    }
    
    now.setHours(targetHour, 0, 0, 0);
    return now.toISOString();
  }

  /**
   * 获取建议标签
   */
  private getSuggestedTags(input: QualityCheckInput): string[] {
    const suggestions: string[] = [];
    const existingTags = new Set((input.hashtags || []).map(t => t.toLowerCase()));
    
    // 基于内容类型推荐
    if (input.contentType === 'video') {
      const videoTags = ['短视频', '视频创作', '精选'];
      for (const tag of videoTags) {
        if (!existingTags.has(tag)) {
          suggestions.push(tag);
        }
      }
    }
    
    // 基于内容关键词推荐
    const text = `${input.title} ${input.description}`.toLowerCase();
    
    const tagMapping: Record<string, string[]> = {
      '美食|好吃|餐厅|小吃': ['美食探店', '美食推荐', '吃货'],
      '穿搭|时尚|衣服|搭配': ['穿搭分享', '时尚', 'ootd'],
      '旅行|景点|旅游|出行': ['旅行攻略', '旅游推荐', '出游'],
      '美妆|化妆|护肤|彩妆': ['美妆教程', '护肤', '化妆'],
      '健身|运动|减肥|塑形': ['健身打卡', '运动', '健康生活'],
    };
    
    for (const [pattern, tags] of Object.entries(tagMapping)) {
      if (new RegExp(pattern).test(text)) {
        for (const tag of tags) {
          if (!existingTags.has(tag.toLowerCase()) && !suggestions.includes(tag)) {
            suggestions.push(tag);
          }
        }
      }
    }
    
    return suggestions.slice(0, 5);
  }
}

// 导出单例
export const contentQualityChecker = new ContentQualityChecker();
