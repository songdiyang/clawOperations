import { DouyinConfig } from '../../../../src/models/types';
import { getDatabase } from '../database';

export interface AIConfig {
  deepseekApiKey: string | null;
}

class AppConfigService {
  getDouyinConfig(): DouyinConfig | null {
    const db = getDatabase();
    const raw = db.get('app_config.douyin').value();

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

  setDouyinConfig(config: Partial<DouyinConfig>): DouyinConfig | null {
    const db = getDatabase();
    const updates: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

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

    db.get('app_config.douyin').assign(updates).write();
    return this.getDouyinConfig();
  }

  getAIConfig(): AIConfig {
    const db = getDatabase();
    const raw = db.get('app_config.ai').value();
    return {
      deepseekApiKey: raw?.deepseek_api_key || null,
    };
  }

  setAIConfig(config: Partial<AIConfig>): AIConfig {
    const db = getDatabase();
    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (config.deepseekApiKey !== undefined) {
      updates.deepseek_api_key = config.deepseekApiKey || null;
    }

    db.get('app_config.ai').assign(updates).write();
    return this.getAIConfig();
  }

  getAIStatus(): { deepseekConfigured: boolean } {
    const config = this.getAIConfig();
    return {
      deepseekConfigured: Boolean(config.deepseekApiKey),
    };
  }
}

export const appConfigService = new AppConfigService();
