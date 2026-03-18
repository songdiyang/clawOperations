import { getDatabase } from '../database';
import { UserAuthConfig } from '../models/user';

/**
 * 用户认证配置服务
 * 管理用户的抖音认证配置，与用户 ID 关联
 */
export class UserAuthConfigService {
  /**
   * 获取用户的抖音配置
   */
  getConfigByUserId(userId: number): UserAuthConfig | null {
    const db = getDatabase();
    const config = db.get('user_auth_configs').find({ user_id: userId }).value();
    return config || null;
  }

  /**
   * 创建或更新用户的抖音配置
   */
  upsertConfig(
    userId: number,
    config: {
      clientKey?: string;
      clientSecret?: string;
      redirectUri?: string;
      accessToken?: string;
      refreshToken?: string;
      openId?: string;
      expiresAt?: number;
    }
  ): UserAuthConfig {
    const db = getDatabase();
    const existing = this.getConfigByUserId(userId);

    if (existing) {
      // 更新
      const updates: Partial<UserAuthConfig> = {};

      if (config.clientKey !== undefined) {
        updates.client_key = config.clientKey || null;
      }
      if (config.clientSecret !== undefined) {
        updates.client_secret = config.clientSecret || null;
      }
      if (config.redirectUri !== undefined) {
        updates.redirect_uri = config.redirectUri || null;
      }
      if (config.accessToken !== undefined) {
        updates.access_token = config.accessToken || null;
      }
      if (config.refreshToken !== undefined) {
        updates.refresh_token = config.refreshToken || null;
      }
      if (config.openId !== undefined) {
        updates.open_id = config.openId || null;
      }
      if (config.expiresAt !== undefined) {
        updates.expires_at = config.expiresAt || null;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        db.get('user_auth_configs').find({ user_id: userId }).assign(updates).write();
      }

      return this.getConfigByUserId(userId)!;
    } else {
      // 创建
      const meta = db.get('_meta').value();
      const newId = meta.nextAuthConfigId;
      db.set('_meta.nextAuthConfigId', newId + 1).write();

      const now = new Date().toISOString();
      const newConfig: UserAuthConfig = {
        id: newId,
        user_id: userId,
        client_key: config.clientKey || null,
        client_secret: config.clientSecret || null,
        redirect_uri: config.redirectUri || null,
        access_token: config.accessToken || null,
        refresh_token: config.refreshToken || null,
        open_id: config.openId || null,
        expires_at: config.expiresAt || null,
        created_at: now,
        updated_at: now,
      };

      db.get('user_auth_configs').push(newConfig).write();

      return this.getConfigByUserId(userId)!;
    }
  }

  /**
   * 更新 Token 信息
   */
  updateTokens(
    userId: number,
    tokenInfo: {
      accessToken: string;
      refreshToken: string;
      openId: string;
      expiresAt: number;
    }
  ): void {
    this.upsertConfig(userId, {
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      openId: tokenInfo.openId,
      expiresAt: tokenInfo.expiresAt,
    });
  }

  /**
   * 检查用户是否已配置
   */
  isConfigured(userId: number): boolean {
    const config = this.getConfigByUserId(userId);
    return !!(config?.client_key && config?.client_secret && config?.redirect_uri);
  }

  /**
   * 检查用户是否有有效 Token
   */
  hasValidToken(userId: number): boolean {
    const config = this.getConfigByUserId(userId);
    if (!config?.access_token || !config?.expires_at) {
      return false;
    }
    return config.expires_at > Date.now();
  }

  /**
   * 获取用户认证状态
   */
  getStatus(userId: number): {
    initialized: boolean;
    hasValidToken: boolean;
    tokenInfo: {
      accessToken: string;
      refreshToken: string;
      openId: string;
      expiresAt: number;
    } | null;
  } {
    const config = this.getConfigByUserId(userId);
    const initialized = this.isConfigured(userId);
    const hasValidToken = this.hasValidToken(userId);

    return {
      initialized,
      hasValidToken,
      tokenInfo: config?.access_token
        ? {
            accessToken: config.access_token,
            refreshToken: config.refresh_token || '',
            openId: config.open_id || '',
            expiresAt: config.expires_at || 0,
          }
        : null,
    };
  }
}

export const userAuthConfigService = new UserAuthConfigService();
