/**
 * AI 服务错误类型定义
 */

/**
 * AI 服务错误基类
 */
export class AIServiceError extends Error {
  /** 错误来源服务 */
  public readonly service: 'deepseek' | 'doubao' | 'unknown';
  /** 错误代码 */
  public readonly code?: string;
  /** 原始错误 */
  public readonly cause?: Error;
  /** 是否可重试 */
  public readonly retryable: boolean;

  constructor(
    message: string,
    service: 'deepseek' | 'doubao' | 'unknown' = 'unknown',
    options?: {
      code?: string;
      cause?: Error;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.service = service;
    this.code = options?.code;
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? false;
  }

  /**
   * 转换为可序列化的对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      code: this.code,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * DeepSeek API 错误
 */
export class DeepSeekError extends AIServiceError {
  constructor(message: string, code?: string, cause?: Error) {
    super(message, 'deepseek', { code, cause, retryable: isRetryableError(code) });
    this.name = 'DeepSeekError';
  }
}

/**
 * 豆包 API 错误
 */
export class DoubaoError extends AIServiceError {
  constructor(message: string, code?: string, cause?: Error) {
    super(message, 'doubao', { code, cause, retryable: isRetryableError(code) });
    this.name = 'DoubaoError';
  }
}

/**
 * 内容生成错误
 */
export class ContentGenerationError extends AIServiceError {
  /** 生成阶段 */
  public readonly stage: 'init' | 'generating' | 'downloading' | 'processing';

  constructor(
    message: string,
    stage: 'init' | 'generating' | 'downloading' | 'processing',
    service: 'deepseek' | 'doubao' | 'unknown' = 'unknown',
    cause?: Error
  ) {
    super(message, service, { cause, retryable: stage !== 'init' });
    this.name = 'ContentGenerationError';
    this.stage = stage;
  }
}

/**
 * 文案生成错误
 */
export class CopywritingError extends AIServiceError {
  constructor(message: string, cause?: Error) {
    super(message, 'deepseek', { cause, retryable: true });
    this.name = 'CopywritingError';
  }
}

/**
 * 任务执行错误
 */
export class TaskExecutionError extends AIServiceError {
  /** 任务 ID */
  public readonly taskId?: string;
  /** 任务阶段 */
  public readonly taskStage?: string;

  constructor(
    message: string,
    taskId?: string,
    taskStage?: string,
    cause?: Error
  ) {
    super(message, 'unknown', { cause, retryable: false });
    this.name = 'TaskExecutionError';
    this.taskId = taskId;
    this.taskStage = taskStage;
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends AIServiceError {
  /** 缺失的配置项 */
  public readonly missingConfig: string[];

  constructor(message: string, missingConfig: string[] = []) {
    super(message, 'unknown', { retryable: false });
    this.name = 'ConfigurationError';
    this.missingConfig = missingConfig;
  }
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(code?: string): boolean {
  if (!code) return false;
  
  const retryableCodes = [
    'rate_limit_exceeded',
    'timeout',
    'server_error',
    'service_unavailable',
    '429',
    '500',
    '502',
    '503',
    '504',
  ];
  
  return retryableCodes.some(c => code.toLowerCase().includes(c.toLowerCase()));
}

/**
 * 从未知错误创建 AIServiceError
 */
export function wrapError(error: unknown, service?: 'deepseek' | 'doubao'): AIServiceError {
  if (error instanceof AIServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new AIServiceError(
      error.message,
      service || 'unknown',
      { cause: error, retryable: false }
    );
  }

  return new AIServiceError(
    String(error),
    service || 'unknown',
    { retryable: false }
  );
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AIServiceError) {
    const parts = [error.message];
    if (error.code) {
      parts.push(`(错误码: ${error.code})`);
    }
    if (error.service !== 'unknown') {
      parts.push(`[${error.service}]`);
    }
    return parts.join(' ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export default {
  AIServiceError,
  DeepSeekError,
  DoubaoError,
  ContentGenerationError,
  CopywritingError,
  TaskExecutionError,
  ConfigurationError,
  wrapError,
  formatErrorMessage,
};
