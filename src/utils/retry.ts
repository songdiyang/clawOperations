import { RetryConfig } from '../models/types';
import { createLogger } from './logger';

const logger = createLogger('Retry');

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * 计算指数退避延迟时间
 * @param attempt 当前重试次数
 * @param baseDelay 基础延迟时间
 * @param maxDelay 最大延迟时间
 * @returns 延迟时间（毫秒）
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * 延迟执行
 * @param ms 延迟毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带指数退避的重试工具函数
 * @param fn 需要执行的异步函数
 * @param config 重试配置（可选）
 * @returns Promise<T>
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const { maxRetries, baseDelay, maxDelay, shouldRetry } = finalConfig;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(lastError)) {
        logger.error(`不可重试的错误: ${lastError.message}`);
        throw lastError;
      }

      // 如果已经是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        logger.error(`已达到最大重试次数 (${maxRetries})，最后错误: ${lastError.message}`);
        throw lastError;
      }

      // 计算延迟并等待
      const delay = calculateDelay(attempt, baseDelay, maxDelay);
      logger.warn(`第 ${attempt + 1} 次尝试失败: ${lastError.message}，${delay}ms 后重试...`);
      await sleep(delay);
    }
  }

  // 理论上不会执行到这里，但 TypeScript 需要返回值
  throw lastError || new Error('重试失败');
}

export default { withRetry };
