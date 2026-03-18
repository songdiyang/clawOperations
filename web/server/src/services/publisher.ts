import { ClawPublisher } from '../../../../src/index';
import { DouyinConfig, PublishTaskConfig, VideoPublishOptions } from '../../../../src/models/types';

// 全局 publisher 实例
let publisher: ClawPublisher | null = null;

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
  publisher = new ClawPublisher(config);
  return publisher;
}

/**
 * 检查 publisher 是否已初始化
 */
export function isPublisherInitialized(): boolean {
  return publisher !== null;
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
