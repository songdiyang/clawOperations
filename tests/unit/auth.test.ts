import { DouyinClient } from '../../src/api/douyin-client';
import { DouyinAuth, OAUTH_SCOPES } from '../../src/api/auth';
import { mockTokenResponse, mockRefreshTokenResponse } from '../fixtures/mock-responses';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
}));

describe('DouyinAuth', () => {
  let client: DouyinClient;
  let auth: DouyinAuth;
  const mockConfig = {
    clientKey: 'test_client_key',
    clientSecret: 'test_client_secret',
    redirectUri: 'https://example.com/callback',
  };

  beforeEach(() => {
    client = new DouyinClient();
    auth = new DouyinAuth(client, mockConfig);
    jest.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('应该生成正确的授权 URL', () => {
      const url = auth.getAuthorizationUrl();
      
      expect(url).toContain('https://open.douyin.com/platform/oauth/connect/');
      expect(url).toContain(`client_key=${mockConfig.clientKey}`);
      expect(url).toContain('response_type=code');
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
    });

    it('应该包含默认的作用域', () => {
      const url = auth.getAuthorizationUrl();
      
      expect(url).toContain('scope=');
      expect(url).toContain('video.create');
      expect(url).toContain('video.upload');
    });

    it('应该支持自定义作用域', () => {
      const customScopes = ['user.info', 'video.data'];
      const url = auth.getAuthorizationUrl(customScopes);
      
      expect(url).toContain('user.info');
      expect(url).toContain('video.data');
    });

    it('应该支持 state 参数', () => {
      const state = 'test_state_123';
      const url = auth.getAuthorizationUrl(undefined, state);
      
      expect(url).toContain(`state=${state}`);
    });
  });

  describe('getAccessToken', () => {
    it('应该成功获取 token', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockTokenResponse.data);
      
      const result = await auth.getAccessToken('test_auth_code');
      
      expect(mockPost).toHaveBeenCalledWith(
        '/oauth/access_token/',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            client_key: mockConfig.clientKey,
            client_secret: mockConfig.clientSecret,
            code: 'test_auth_code',
            grant_type: 'authorization_code',
          }),
        })
      );
      
      expect(result.accessToken).toBe(mockTokenResponse.data.access_token);
      expect(result.refreshToken).toBe(mockTokenResponse.data.refresh_token);
      expect(result.openId).toBe(mockTokenResponse.data.open_id);
    });

    it('应该在获取 token 后设置到 client', async () => {
      const mockSetToken = jest.spyOn(client, 'setAccessToken');
      jest.spyOn(client, 'post').mockResolvedValue(mockTokenResponse.data);
      
      await auth.getAccessToken('test_auth_code');
      
      expect(mockSetToken).toHaveBeenCalledWith(mockTokenResponse.data.access_token);
    });
  });

  describe('refreshAccessToken', () => {
    it('应该成功刷新 token', async () => {
      // 先设置初始 token
      auth.setTokenInfo({
        accessToken: 'old_token',
        refreshToken: 'old_refresh_token',
        expiresAt: Date.now() - 1000, // 已过期
        openId: 'test_open_id',
        scope: 'video.create',
      });

      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockRefreshTokenResponse.data);
      
      const result = await auth.refreshAccessToken();
      
      expect(mockPost).toHaveBeenCalledWith(
        '/oauth/refresh_token/',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            client_key: mockConfig.clientKey,
            refresh_token: 'old_refresh_token',
            grant_type: 'refresh_token',
          }),
        })
      );
      
      expect(result.accessToken).toBe(mockRefreshTokenResponse.data.access_token);
    });

    it('没有 refresh_token 时应该抛出错误', async () => {
      await expect(auth.refreshAccessToken()).rejects.toThrow('没有可用的 refresh_token');
    });
  });

  describe('isTokenValid', () => {
    it('没有 token 时应该返回 false', () => {
      expect(auth.isTokenValid()).toBe(false);
    });

    it('未过期的 token 应该返回 true', () => {
      auth.setTokenInfo({
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600 * 1000, // 1小时后过期
        openId: 'test_open_id',
        scope: 'video.create',
      });

      expect(auth.isTokenValid()).toBe(true);
    });

    it('已过期的 token 应该返回 false', () => {
      auth.setTokenInfo({
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() - 1000, // 已过期
        openId: 'test_open_id',
        scope: 'video.create',
      });

      expect(auth.isTokenValid()).toBe(false);
    });

    it('即将过期的 token 应该返回 false（提前5分钟）', () => {
      auth.setTokenInfo({
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3 * 60 * 1000, // 3分钟后过期（小于5分钟缓冲）
        openId: 'test_open_id',
        scope: 'video.create',
      });

      expect(auth.isTokenValid()).toBe(false);
    });
  });

  describe('ensureTokenValid', () => {
    it('token 有效时不应该刷新', async () => {
      auth.setTokenInfo({
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600 * 1000,
        openId: 'test_open_id',
        scope: 'video.create',
      });

      const mockRefresh = jest.spyOn(auth, 'refreshAccessToken').mockResolvedValue({
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresAt: Date.now() + 7200 * 1000,
        openId: 'test_open_id',
        scope: 'video.create',
      });

      await auth.ensureTokenValid();

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('token 过期时应该自动刷新', async () => {
      auth.setTokenInfo({
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() - 1000,
        openId: 'test_open_id',
        scope: 'video.create',
      });

      const mockRefresh = jest.spyOn(auth, 'refreshAccessToken').mockResolvedValue({
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresAt: Date.now() + 7200 * 1000,
        openId: 'test_open_id',
        scope: 'video.create',
      });

      await auth.ensureTokenValid();

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('OAUTH_SCOPES', () => {
    it('应该包含所有必要的作用域', () => {
      expect(OAUTH_SCOPES.VIDEO_CREATE).toBe('video.create');
      expect(OAUTH_SCOPES.VIDEO_UPLOAD).toBe('video.upload');
      expect(OAUTH_SCOPES.VIDEO_DATA).toBe('video.data');
      expect(OAUTH_SCOPES.USER_INFO).toBe('user.info');
    });
  });
});
