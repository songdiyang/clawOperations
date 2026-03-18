import { withRetry } from '../../src/utils/retry';
import { RetryConfig } from '../../src/models/types';

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功执行函数', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('应该在失败时重试', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockResolvedValue('success');

    const result = await withRetry(mockFn, { maxRetries: 3, baseDelay: 10 });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('应该在达到最大重试次数后抛出错误', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('persistent error'));

    await expect(
      withRetry(mockFn, { maxRetries: 2, baseDelay: 10 })
    ).rejects.toThrow('persistent error');

    expect(mockFn).toHaveBeenCalledTimes(3); // 初始 + 2次重试
  });

  it('应该支持自定义重试条件', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('retryable'))
      .mockRejectedValueOnce(new Error('non-retryable'));

    const shouldRetry = (error: Error) => error.message === 'retryable';

    await expect(
      withRetry(mockFn, { maxRetries: 3, baseDelay: 10, shouldRetry })
    ).rejects.toThrow('non-retryable');

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('应该使用指数退避', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('error'));
    const startTime = Date.now();

    try {
      await withRetry(mockFn, { maxRetries: 2, baseDelay: 100 });
    } catch {
      // expected
    }

    const elapsed = Date.now() - startTime;
    // 第一次重试: 100ms, 第二次重试: 200ms, 总共至少 300ms
    expect(elapsed).toBeGreaterThanOrEqual(250);
  });

  it('应该遵守最大延迟限制', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('error'));
    const startTime = Date.now();

    try {
      await withRetry(mockFn, { 
        maxRetries: 3, 
        baseDelay: 1000, 
        maxDelay: 500 
      });
    } catch {
      // expected
    }

    const elapsed = Date.now() - startTime;
    // 即使有 3 次重试，每次延迟也不应该超过 500ms
    expect(elapsed).toBeLessThan(2000);
  });

  it('应该使用默认配置', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    await withRetry(mockFn);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('应该合并自定义配置和默认配置', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('error'))
      .mockResolvedValue('success');

    await withRetry(mockFn, { maxRetries: 5 }); // 只覆盖 maxRetries

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
