/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 自定义重试条件函数 */
  shouldRetry?: (error: Error) => boolean;
}

// ==================== 认证相关类型 ====================

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Token 响应
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
}

/**
 * Token 信息
 */
export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix 时间戳
  openId: string;
  scope: string;
}

// ==================== 视频上传相关类型 ====================

/**
 * 上传配置
 */
export interface UploadConfig {
  chunkSize?: number;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * 上传进度
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * 分片上传初始化响应
 */
export interface ChunkUploadInitResponse {
  data: {
    upload_id: string;
  };
}

/**
 * 分片上传响应
 */
export interface ChunkUploadPartResponse {
  data: {
    part_number: number;
    etag: string;
  };
}

/**
 * 上传完成响应
 */
export interface UploadCompleteResponse {
  data: {
    video_id: string;
    video_url?: string;
  };
}

// ==================== 视频发布相关类型 ====================

/**
 * 视频发布选项
 */
export interface VideoPublishOptions {
  /** 视频标题 */
  title?: string;
  /** 视频描述文案 */
  description?: string;
  /** 话题标签数组 */
  hashtags?: string[];
  /** @提及用户列表（open_id 数组） */
  atUsers?: string[];
  /** 地理位置 POI ID */
  poiId?: string;
  /** 地理位置名称 */
  poiName?: string;
  /** 小程序 ID（商业挂载） */
  microAppId?: string;
  /** 小程序标题 */
  microAppTitle?: string;
  /** 小程序链接 */
  microAppUrl?: string;
  /** 商品 ID（商业链接） */
  articleId?: string;
  /** 定时发布时间（Unix 时间戳） */
  schedulePublishTime?: number;
}

/**
 * 视频创建响应
 */
export interface VideoCreateResponse {
  data: {
    video_id: string;
    share_url?: string;
    create_time?: number;
  };
}

// ==================== 通用类型 ====================

/**
 * 抖音 API 通用响应
 */
export interface DouyinApiResponse<T> {
  data: T;
  message: string;
}

/**
 * 抖音 API 错误
 */
export interface DouyinApiError {
  code: number;
  message: string;
  log_id?: string;
}

// ==================== 发布服务相关类型 ====================

/**
 * 发布任务配置
 */
export interface PublishTaskConfig {
  /** 视频文件路径或 URL */
  videoPath: string;
  /** 发布选项 */
  options?: VideoPublishOptions;
  /** 是否为远程 URL */
  isRemoteUrl?: boolean;
}

/**
 * 发布结果
 */
export interface PublishResult {
  success: boolean;
  videoId?: string;
  shareUrl?: string;
  error?: string;
  createTime?: number;
}

/**
 * 定时发布结果
 */
export interface ScheduleResult {
  taskId: string;
  scheduledTime: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

/**
 * 抖音配置
 */
export interface DouyinConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
}
