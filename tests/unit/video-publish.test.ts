import { DouyinClient } from '../../src/api/douyin-client';
import { DouyinAuth } from '../../src/api/auth';
import { VideoPublish } from '../../src/api/video-publish';
import { mockVideoCreateResponse, mockVideoStatusResponse } from '../fixtures/mock-responses';

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

describe('VideoPublish', () => {
  let client: DouyinClient;
  let auth: DouyinAuth;
  let videoPublish: VideoPublish;

  const mockConfig = {
    clientKey: 'test_client_key',
    clientSecret: 'test_client_secret',
    redirectUri: 'https://example.com/callback',
  };

  beforeEach(() => {
    client = new DouyinClient();
    auth = new DouyinAuth(client, mockConfig);
    videoPublish = new VideoPublish(client, auth);

    // 设置 mock token
    auth.setTokenInfo({
      accessToken: 'test_token',
      refreshToken: 'test_refresh',
      expiresAt: Date.now() + 3600 * 1000,
      openId: 'test_open_id',
      scope: 'video.create',
    });

    jest.clearAllMocks();
  });

  describe('createVideo', () => {
    it('应该成功创建视频', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      const result = await videoPublish.createVideo('test_video_id');

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          open_id: 'test_open_id',
          video_id: 'test_video_id',
        })
      );

      expect(result.data.video_id).toBe(mockVideoCreateResponse.data.video_id);
    });

    it('应该支持标题', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        title: '测试标题',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          title: '测试标题',
        })
      );
    });

    it('应该支持描述和 hashtag', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        description: '测试描述',
        hashtags: ['美食', '旅行'],
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          description: '测试描述 #美食 #旅行',
        })
      );
    });

    it('应该支持 @提及用户', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        atUsers: ['user1', 'user2'],
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          at_users: ['user1', 'user2'],
        })
      );
    });

    it('应该支持地理位置', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        poiId: 'poi_123',
        poiName: '北京天安门',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          poi_id: 'poi_123',
          poi_name: '北京天安门',
        })
      );
    });

    it('应该支持小程序挂载', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        microAppId: 'app_123',
        microAppTitle: '小程序标题',
        microAppUrl: 'https://example.com/app',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          micro_app_id: 'app_123',
          micro_app_title: '小程序标题',
          micro_app_url: 'https://example.com/app',
        })
      );
    });

    it('应该支持商品链接', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);

      await videoPublish.createVideo('test_video_id', {
        articleId: 'article_123',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          article_id: 'article_123',
        })
      );
    });

    it('应该支持定时发布', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoCreateResponse.data);
      const scheduleTime = Math.floor(Date.now() / 1000) + 3600;

      await videoPublish.createVideo('test_video_id', {
        schedulePublishTime: scheduleTime,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/create/',
        expect.objectContaining({
          schedule_publish_time: scheduleTime,
        })
      );
    });

    it('应该验证参数并拒绝无效输入', async () => {
      await expect(
        videoPublish.createVideo('test_video_id', {
          title: 'a'.repeat(56), // 超过长度限制
        })
      ).rejects.toThrow();
    });
  });

  describe('queryVideoStatus', () => {
    it('应该成功查询视频状态', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue(mockVideoStatusResponse.data);

      const result = await videoPublish.queryVideoStatus('test_video_id');

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/data/',
        expect.objectContaining({
          open_id: 'test_open_id',
          video_id: 'test_video_id',
        })
      );

      expect(result.status).toBe(mockVideoStatusResponse.data.status);
      expect(result.shareUrl).toBe(mockVideoStatusResponse.data.share_url);
    });
  });

  describe('deleteVideo', () => {
    it('应该成功删除视频', async () => {
      const mockPost = jest.spyOn(client, 'post').mockResolvedValue({});

      await videoPublish.deleteVideo('test_video_id');

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v2/video/delete/',
        expect.objectContaining({
          open_id: 'test_open_id',
          video_id: 'test_video_id',
        })
      );
    });
  });
});
