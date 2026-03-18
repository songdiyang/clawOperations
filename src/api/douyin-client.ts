import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { DouyinApiError, DouyinApiResponse, RetryConfig } from '../models/types';
import { withRetry } from '../utils/retry';
import { createLogger } from '../utils/logger';
import { API_CONFIG, RETRY_CONFIG } from '../../config/default';

const logger = createLogger('DouyinClient');

/**
 * 抖音 API 客户端
 */
export class DouyinClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置访问令牌
   * @param token 访问令牌
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * 获取当前访问令牌
   * @returns 访问令牌
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * 设置请求拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 自动注入 access_token
        if (this.accessToken && config.params) {
          config.params.access_token = this.accessToken;
        }

        logger.debug(`API 请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: AxiosError) => {
        logger.error(`请求拦截器错误: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<DouyinApiResponse<unknown>>) => {
        logger.debug(`API 响应: ${response.config.url} - ${response.status}`);
        
        // 检查抖音 API 错误码
        const data = response.data;
        if (data && typeof data === 'object' && 'data' in data) {
          // 某些接口错误码在 data 中
          const errorData = data as { data?: { error_code?: number; description?: string } };
          if (errorData.data?.error_code && errorData.data.error_code !== 0) {
            const error: DouyinApiError = {
              code: errorData.data.error_code,
              message: errorData.data.description || '未知错误',
            };
            throw new DouyinApiException(error);
          }
        }
        
        return response;
      },
      (error: AxiosError<DouyinApiError>) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * 处理 API 错误
   * @param error Axios 错误
   */
  private handleError(error: AxiosError<DouyinApiError>): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      logger.error(`API 错误: ${status} - ${JSON.stringify(data)}`);

      // 抖音 API 特定错误
      if (data && data.code) {
        throw new DouyinApiException(data);
      }

      // HTTP 状态码错误
      throw new Error(`HTTP ${status}: ${error.message}`);
    } else if (error.request) {
      logger.error(`网络错误: ${error.message}`);
      throw new Error(`网络错误: ${error.message}`);
    } else {
      logger.error(`请求配置错误: ${error.message}`);
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }

  /**
   * 发送 GET 请求
   * @param url 请求地址
   * @param config 请求配置
   * @param retryConfig 重试配置
   */
  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return withRetry(
      async () => {
        const response = await this.client.get<DouyinApiResponse<T>>(url, config);
        return response.data.data;
      },
      {
        ...RETRY_CONFIG,
        ...retryConfig,
        shouldRetry: (error) => this.shouldRetry(error),
      }
    );
  }

  /**
   * 发送 POST 请求
   * @param url 请求地址
   * @param data 请求数据
   * @param config 请求配置
   * @param retryConfig 重试配置
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return withRetry(
      async () => {
        const response = await this.client.post<DouyinApiResponse<T>>(url, data, config);
        return response.data.data;
      },
      {
        ...RETRY_CONFIG,
        ...retryConfig,
        shouldRetry: (error) => this.shouldRetry(error),
      }
    );
  }

  /**
   * 发送 POST 请求（multipart/form-data）
   * @param url 请求地址
   * @param formData FormData 对象
   * @param config 请求配置
   * @param retryConfig 重试配置
   */
  async postForm<T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return withRetry(
      async () => {
        const response = await this.client.post<DouyinApiResponse<T>>(url, formData, {
          ...config,
          headers: {
            ...config?.headers,
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data.data;
      },
      {
        ...RETRY_CONFIG,
        ...retryConfig,
        shouldRetry: (error) => this.shouldRetry(error),
      }
    );
  }

  /**
   * 判断是否应该重试
   * @param error 错误对象
   */
  private shouldRetry(error: Error): boolean {
    // 抖音 API 限流错误码
    const RATE_LIMIT_CODES = [429, 10001, 10002];
    
    if (error instanceof DouyinApiException) {
      return RATE_LIMIT_CODES.includes(error.error.code);
    }

    // 网络错误和超时
    if (error.message.includes('网络错误') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET')) {
      return true;
    }

    return false;
  }
}

/**
 * 抖音 API 异常
 */
export class DouyinApiException extends Error {
  public readonly error: DouyinApiError;

  constructor(error: DouyinApiError) {
    super(`[${error.code}] ${error.message}`);
    this.error = error;
    this.name = 'DouyinApiException';
  }
}

export default DouyinClient;
