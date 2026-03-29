import { DouyinClient } from './douyin-client';
import { OAuthConfig, TokenInfo, TokenResponse } from '../models/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('Auth');

/**
 * OAuth 认证作用域
 */
export const OAUTH_SCOPES = {
  VIDEO_CREATE: 'video.create',
  VIDEO_UPLOAD: 'video.upload',
  VIDEO_DATA: 'video.data',
  USER_INFO: 'user_info',
} as const;

/**
 * 默认授权作用域 - 只使用 user_info 作为基础权限
 * 如需视频发布权限，请在抖音开放平台申请 video.create, video.upload 等能力
 */
const DEFAULT_SCOPES = [
  OAUTH_SCOPES.USER_INFO,  // 基础用户信息权限，一般默认开通
];

/**
 * 抖音 OAuth 认证模块
 */
export class DouyinAuth {
  private client: DouyinClient;
  private config: OAuthConfig;
  private tokenInfo: TokenInfo | null = null;

  constructor(client: DouyinClient, config: OAuthConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * 生成授权页面 URL
   * @param scopes 授权作用域数组
   * @param state 状态参数（可选，用于防止 CSRF）
   * @returns 授权页面 URL
   */
  getAuthorizationUrl(scopes: string[] = DEFAULT_SCOPES, state?: string): string {
    const params = new URLSearchParams({
      client_key: this.config.clientKey,
      response_type: 'code',
      scope: scopes.join(','),
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `https://open.douyin.com/platform/oauth/connect/?${params.toString()}`;
    logger.info(`生成授权 URL: ${authUrl}`);
    return authUrl;
  }

  /**
   * 使用授权码换取 access_token
   * @param authCode 授权码
   * @returns Token 信息
   */
  async getAccessToken(authCode: string): Promise<TokenInfo> {
    logger.info('使用授权码换取 access_token...');

    const params = {
      client_key: this.config.clientKey,
      client_secret: this.config.clientSecret,
      code: authCode,
      grant_type: 'authorization_code',
    };

    try {
      const response = await this.client.post<TokenResponse>('/oauth/access_token/', null, {
        params,
      });

      // 调试日志：打印原始响应以便排查字段名问题
      logger.debug(`Token 响应原始数据: ${JSON.stringify(response)}`);

      this.tokenInfo = this.parseTokenResponse(response);
      this.client.setAccessToken(this.tokenInfo.accessToken);

      logger.info(`Token 获取成功，openid: ${this.tokenInfo.openId}`);
      return this.tokenInfo;
    } catch (error) {
      logger.error(`Token 获取失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 刷新 access_token
   * @param refreshToken 刷新令牌（可选，默认使用当前存储的）
   * @returns 新的 Token 信息
   */
  async refreshAccessToken(refreshToken?: string): Promise<TokenInfo> {
    const token = refreshToken || this.tokenInfo?.refreshToken;
    
    if (!token) {
      throw new Error('没有可用的 refresh_token');
    }

    logger.info('刷新 access_token...');

    const params = {
      client_key: this.config.clientKey,
      refresh_token: token,
      grant_type: 'refresh_token',
    };

    try {
      const response = await this.client.post<TokenResponse>('/oauth/refresh_token/', null, {
        params,
      });

      this.tokenInfo = this.parseTokenResponse(response);
      this.client.setAccessToken(this.tokenInfo.accessToken);

      logger.info('Token 刷新成功');
      return this.tokenInfo;
    } catch (error) {
      logger.error(`Token 刷新失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 检查 token 是否有效
   * @returns 是否有效
   */
  isTokenValid(): boolean {
    if (!this.tokenInfo) {
      return false;
    }

    // 提前 5 分钟认为过期
    const bufferTime = 5 * 60 * 1000;
    return Date.now() < (this.tokenInfo.expiresAt - bufferTime);
  }

  /**
   * 确保 token 有效（如果过期则自动刷新）
   */
  async ensureTokenValid(): Promise<void> {
    if (!this.isTokenValid()) {
      logger.warn('Token 已过期或即将过期，自动刷新...');
      await this.refreshAccessToken();
    }
  }

  /**
   * 获取当前 token 信息
   * @returns Token 信息
   */
  getTokenInfo(): TokenInfo | null {
    return this.tokenInfo;
  }

  /**
   * 设置 token 信息（用于从存储中恢复）
   * @param tokenInfo Token 信息
   */
  setTokenInfo(tokenInfo: TokenInfo): void {
    this.tokenInfo = tokenInfo;
    this.client.setAccessToken(tokenInfo.accessToken);
    logger.info('Token 信息已设置');
  }

  /**
   * 解析 Token 响应
   * @param response API 响应
   * @returns Token 信息
   */
  private parseTokenResponse(response: TokenResponse): TokenInfo {
    const expiresAt = Date.now() + response.expires_in * 1000;
    // 兼容抽音 API 返回 open_id 或 openid 两种格式
    const openId = response.open_id || response.openid || '';
    
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
      openId,
      scope: response.scope,
    };
  }
}

export default DouyinAuth;
