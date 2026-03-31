/**
 * 系统配置服务
 * 管理 AI 配置、抖音配置等系统级配置
 */

import { getDatabase, saveDatabase } from '../database';

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

/** 脱敏的 AI 配置（用于前端显示） */
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

/**
 * 对敏感字段进行脱敏处理
 */
function maskSensitiveField(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

/**
 * 系统配置服务类
 */
export class SystemConfigService {
  /**
   * 获取 AI 配置（完整，仅内部使用）
   */
  getAIConfig(): AIConfig {
    const db = getDatabase();
    const config = db.get('app_config.ai').value();
    return config as AIConfig;
  }

  /**
   * 获取 AI 配置（脱敏，用于前端）
   */
  getMaskedAIConfig(): MaskedAIConfig {
    const config = this.getAIConfig();
    return {
      deepseek_api_key: maskSensitiveField(config.deepseek_api_key),
      deepseek_base_url: config.deepseek_base_url,
      doubao_api_key: maskSensitiveField(config.doubao_api_key),
      doubao_base_url: config.doubao_base_url,
      doubao_endpoint_id_image: config.doubao_endpoint_id_image,
      doubao_endpoint_id_video: config.doubao_endpoint_id_video,
      updated_at: config.updated_at,
      has_deepseek_key: !!config.deepseek_api_key,
      has_doubao_key: !!config.doubao_api_key,
    };
  }

  /**
   * 更新 AI 配置
   */
  updateAIConfig(dto: UpdateAIConfigDTO): AIConfig {
    const db = getDatabase();
    const currentConfig = this.getAIConfig();

    const updatedConfig: AIConfig = {
      deepseek_api_key: dto.deepseek_api_key !== undefined ? dto.deepseek_api_key : currentConfig.deepseek_api_key,
      deepseek_base_url: dto.deepseek_base_url !== undefined ? dto.deepseek_base_url : currentConfig.deepseek_base_url,
      doubao_api_key: dto.doubao_api_key !== undefined ? dto.doubao_api_key : currentConfig.doubao_api_key,
      doubao_base_url: dto.doubao_base_url !== undefined ? dto.doubao_base_url : currentConfig.doubao_base_url,
      doubao_endpoint_id_image: dto.doubao_endpoint_id_image !== undefined ? dto.doubao_endpoint_id_image : currentConfig.doubao_endpoint_id_image,
      doubao_endpoint_id_video: dto.doubao_endpoint_id_video !== undefined ? dto.doubao_endpoint_id_video : currentConfig.doubao_endpoint_id_video,
      updated_at: new Date().toISOString(),
    };

    db.set('app_config.ai', updatedConfig).write();

    // 同步更新环境变量（运行时生效）
    this.syncAIConfigToEnv(updatedConfig);

    return updatedConfig;
  }

  /**
   * 同步 AI 配置到环境变量
   */
  private syncAIConfigToEnv(config: AIConfig): void {
    if (config.deepseek_api_key) {
      process.env.DEEPSEEK_API_KEY = config.deepseek_api_key;
    }
    if (config.deepseek_base_url) {
      process.env.DEEPSEEK_BASE_URL = config.deepseek_base_url;
    }
    if (config.doubao_api_key) {
      process.env.DOUBAO_API_KEY = config.doubao_api_key;
    }
    if (config.doubao_base_url) {
      process.env.DOUBAO_BASE_URL = config.doubao_base_url;
    }
    if (config.doubao_endpoint_id_image) {
      process.env.DOUBAO_ENDPOINT_ID_IMAGE = config.doubao_endpoint_id_image;
    }
    if (config.doubao_endpoint_id_video) {
      process.env.DOUBAO_ENDPOINT_ID_VIDEO = config.doubao_endpoint_id_video;
    }
    console.log('🔄 AI config synced to environment variables');
  }

  /**
   * 获取抖音配置（完整）
   */
  getDouyinConfig(): DouyinConfig {
    const db = getDatabase();
    const config = db.get('app_config.douyin').value();
    return config as DouyinConfig;
  }

  /**
   * 获取抖音配置（脱敏）
   */
  getMaskedDouyinConfig(): MaskedDouyinConfig {
    const config = this.getDouyinConfig();
    return {
      client_key: maskSensitiveField(config.client_key),
      client_secret: maskSensitiveField(config.client_secret),
      redirect_uri: config.redirect_uri,
      has_client_key: !!config.client_key,
      has_client_secret: !!config.client_secret,
      has_tokens: !!config.access_token,
      updated_at: config.updated_at,
    };
  }

  /**
   * 更新抖音配置
   */
  updateDouyinConfig(dto: UpdateDouyinConfigDTO): DouyinConfig {
    const db = getDatabase();
    const currentConfig = this.getDouyinConfig();

    const updatedConfig: DouyinConfig = {
      ...currentConfig,
      client_key: dto.client_key !== undefined ? dto.client_key : currentConfig.client_key,
      client_secret: dto.client_secret !== undefined ? dto.client_secret : currentConfig.client_secret,
      redirect_uri: dto.redirect_uri !== undefined ? dto.redirect_uri : currentConfig.redirect_uri,
      updated_at: new Date().toISOString(),
    };

    db.set('app_config.douyin', updatedConfig).write();

    // 同步更新环境变量
    this.syncDouyinConfigToEnv(updatedConfig);

    return updatedConfig;
  }

  /**
   * 同步抖音配置到环境变量
   */
  private syncDouyinConfigToEnv(config: DouyinConfig): void {
    if (config.client_key) {
      process.env.DOUYIN_CLIENT_KEY = config.client_key;
    }
    if (config.client_secret) {
      process.env.DOUYIN_CLIENT_SECRET = config.client_secret;
    }
    if (config.redirect_uri) {
      process.env.DOUYIN_REDIRECT_URI = config.redirect_uri;
    }
    console.log('🔄 Douyin config synced to environment variables');
  }

  /**
   * 启动时从数据库加载配置到环境变量
   */
  loadConfigToEnv(): void {
    const aiConfig = this.getAIConfig();
    const douyinConfig = this.getDouyinConfig();

    this.syncAIConfigToEnv(aiConfig);
    this.syncDouyinConfigToEnv(douyinConfig);

    console.log('✅ System config loaded from database');
  }
}

// 导出单例
export const systemConfigService = new SystemConfigService();
