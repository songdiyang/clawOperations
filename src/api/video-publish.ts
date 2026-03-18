import { DouyinClient } from './douyin-client';
import { DouyinAuth } from './auth';
import {
  VideoPublishOptions,
  VideoCreateResponse,
} from '../models/types';
import { validatePublishOptions, formatHashtags } from '../utils/validator';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoPublish');

/**
 * 视频发布模块
 */
export class VideoPublish {
  private client: DouyinClient;
  private auth: DouyinAuth;

  constructor(client: DouyinClient, auth: DouyinAuth) {
    this.client = client;
    this.auth = auth;
  }

  /**
   * 创建并发布视频
   * @param videoId 视频 ID（上传后获得）
   * @param options 发布选项
   * @returns 发布结果
   */
  async createVideo(videoId: string, options?: VideoPublishOptions): Promise<VideoCreateResponse> {
    // 确保 token 有效
    await this.auth.ensureTokenValid();

    // 验证发布选项
    validatePublishOptions(options);

    logger.info(`开始创建视频，video_id: ${videoId}`);

    // 构建请求参数
    const params = this.buildPublishParams(videoId, options);

    try {
      const response = await this.client.post<VideoCreateResponse['data']>(
        '/api/v2/video/create/',
        params
      );

      logger.info(`视频创建成功，video_id: ${response.video_id}`);
      return { data: response };
    } catch (error) {
      logger.error(`视频创建失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 构建发布参数
   * @param videoId 视频 ID
   * @param options 发布选项
   * @returns API 请求参数
   */
  private buildPublishParams(videoId: string, options?: VideoPublishOptions): Record<string, unknown> {
    const openId = this.auth.getTokenInfo()?.openId;
    
    const params: Record<string, unknown> = {
      open_id: openId,
      video_id: videoId,
    };

    if (!options) {
      return params;
    }

    // 标题
    if (options.title) {
      params.title = options.title;
    }

    // 描述（包含 hashtag）
    let description = options.description || '';
    if (options.hashtags && options.hashtags.length > 0) {
      const hashtagStr = formatHashtags(options.hashtags);
      description = description ? `${description} ${hashtagStr}` : hashtagStr;
    }
    if (description) {
      params.description = description;
    }

    // @提及用户
    if (options.atUsers && options.atUsers.length > 0) {
      params.at_users = options.atUsers;
    }

    // 地理位置
    if (options.poiId) {
      params.poi_id = options.poiId;
    }
    if (options.poiName) {
      params.poi_name = options.poiName;
    }

    // 小程序挂载
    if (options.microAppId) {
      params.micro_app_id = options.microAppId;
    }
    if (options.microAppTitle) {
      params.micro_app_title = options.microAppTitle;
    }
    if (options.microAppUrl) {
      params.micro_app_url = options.microAppUrl;
    }

    // 商品链接
    if (options.articleId) {
      params.article_id = options.articleId;
    }

    // 定时发布
    if (options.schedulePublishTime) {
      params.schedule_publish_time = options.schedulePublishTime;
      logger.info(`设置定时发布时间: ${new Date(options.schedulePublishTime * 1000).toLocaleString()}`);
    }

    return params;
  }

  /**
   * 查询视频状态
   * @param videoId 视频 ID
   * @returns 视频状态
   */
  async queryVideoStatus(videoId: string): Promise<{
    status: string;
    shareUrl?: string;
    createTime?: number;
  }> {
    await this.auth.ensureTokenValid();
    const openId = this.auth.getTokenInfo()?.openId;

    const response = await this.client.post<{
      status: string;
      share_url?: string;
      create_time?: number;
    }>('/api/v2/video/data/', {
      open_id: openId,
      video_id: videoId,
    });

    return {
      status: response.status,
      shareUrl: response.share_url,
      createTime: response.create_time,
    };
  }

  /**
   * 删除视频
   * @param videoId 视频 ID
   */
  async deleteVideo(videoId: string): Promise<void> {
    await this.auth.ensureTokenValid();
    const openId = this.auth.getTokenInfo()?.openId;

    await this.client.post('/api/v2/video/delete/', {
      open_id: openId,
      video_id: videoId,
    });

    logger.info(`视频已删除，video_id: ${videoId}`);
  }
}

export default VideoPublish;
