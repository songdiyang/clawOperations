import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool, getRedis, toMysqlDatetime, fromMysqlDatetime } from '../database';
import { UserAuthConfig } from '../models/user';

/** Redis Token 键前缀 */
const REDIS_TOKEN_KEY = (userId: number) => `token:user:${userId}`;

/**
 * 将 MySQL 行转换为 UserAuthConfig
 */
function rowToConfig(row: RowDataPacket): UserAuthConfig {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    client_key: row.client_key as string | null,
    client_secret: row.client_secret as string | null,
    redirect_uri: row.redirect_uri as string | null,
    access_token: row.access_token as string | null,
    refresh_token: row.refresh_token as string | null,
    open_id: row.open_id as string | null,
    expires_at: row.expires_at ? Number(row.expires_at) : null,
    created_at: fromMysqlDatetime(row.created_at as string) || new Date().toISOString(),
    updated_at: fromMysqlDatetime(row.updated_at as string) || new Date().toISOString(),
  };
}

/**
 * 用户认证配置服务
 * 管理用户的抖音认证配置，与用户 ID 关联
 * Redis 用于缓存 Token（加速 hasValidToken 检查）
 */
export class UserAuthConfigService {
  /**
   * 获取用户的抖音配置
   */
  async getConfigByUserId(userId: number): Promise<UserAuthConfig | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM user_auth_configs WHERE user_id = ?',
      [userId]
    );
    return rows.length > 0 ? rowToConfig(rows[0]) : null;
  }

  /**
   * 创建或更新用户的抖音配置
   */
  async upsertConfig(
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
  ): Promise<UserAuthConfig> {
    const pool = getPool();
    const now = toMysqlDatetime();
    const existing = await this.getConfigByUserId(userId);

    if (existing) {
      const setClauses: string[] = ['updated_at = ?'];
      const values: (string | number | null)[] = [now];

      if (config.clientKey !== undefined) { setClauses.unshift('client_key = ?'); values.unshift(config.clientKey || null); }
      if (config.clientSecret !== undefined) { setClauses.unshift('client_secret = ?'); values.unshift(config.clientSecret || null); }
      if (config.redirectUri !== undefined) { setClauses.unshift('redirect_uri = ?'); values.unshift(config.redirectUri || null); }
      if (config.accessToken !== undefined) { setClauses.unshift('access_token = ?'); values.unshift(config.accessToken || null); }
      if (config.refreshToken !== undefined) { setClauses.unshift('refresh_token = ?'); values.unshift(config.refreshToken || null); }
      if (config.openId !== undefined) { setClauses.unshift('open_id = ?'); values.unshift(config.openId || null); }
      if (config.expiresAt !== undefined) { setClauses.unshift('expires_at = ?'); values.unshift(config.expiresAt || null); }

      values.push(userId);
      await pool.execute(
        `UPDATE user_auth_configs SET ${setClauses.join(', ')} WHERE user_id = ?`,
        values
      );
    } else {
      await pool.execute<ResultSetHeader>(
        'INSERT INTO user_auth_configs (user_id, client_key, client_secret, redirect_uri, access_token, refresh_token, open_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          config.clientKey || null,
          config.clientSecret || null,
          config.redirectUri || null,
          config.accessToken || null,
          config.refreshToken || null,
          config.openId || null,
          config.expiresAt || null,
          now,
          now,
        ]
      );
    }

    // 如果有 Token，同步写入 Redis
    if (config.accessToken && config.expiresAt) {
      await this.cacheTokenToRedis(userId, config.accessToken, config.expiresAt);
    }

    return (await this.getConfigByUserId(userId))!;
  }

  /**
   * 更新 Token 信息
   */
  async updateTokens(
    userId: number,
    tokenInfo: {
      accessToken: string;
      refreshToken: string;
      openId: string;
      expiresAt: number;
    }
  ): Promise<void> {
    await this.upsertConfig(userId, {
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      openId: tokenInfo.openId,
      expiresAt: tokenInfo.expiresAt,
    });
  }

  /**
   * 检查用户是否已配置
   */
  async isConfigured(userId: number): Promise<boolean> {
    const config = await this.getConfigByUserId(userId);
    return !!(config?.client_key && config?.client_secret && config?.redirect_uri);
  }

  /**
   * 检查用户是否有有效 Token（优先查 Redis，fallback 查 MySQL）
   */
  async hasValidToken(userId: number): Promise<boolean> {
    try {
      const redis = getRedis();
      const cached = await redis.get(REDIS_TOKEN_KEY(userId));
      if (cached) return true; // Redis TTL 控制有效期
    } catch {
      // Redis 不可用时 fallback 到 MySQL
    }

    const config = await this.getConfigByUserId(userId);
    if (!config?.access_token || !config?.expires_at) return false;
    return config.expires_at > Date.now();
  }

  /**
   * 获取用户认证状态
   */
  async getStatus(userId: number): Promise<{
    initialized: boolean;
    hasValidToken: boolean;
    tokenInfo: {
      accessToken: string;
      refreshToken: string;
      openId: string;
      expiresAt: number;
    } | null;
  }> {
    const config = await this.getConfigByUserId(userId);
    const initialized = !!(config?.client_key && config?.client_secret && config?.redirect_uri);
    const hasValidToken = await this.hasValidToken(userId);

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

  /**
   * 将 Token 缓存到 Redis，TTL 由 expiresAt 决定
   */
  private async cacheTokenToRedis(userId: number, accessToken: string, expiresAt: number): Promise<void> {
    try {
      const redis = getRedis();
      const ttlSeconds = Math.floor((expiresAt - Date.now()) / 1000);
      if (ttlSeconds > 0) {
        await redis.setex(REDIS_TOKEN_KEY(userId), ttlSeconds, accessToken);
      }
    } catch {
      // Redis 写入失败不影响主流程
    }
  }
}

export const userAuthConfigService = new UserAuthConfigService();
