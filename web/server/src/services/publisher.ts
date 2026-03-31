import { ClawPublisher } from '../../../../src/index';
import { DouyinConfig, PublishTaskConfig, VideoPublishOptions, PublishStep, PublishResultExtended, ScheduleResultExtended } from '../../../../src/models/types';
import { appConfigService } from './app-config-service';

// 全局 publisher 实例
let publisher: ClawPublisher | null = null;
// 全局配置存储
let currentConfig: DouyinConfig | null = null;

/**
 * 从环境变量初始化 Publisher
 * @returns 是否成功加载配置
 */
export function initPublisherFromEnv(): boolean {
  const storedConfig = appConfigService.getDouyinConfig();
  if (storedConfig) {
    setPublisher(storedConfig);
    return true;
  }

  const clientKey = process.env.DOUYIN_CLIENT_KEY;
  const clientSecret = process.env.DOUYIN_CLIENT_SECRET;
  const redirectUri = process.env.DOUYIN_REDIRECT_URI;
  const accessToken = process.env.DOUYIN_ACCESS_TOKEN;
  const refreshToken = process.env.DOUYIN_REFRESH_TOKEN;
  const openId = process.env.DOUYIN_OPEN_ID;
  const expiresAtRaw = process.env.DOUYIN_TOKEN_EXPIRES_AT;
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : undefined;

  if (clientKey && clientSecret && redirectUri && 
      clientKey !== 'your_douyin_client_key') {
    const config: DouyinConfig = {
      clientKey,
      clientSecret,
      redirectUri,
      accessToken: accessToken || undefined,
      refreshToken: refreshToken || undefined,
      openId: openId || undefined,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    };
    setPublisher(config);
    return true;
  }

  return false;
}

/**
 * 初始化或获取 Publisher 实例
 */
export function getPublisher(config?: DouyinConfig): ClawPublisher {
  if (!publisher && config) {
    publisher = new ClawPublisher(config);
  }
  if (!publisher) {
    throw new Error('Publisher 未初始化，请先配置认证信息');
  }
  return publisher;
}

/**
 * 设置 Publisher 配置
 */
export function setPublisher(config: DouyinConfig): ClawPublisher {
  currentConfig = config;
  publisher = new ClawPublisher(config);
  return publisher;
}

/**
 * 获取当前配置
 */
export function getPublisherConfig(): DouyinConfig | null {
  return currentConfig;
}

/**
 * 检查 publisher 是否已初始化
 */
export function isPublisherInitialized(): boolean {
  return publisher !== null;
}

/**
 * 检查是否已配置基本信息
 */
export function hasPublisherConfig(): boolean {
  return currentConfig !== null && 
    !!currentConfig.clientKey && 
    !!currentConfig.clientSecret && 
    !!currentConfig.redirectUri;
}

/**
 * 获取当前配置状态
 */
export function getPublisherStatus(): {
  initialized: boolean;
  hasValidToken: boolean;
  tokenInfo: ReturnType<ClawPublisher['getTokenInfo']>;
} {
  if (!publisher) {
    return {
      initialized: false,
      hasValidToken: false,
      tokenInfo: null,
    };
  }

  return {
    initialized: true,
    hasValidToken: publisher.isTokenValid(),
    tokenInfo: publisher.getTokenInfo(),
  };
}

/**
 * 发布视频
 */
export async function publishVideo(
  videoPath: string,
  options?: VideoPublishOptions,
  isRemoteUrl: boolean = false
) {
  const pub = getPublisher();
  return pub.publishVideo({
    videoPath,
    options,
    isRemoteUrl,
  });
}

/**
 * 定时发布视频
 */
export function schedulePublish(
  videoPath: string,
  publishTime: Date,
  options?: VideoPublishOptions,
  isRemoteUrl: boolean = false
) {
  const pub = getPublisher();
  return pub.scheduleVideo(
    {
      videoPath,
      options,
      isRemoteUrl,
    },
    publishTime
  );
}

/**
 * 获取任务列表
 */
export function getScheduledTasks() {
  const pub = getPublisher();
  return pub.listScheduledTasks();
}

/**
 * 取消定时任务
 */
export function cancelScheduledTask(taskId: string): boolean {
  const pub = getPublisher();
  return pub.cancelSchedule(taskId);
}

/**
 * 上传视频
 */
export async function uploadVideo(
  filePath: string,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
) {
  const pub = getPublisher();
  return pub.uploadVideo(filePath, onProgress);
}

/**
 * 从 URL 上传
 */
export async function uploadFromUrl(videoUrl: string) {
  const pub = getPublisher();
  return pub.uploadFromUrl(videoUrl);
}

/**
 * 刷新 Token
 */
export async function refreshToken() {
  const pub = getPublisher();
  return pub.refreshToken();
}

/**
 * 获取任务详情
 */
export function getTaskDetail(taskId: string): ScheduleResultExtended | null {
  const pub = getPublisher();
  return pub.getTaskDetail(taskId);
}

/**
 * 重试失败的任务
 */
export async function retryTask(
  taskId: string,
  fromStep?: PublishStep
): Promise<PublishResultExtended> {
  const pub = getPublisher();
  return pub.retryTask(taskId, fromStep);
}
