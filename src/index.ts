import { DouyinClient } from './api/douyin-client';
import { DouyinAuth, OAUTH_SCOPES } from './api/auth';
import { PublishService } from './services/publish-service';
import { SchedulerService } from './services/scheduler-service';
import {
  DouyinConfig,
  PublishTaskConfig,
  PublishResult,
  ScheduleResult,
  VideoPublishOptions,
  UploadProgress,
  TokenInfo,
} from './models/types';
import { createLogger } from './utils/logger';

// 导出所有类型
export * from './models/types';
export { DouyinClient, DouyinAuth, OAUTH_SCOPES };
export { PublishService, SchedulerService };
export { createLogger };

const logger = createLogger('ClawPublisher');

/**
 * ClawPublisher - 抖音视频发布主类
 * 
 * 提供统一的对外接口，供 ClawBot 或其他系统集成调用
 */
export class ClawPublisher {
  private client: DouyinClient;
  private auth: DouyinAuth;
  private publishService: PublishService;
  private schedulerService: SchedulerService;

  /**
   * 创建 ClawPublisher 实例
   * @param config 抖音配置
   */
  constructor(config: DouyinConfig) {
    // 初始化客户端
    this.client = new DouyinClient();

    // 初始化认证模块
    const oauthConfig = {
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    };
    this.auth = new DouyinAuth(this.client, oauthConfig);

    // 如果有预置的 token，设置它
    if (config.accessToken && config.refreshToken && config.openId) {
      this.auth.setTokenInfo({
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: Date.now() + 7200 * 1000, // 默认 2 小时
        openId: config.openId,
        scope: '',
      });
    }

    // 初始化服务
    this.publishService = new PublishService(this.client, this.auth);
    this.schedulerService = new SchedulerService(this.publishService);

    logger.info('ClawPublisher 初始化完成');
  }

  // ==================== 认证相关 ====================

  /**
   * 获取授权页面 URL
   * @param scopes 授权作用域
   * @param state 状态参数
   * @returns 授权 URL
   */
  getAuthUrl(scopes?: string[], state?: string): string {
    return this.auth.getAuthorizationUrl(scopes, state);
  }

  /**
   * 处理授权回调，获取 Token
   * @param code 授权码
   * @returns Token 信息
   */
  async handleAuthCallback(code: string): Promise<TokenInfo> {
    return this.auth.getAccessToken(code);
  }

  /**
   * 刷新 Token
   * @returns 新的 Token 信息
   */
  async refreshToken(): Promise<TokenInfo> {
    return this.auth.refreshAccessToken();
  }

  /**
   * 检查 Token 是否有效
   * @returns 是否有效
   */
  isTokenValid(): boolean {
    return this.auth.isTokenValid();
  }

  /**
   * 获取当前 Token 信息
   * @returns Token 信息
   */
  getTokenInfo(): TokenInfo | null {
    return this.auth.getTokenInfo();
  }

  // ==================== 视频上传 ====================

  /**
   * 上传视频文件
   * @param filePath 视频文件路径
   * @param onProgress 进度回调
   * @returns 视频 ID
   */
  async uploadVideo(
    filePath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    return this.publishService.uploadVideo(filePath, onProgress);
  }

  /**
   * 从 URL 上传视频
   * @param videoUrl 视频 URL
   * @returns 视频 ID
   */
  async uploadFromUrl(videoUrl: string): Promise<string> {
    return this.publishService.publishVideo({
      videoPath: videoUrl,
      isRemoteUrl: true,
    }).then(result => {
      if (!result.success || !result.videoId) {
        throw new Error(result.error || '上传失败');
      }
      return result.videoId;
    });
  }

  // ==================== 视频发布 ====================

  /**
   * 发布视频（上传 + 发布）
   * @param config 发布任务配置
   * @returns 发布结果
   */
  async publishVideo(config: PublishTaskConfig): Promise<PublishResult> {
    return this.publishService.publishVideo(config);
  }

  /**
   * 发布已上传的视频
   * @param videoId 视频 ID
   * @param options 发布选项
   * @returns 发布结果
   */
  async publishUploadedVideo(
    videoId: string,
    options?: VideoPublishOptions
  ): Promise<PublishResult> {
    return this.publishService.publishUploadedVideo(videoId, options);
  }

  /**
   * 下载远程视频并发布
   * @param videoUrl 视频 URL
   * @param options 发布选项
   * @returns 发布结果
   */
  async downloadAndPublish(
    videoUrl: string,
    options?: VideoPublishOptions
  ): Promise<PublishResult> {
    return this.publishService.downloadAndPublish(videoUrl, options);
  }

  // ==================== 定时发布 ====================

  /**
   * 定时发布视频
   * @param config 发布任务配置
   * @param publishTime 发布时间
   * @returns 任务信息
   */
  scheduleVideo(config: PublishTaskConfig, publishTime: Date): ScheduleResult {
    return this.schedulerService.schedulePublish(config, publishTime);
  }

  /**
   * 取消定时任务
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelSchedule(taskId: string): boolean {
    return this.schedulerService.cancelSchedule(taskId);
  }

  /**
   * 列出所有定时任务
   * @returns 任务列表
   */
  listScheduledTasks(): ScheduleResult[] {
    return this.schedulerService.listScheduledTasks();
  }

  // ==================== 视频管理 ====================

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
    return this.publishService.queryVideoStatus(videoId);
  }

  /**
   * 删除视频
   * @param videoId 视频 ID
   */
  async deleteVideo(videoId: string): Promise<void> {
    return this.publishService.deleteVideo(videoId);
  }

  // ==================== 工具方法 ====================

  /**
   * 停止所有定时任务
   */
  stop(): void {
    this.schedulerService.stopAll();
    logger.info('ClawPublisher 已停止');
  }
}

// 默认导出
export default ClawPublisher;
