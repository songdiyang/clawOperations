/**
 * 应用配置服务 - MySQL 版
 * 简化接口，代理 systemConfigService 的核心方法
 * 保持同步读取（内存缓存），异步写入
 */
import { DouyinConfig } from '../../../../src/models/types';
import { systemConfigService } from './system-config-service';

export interface AIConfig {
  deepseekApiKey: string | null;
}

class AppConfigService {
  getDouyinConfig(): DouyinConfig | null {
    const raw = systemConfigService.getDouyinConfig();
    if (!raw?.client_key || !raw?.client_secret || !raw?.redirect_uri) {
      return null;
    }
    return {
      clientKey: raw.client_key,
      clientSecret: raw.client_secret,
      redirectUri: raw.redirect_uri,
      accessToken: raw.access_token || undefined,
      refreshToken: raw.refresh_token || undefined,
      openId: raw.open_id || undefined,
      expiresAt: raw.expires_at || undefined,
    };
  }

  async setDouyinConfig(config: Partial<DouyinConfig>): Promise<DouyinConfig | null> {
    const updates: Record<string, string | number | null> = {};
    if (config.clientKey !== undefined) updates.client_key = config.clientKey || null;
    if (config.clientSecret !== undefined) updates.client_secret = config.clientSecret || null;
    if (config.redirectUri !== undefined) updates.redirect_uri = config.redirectUri || null;
    if (config.accessToken !== undefined) updates.access_token = config.accessToken || null;
    if (config.refreshToken !== undefined) updates.refresh_token = config.refreshToken || null;
    if (config.openId !== undefined) updates.open_id = config.openId || null;
    if (config.expiresAt !== undefined) updates.expires_at = config.expiresAt || null;

    // 直接更新系统配置服务的缓存，并持久化
    const current = systemConfigService.getDouyinConfig();
    const merged = { ...current, ...updates };
    // 写入 MySQL
    await systemConfigService.updateDouyinTokens({
      access_token: (merged.access_token as string) || undefined,
      refresh_token: (merged.refresh_token as string) || undefined,
      open_id: (merged.open_id as string) || undefined,
      expires_at: (merged.expires_at as number) || undefined,
    });

    // 如果有基本配置字段，通过 updateDouyinConfig 写入
    if (config.clientKey !== undefined || config.clientSecret !== undefined || config.redirectUri !== undefined) {
      await systemConfigService.updateDouyinConfig({
        client_key: config.clientKey || undefined,
        client_secret: config.clientSecret || undefined,
        redirect_uri: config.redirectUri || undefined,
      });
    }

    return this.getDouyinConfig();
  }

  getAIConfig(): AIConfig {
    const raw = systemConfigService.getAIConfig();
    return {
      deepseekApiKey: raw?.deepseek_api_key || null,
    };
  }

  async setAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    if (config.deepseekApiKey !== undefined) {
      await systemConfigService.updateAIConfig({
        deepseek_api_key: config.deepseekApiKey || undefined,
      });
    }
    return this.getAIConfig();
  }

  getAIStatus(): { deepseekConfigured: boolean } {
    return {
      deepseekConfigured: Boolean(this.getAIConfig().deepseekApiKey),
    };
  }
}

export const appConfigService = new AppConfigService();
