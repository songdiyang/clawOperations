/**
 * 系统配置服务 - MySQL 版（读取使用内存缓存，写入同步到 MySQL + Redis）
 * 保持同步读取接口，方便 ai.ts 等模块直接使用
 */
import { RowDataPacket } from 'mysql2/promise';
import { getPool, getRedis, toMysqlDatetime } from '../database';

/** AI 配置接口 */
export interface AIConfig {
  deepseek_api_key: string | null;
  deepseek_base_url: string | null;
  doubao_api_key: string | null;
  doubao_base_url: string | null;
  doubao_endpoint_id_image: string | null;
  doubao_endpoint_id_video: string | null;
  updated_at: string | null;
}

/** 抖音配置接口 */
export interface DouyinConfig {
  client_key: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  access_token: string | null;
  refresh_token: string | null;
  open_id: string | null;
  expires_at: number | null;
  updated_at: string | null;
}

/** AI 配置更新 DTO */
export interface UpdateAIConfigDTO {
  deepseek_api_key?: string;
  deepseek_base_url?: string;
  doubao_api_key?: string;
  doubao_base_url?: string;
  doubao_endpoint_id_image?: string;
  doubao_endpoint_id_video?: string;
}

/** 抖音配置更新 DTO */
export interface UpdateDouyinConfigDTO {
  client_key?: string;
  client_secret?: string;
  redirect_uri?: string;
}

/** 脱敏的 AI 配置 */
export interface MaskedAIConfig {
  deepseek_api_key: string | null;
  deepseek_base_url: string | null;
  doubao_api_key: string | null;
  doubao_base_url: string | null;
  doubao_endpoint_id_image: string | null;
  doubao_endpoint_id_video: string | null;
  updated_at: string | null;
  has_deepseek_key: boolean;
  has_doubao_key: boolean;
}

/** 脱敏的抖音配置 */
export interface MaskedDouyinConfig {
  client_key: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  has_client_key: boolean;
  has_client_secret: boolean;
  has_tokens: boolean;
  updated_at: string | null;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  deepseek_api_key: null,
  deepseek_base_url: null,
  doubao_api_key: null,
  doubao_base_url: null,
  doubao_endpoint_id_image: null,
  doubao_endpoint_id_video: null,
  updated_at: null,
};

const DEFAULT_DOUYIN_CONFIG: DouyinConfig = {
  client_key: null,
  client_secret: null,
  redirect_uri: null,
  access_token: null,
  refresh_token: null,
  open_id: null,
  expires_at: null,
  updated_at: null,
};

const REDIS_AI_KEY = 'config:ai';
const REDIS_DOUYIN_KEY = 'config:douyin';
const REDIS_CONFIG_TTL = 300; // 5 分钟

function maskSensitiveField(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

/** 从 app_config 表读取单条配置（JSON） */
async function readConfigFromDB<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT config_value FROM app_config WHERE config_key = ?',
      [key]
    );
    if (rows.length > 0 && rows[0].config_value) {
      return JSON.parse(rows[0].config_value as string) as T;
    }
  } catch (err) {
    console.warn(`读取配置 ${key} 失败:`, err);
  }
  return defaultValue;
}

/** 写入 app_config 表（UPSERT） */
async function writeConfigToDB(key: string, value: object): Promise<void> {
  const pool = getPool();
  const now = toMysqlDatetime();
  await pool.execute(
    'INSERT INTO app_config (config_key, config_value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = VALUES(updated_at)',
    [key, JSON.stringify(value), now]
  );
}

/**
 * 系统配置服务类
 */
export class SystemConfigService {
  /** 内存缓存（同步读取使用） */
  private aiCache: AIConfig = { ...DEFAULT_AI_CONFIG };
  private douyinCache: DouyinConfig = { ...DEFAULT_DOUYIN_CONFIG };
  private cacheLoaded = false;

  /**
   * 启动时从 DB 加载配置到内存缓存（由 index.ts 调用）
   */
  async loadConfigToEnv(): Promise<void> {
    this.aiCache = await readConfigFromDB<AIConfig>('ai_config', { ...DEFAULT_AI_CONFIG });
    this.douyinCache = await readConfigFromDB<DouyinConfig>('douyin_config', { ...DEFAULT_DOUYIN_CONFIG });
    this.cacheLoaded = true;

    // 同步到 Redis 缓存
    try {
      const redis = getRedis();
      await redis.setex(REDIS_AI_KEY, REDIS_CONFIG_TTL, JSON.stringify(this.aiCache));
      await redis.setex(REDIS_DOUYIN_KEY, REDIS_CONFIG_TTL, JSON.stringify(this.douyinCache));
    } catch { /* Redis 不可用时忽略 */ }

    this.syncAIConfigToEnv(this.aiCache);
    this.syncDouyinConfigToEnv(this.douyinCache);
    console.log('✅ System config loaded from database');
  }

  /** 同步读取 AI 配置（从内存缓存） */
  getAIConfig(): AIConfig {
    return { ...this.aiCache };
  }

  /** 同步读取 AI 配置（脱敏） */
  getMaskedAIConfig(): MaskedAIConfig {
    const c = this.aiCache;
    return {
      deepseek_api_key: maskSensitiveField(c.deepseek_api_key),
      deepseek_base_url: c.deepseek_base_url,
      doubao_api_key: maskSensitiveField(c.doubao_api_key),
      doubao_base_url: c.doubao_base_url,
      doubao_endpoint_id_image: c.doubao_endpoint_id_image,
      doubao_endpoint_id_video: c.doubao_endpoint_id_video,
      updated_at: c.updated_at,
      has_deepseek_key: !!c.deepseek_api_key,
      has_doubao_key: !!c.doubao_api_key,
    };
  }

  /** 更新 AI 配置（写入 MySQL + 更新缓存） */
  async updateAIConfig(dto: UpdateAIConfigDTO): Promise<AIConfig> {
    const updated: AIConfig = {
      deepseek_api_key: dto.deepseek_api_key !== undefined ? dto.deepseek_api_key : this.aiCache.deepseek_api_key,
      deepseek_base_url: dto.deepseek_base_url !== undefined ? dto.deepseek_base_url : this.aiCache.deepseek_base_url,
      doubao_api_key: dto.doubao_api_key !== undefined ? dto.doubao_api_key : this.aiCache.doubao_api_key,
      doubao_base_url: dto.doubao_base_url !== undefined ? dto.doubao_base_url : this.aiCache.doubao_base_url,
      doubao_endpoint_id_image: dto.doubao_endpoint_id_image !== undefined ? dto.doubao_endpoint_id_image : this.aiCache.doubao_endpoint_id_image,
      doubao_endpoint_id_video: dto.doubao_endpoint_id_video !== undefined ? dto.doubao_endpoint_id_video : this.aiCache.doubao_endpoint_id_video,
      updated_at: new Date().toISOString(),
    };
    await writeConfigToDB('ai_config', updated);
    this.aiCache = updated;
    this.syncAIConfigToEnv(updated);

    try {
      const redis = getRedis();
      await redis.setex(REDIS_AI_KEY, REDIS_CONFIG_TTL, JSON.stringify(updated));
    } catch { /* Redis 不可用时忽略 */ }

    return updated;
  }

  /** 同步读取抖音配置（从内存缓存） */
  getDouyinConfig(): DouyinConfig {
    return { ...this.douyinCache };
  }

  /** 同步读取抖音配置（脱敏） */
  getMaskedDouyinConfig(): MaskedDouyinConfig {
    const c = this.douyinCache;
    return {
      client_key: maskSensitiveField(c.client_key),
      client_secret: maskSensitiveField(c.client_secret),
      redirect_uri: c.redirect_uri,
      has_client_key: !!c.client_key,
      has_client_secret: !!c.client_secret,
      has_tokens: !!c.access_token,
      updated_at: c.updated_at,
    };
  }

  /** 更新抖音配置（写入 MySQL + 更新缓存） */
  async updateDouyinConfig(dto: UpdateDouyinConfigDTO): Promise<DouyinConfig> {
    const updated: DouyinConfig = {
      ...this.douyinCache,
      client_key: dto.client_key !== undefined ? dto.client_key : this.douyinCache.client_key,
      client_secret: dto.client_secret !== undefined ? dto.client_secret : this.douyinCache.client_secret,
      redirect_uri: dto.redirect_uri !== undefined ? dto.redirect_uri : this.douyinCache.redirect_uri,
      updated_at: new Date().toISOString(),
    };
    await writeConfigToDB('douyin_config', updated);
    this.douyinCache = updated;
    this.syncDouyinConfigToEnv(updated);

    try {
      const redis = getRedis();
      await redis.setex(REDIS_DOUYIN_KEY, REDIS_CONFIG_TTL, JSON.stringify(updated));
    } catch { /* Redis 不可用时忽略 */ }

    return updated;
  }

  /**
   * 更新抖音 Token（不经由 DTO，直接更新 cache + DB）
   */
  async updateDouyinTokens(tokens: {
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    expires_at?: number;
  }): Promise<void> {
    const updated: DouyinConfig = {
      ...this.douyinCache,
      ...tokens,
      updated_at: new Date().toISOString(),
    };
    await writeConfigToDB('douyin_config', updated);
    this.douyinCache = updated;
  }

  private syncAIConfigToEnv(config: AIConfig): void {
    if (config.deepseek_api_key) process.env.DEEPSEEK_API_KEY = config.deepseek_api_key;
    if (config.deepseek_base_url) process.env.DEEPSEEK_BASE_URL = config.deepseek_base_url;
    if (config.doubao_api_key) process.env.DOUBAO_API_KEY = config.doubao_api_key;
    if (config.doubao_base_url) process.env.DOUBAO_BASE_URL = config.doubao_base_url;
    if (config.doubao_endpoint_id_image) process.env.DOUBAO_ENDPOINT_ID_IMAGE = config.doubao_endpoint_id_image;
    if (config.doubao_endpoint_id_video) process.env.DOUBAO_ENDPOINT_ID_VIDEO = config.doubao_endpoint_id_video;
    console.log('🔄 AI config synced to environment variables');
  }

  private syncDouyinConfigToEnv(config: DouyinConfig): void {
    if (config.client_key) process.env.DOUYIN_CLIENT_KEY = config.client_key;
    if (config.client_secret) process.env.DOUYIN_CLIENT_SECRET = config.client_secret;
    if (config.redirect_uri) process.env.DOUYIN_REDIRECT_URI = config.redirect_uri;
    console.log('🔄 Douyin config synced to environment variables');
  }
}

export const systemConfigService = new SystemConfigService();
