/**
 * 错误分类工具
 * 根据错误信息自动识别错误类型，并提供重试建议
 */

import { PublishErrorType, ErrorClassification } from '../models/types';

/**
 * 错误分类规则
 */
interface ErrorRule {
  type: PublishErrorType;
  patterns: RegExp[];
  retryable: boolean;
  friendlyMessage: string;
  suggestion: string;
}

/**
 * 错误分类规则配置
 */
const errorRules: ErrorRule[] = [
  {
    type: PublishErrorType.TIMEOUT,
    patterns: [
      /timeout/i,
      /ETIMEDOUT/i,
      /超时/,
      /timed?\s*out/i,
      /request\s*timeout/i,
      /connection\s*timeout/i,
      /socket\s*timeout/i,
    ],
    retryable: true,
    friendlyMessage: '请求超时',
    suggestion: '网络可能不稳定，建议稍后重试',
  },
  {
    type: PublishErrorType.TOKEN_EXPIRED,
    patterns: [
      /token.*expir/i,
      /access_token.*invalid/i,
      /invalid.*token/i,
      /token.*过期/,
      /refresh_token/i,
      /授权.*过期/,
      /登录.*失效/,
      /认证.*失败/,
      /unauthorized/i,
      /401/,
      /需要.*登录/,
      /没有.*登录/,
    ],
    retryable: true,
    friendlyMessage: '登录已过期',
    suggestion: '请重新授权抖音账号',
  },
  {
    type: PublishErrorType.MATERIAL_ERROR,
    patterns: [
      /format/i,
      /格式.*错误/,
      /格式.*不支持/,
      /unsupported.*format/i,
      /文件.*损坏/,
      /corrupt/i,
      /invalid.*file/i,
      /invalid.*video/i,
      /invalid.*image/i,
      /视频.*异常/,
      /图片.*异常/,
      /素材.*异常/,
      /分辨率/,
      /resolution/i,
      /codec/i,
      /编码/,
      /文件.*过大/,
      /file.*too.*large/i,
      /size.*exceed/i,
      /duration/i,
      /时长/,
    ],
    retryable: false,
    friendlyMessage: '素材文件异常',
    suggestion: '请检查文件格式、大小和完整性，更换素材后重试',
  },
  {
    type: PublishErrorType.RATE_LIMIT,
    patterns: [
      /rate\s*limit/i,
      /限流/,
      /too\s*many\s*requests/i,
      /请求.*频繁/,
      /操作.*频繁/,
      /429/,
      /频率.*限制/,
      /quota.*exceeded/i,
      /调用.*超限/,
    ],
    retryable: true,
    friendlyMessage: '请求过于频繁',
    suggestion: '平台限流中，请稍后再试',
  },
  {
    type: PublishErrorType.PERMISSION_DENIED,
    patterns: [
      /permission/i,
      /scope.*invalid/i,
      /权限.*不足/,
      /没有.*权限/,
      /forbidden/i,
      /403/,
      /scope.*非法/,
      /能力.*未开通/,
      /capability/i,
      /unauthorized.*scope/i,
    ],
    retryable: false,
    friendlyMessage: '权限不足',
    suggestion: '请检查抖音开放平台应用权限配置',
  },
  {
    type: PublishErrorType.NETWORK_ERROR,
    patterns: [
      /network/i,
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ECONNRESET/i,
      /EPIPE/i,
      /网络.*错误/,
      /网络.*异常/,
      /connection.*refused/i,
      /connection.*reset/i,
      /socket.*hang.*up/i,
      /dns/i,
      /无法.*连接/,
    ],
    retryable: true,
    friendlyMessage: '网络连接失败',
    suggestion: '请检查网络连接后重试',
  },
  {
    type: PublishErrorType.VALIDATION_ERROR,
    patterns: [
      /validation/i,
      /参数.*错误/,
      /参数.*无效/,
      /invalid.*param/i,
      /missing.*param/i,
      /缺少.*参数/,
      /标题.*过长/,
      /描述.*过长/,
      /title.*too.*long/i,
      /字数.*超/,
      /hashtag.*数量/,
    ],
    retryable: false,
    friendlyMessage: '参数验证失败',
    suggestion: '请检查并修正输入参数',
  },
];

/**
 * 根据错误信息进行分类
 * @param error 错误对象或错误消息
 * @returns 错误分类结果
 */
export function classifyError(error: Error | string): ErrorClassification {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // 遍历规则进行匹配
  for (const rule of errorRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(errorMessage)) {
        return {
          type: rule.type,
          retryable: rule.retryable,
          message: rule.friendlyMessage,
          suggestion: rule.suggestion,
        };
      }
    }
  }

  // 未匹配到任何规则，返回未知错误
  return {
    type: PublishErrorType.UNKNOWN,
    retryable: true, // 未知错误默认允许重试
    message: errorMessage || '发布失败',
    suggestion: '请稍后重试，如果问题持续存在，请联系技术支持',
  };
}

/**
 * 判断错误是否可重试
 * @param error 错误对象或错误消息
 * @returns 是否可重试
 */
export function isRetryableError(error: Error | string): boolean {
  const classification = classifyError(error);
  return classification.retryable;
}

/**
 * 获取错误类型的友好名称
 * @param errorType 错误类型
 * @returns 友好名称
 */
export function getErrorTypeName(errorType: PublishErrorType): string {
  const names: Record<PublishErrorType, string> = {
    [PublishErrorType.TIMEOUT]: '请求超时',
    [PublishErrorType.TOKEN_EXPIRED]: '登录过期',
    [PublishErrorType.MATERIAL_ERROR]: '素材异常',
    [PublishErrorType.RATE_LIMIT]: '平台限流',
    [PublishErrorType.PERMISSION_DENIED]: '权限不足',
    [PublishErrorType.NETWORK_ERROR]: '网络错误',
    [PublishErrorType.VALIDATION_ERROR]: '参数错误',
    [PublishErrorType.UNKNOWN]: '未知错误',
  };
  return names[errorType] || '未知错误';
}

/**
 * 获取错误类型的建议操作
 * @param errorType 错误类型
 * @returns 建议操作
 */
export function getErrorSuggestion(errorType: PublishErrorType): string {
  const suggestions: Record<PublishErrorType, string> = {
    [PublishErrorType.TIMEOUT]: '网络可能不稳定，建议稍后重试',
    [PublishErrorType.TOKEN_EXPIRED]: '请重新授权抖音账号',
    [PublishErrorType.MATERIAL_ERROR]: '请检查文件格式、大小和完整性，更换素材后重试',
    [PublishErrorType.RATE_LIMIT]: '平台限流中，请等待几分钟后再试',
    [PublishErrorType.PERMISSION_DENIED]: '请检查抖音开放平台应用权限配置',
    [PublishErrorType.NETWORK_ERROR]: '请检查网络连接后重试',
    [PublishErrorType.VALIDATION_ERROR]: '请检查并修正输入参数',
    [PublishErrorType.UNKNOWN]: '请稍后重试，如果问题持续存在，请联系技术支持',
  };
  return suggestions[errorType] || '请稍后重试';
}

/**
 * 判断是否应该自动重试
 * @param errorType 错误类型
 * @param retryCount 当前重试次数
 * @param maxRetries 最大重试次数
 * @returns 是否应该自动重试
 */
export function shouldAutoRetry(
  errorType: PublishErrorType,
  retryCount: number,
  maxRetries: number = 3
): boolean {
  // 超过最大重试次数
  if (retryCount >= maxRetries) {
    return false;
  }

  // 只有这些类型的错误才自动重试
  const autoRetryTypes = [
    PublishErrorType.TIMEOUT,
    PublishErrorType.NETWORK_ERROR,
    PublishErrorType.RATE_LIMIT,
  ];

  return autoRetryTypes.includes(errorType);
}

/**
 * 计算重试延迟时间（指数退避）
 * @param retryCount 当前重试次数
 * @param baseDelay 基础延迟时间（毫秒）
 * @param maxDelay 最大延迟时间（毫秒）
 * @returns 延迟时间（毫秒）
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // 指数退避：baseDelay * 2^retryCount + 随机抖动
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000; // 0-1秒的随机抖动
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export default {
  classifyError,
  isRetryableError,
  getErrorTypeName,
  getErrorSuggestion,
  shouldAutoRetry,
  calculateRetryDelay,
};
