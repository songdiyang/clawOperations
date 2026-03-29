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
  open_id?: string;  // 抽音 API 可能返回 open_id 或 openid
  openid?: string;   // 兼容两种格式
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
 * 抹音配置
 */
export interface DouyinConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
  expiresAt?: number;
}

// ==================== AI 相关类型 ====================

/**
 * AI 需求分析结果
 */
export interface RequirementAnalysis {
  /** 内容类型 */
  contentType: 'image' | 'video' | 'auto';
  /** 主题 */
  theme: string;
  /** 风格 */
  style: string;
  /** 目标受众 */
  targetAudience: string;
  /** 关键卖点 */
  keyPoints: string[];
  /** 图片生成 prompt */
  imagePrompt?: string;
  /** 视频生成 prompt */
  videoPrompt?: string;
  /** 原始用户输入 */
  originalInput: string;
}

/**
 * AI 生成的内容
 */
export interface GeneratedContent {
  /** 内容类型 */
  type: 'image' | 'video';
  /** 本地文件路径 */
  localPath: string;
  /** 预览 URL */
  previewUrl?: string;
  /** 元数据 */
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  };
  /** 生成任务 ID */
  taskId?: string;
}

/**
 * AI 生成的文案
 */
export interface GeneratedCopywriting {
  /** 标题 (<=55字) */
  title: string;
  /** 描述 (<=300字) */
  description: string;
  /** 话题标签 (<=5个) */
  hashtags: string[];
  /** 建议的位置名称 */
  suggestedPoiName?: string;
}

/**
 * AI 发布配置
 */
export interface AIPublishConfig {
  /** 是否自动发布 */
  autoPublish?: boolean;
  /** 定时发布时间 */
  scheduleTime?: string;
  /** 内容类型偏好 */
  contentTypePreference?: 'image' | 'video' | 'auto';
  /** 覆盖发布选项 */
  overrides?: Partial<VideoPublishOptions>;
}

/**
 * AI 发布结果
 */
export interface AIPublishResult {
  /** 是否成功 */
  success: boolean;
  /** 需求分析结果 */
  analysis?: RequirementAnalysis;
  /** 生成的内容 */
  content?: GeneratedContent;
  /** 生成的文案 */
  copywriting?: GeneratedCopywriting;
  /** 发布结果 */
  publishResult?: PublishResult;
  /** 错误信息 */
  error?: string;
  /** 任务 ID */
  taskId?: string;
}

/**
 * AI 任务状态
 */
export interface AITaskStatus {
  /** 任务 ID */
  taskId: string;
  /** 任务状态 */
  status: 'pending' | 'analyzing' | 'generating' | 'copywriting' | 'publishing' | 'completed' | 'failed';
  /** 进度百分比 */
  progress: number;
  /** 当前步骤描述 */
  currentStep: string;
  /** 结果 */
  result?: AIPublishResult;
  /** 错误信息 */
  error?: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

// ==================== 创作任务相关类型 ====================

/**
 * 创作任务状态
 */
export type CreationTaskStatus = 
  | 'draft'       // 草稿
  | 'analyzing'   // 分析中
  | 'generating'  // 生成中
  | 'copywriting' // 文案生成中
  | 'preview'     // 预览
  | 'publishing'  // 发布中
  | 'completed'   // 已完成
  | 'failed';     // 失败

/**
 * 创作任务（支持草稿和历史）
 */
export interface CreationTask {
  /** 任务 ID */
  id: string;
  /** 任务状态 */
  status: CreationTaskStatus;
  /** 原始需求 */
  requirement: string;
  /** 内容类型偏好 */
  contentTypePreference?: 'image' | 'video' | 'auto';
  /** 需求分析结果 */
  analysis?: RequirementAnalysis;
  /** 生成的内容 */
  content?: GeneratedContent;
  /** 生成的文案 */
  copywriting?: GeneratedCopywriting;
  /** 发布结果 */
  publishResult?: PublishResult;
  /** 错误信息 */
  error?: string;
  /** 进度百分比 */
  progress: number;
  /** 当前步骤消息 */
  currentStepMessage: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 是否可恢复 */
  canResume: boolean;
  /** 最后完成的步骤 (0-4) */
  lastCompletedStep: number;
}

/**
 * 创作模板
 */
export interface CreationTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 需求内容 */
  requirement: string;
  /** 内容类型偏好 */
  contentTypePreference?: 'image' | 'video' | 'auto';
  /** 标签 */
  tags: string[];
  /** 使用次数 */
  usageCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 下一步操作建议
 */
export interface NextActionSuggestion {
  /** 建议操作 */
  action: 'analyze' | 'generate' | 'copywriting' | 'preview' | 'publish' | 'save_draft';
  /** 建议消息 */
  message: string;
  /** 预计耗时 */
  estimatedTime: string;
  /** 备选操作 */
  alternatives: string[];
  /** 提示信息 */
  tips: string[];
}

// ==================== 图文发布相关类型 ====================

/**
 * 发布类型
 */
export type PublishType = 'video' | 'image-text';

/**
 * 文字样式配置
 */
export interface ImageTextStyle {
  /** 字体 */
  fontFamily?: string;
  /** 字号 */
  fontSize?: number;
  /** 字体颜色 */
  fontColor?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 文字位置 */
  position?: 'top' | 'bottom' | 'center';
  /** 文字对齐 */
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * 图片项
 */
export interface ImageItem {
  /** 唯一标识 */
  id: string;
  /** 原始文件（前端使用） */
  file?: File;
  /** 预览URL或已上传URL */
  url: string;
  /** 上传后的服务器URL */
  uploadedUrl?: string;
  /** 图片标题 */
  title?: string;
  /** 图片描述 */
  description?: string;
  /** 文字样式 */
  textStyle?: ImageTextStyle;
  /** 排序顺序 */
  order: number;
  /** 上传状态 */
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  /** 上传进度 */
  uploadProgress?: number;
}

/**
 * 图文发布选项（继承视频发布选项）
 */
export interface ImageTextPublishOptions extends VideoPublishOptions {
  /** 图片列表 */
  images: ImageItem[];
}

/**
 * 图文发布结果
 */
export interface ImageTextPublishResult {
  /** 是否成功 */
  success: boolean;
  /** 图文 ID */
  itemId?: string;
  /** 分享链接 */
  shareUrl?: string;
  /** 错误信息 */
  error?: string;
  /** 创建时间 */
  createTime?: number;
}

// ==================== 错误处理和重试相关类型 ====================

/**
 * 发布错误类型枚举
 */
export enum PublishErrorType {
  /** 接口超时 */
  TIMEOUT = 'TIMEOUT',
  /** Token过期 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** 素材异常（格式问题、文件损坏等） */
  MATERIAL_ERROR = 'MATERIAL_ERROR',
  /** 平台限流 */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 权限不足 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 参数验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * 发布步骤枚举
 */
export enum PublishStep {
  /** 参数验证 */
  VALIDATE = 'validate',
  /** 上传素材 */
  UPLOAD = 'upload',
  /** 发布内容 */
  PUBLISH = 'publish',
}

/**
 * 错误分类结果
 */
export interface ErrorClassification {
  /** 错误类型 */
  type: PublishErrorType;
  /** 是否可重试 */
  retryable: boolean;
  /** 友好的错误消息 */
  message: string;
  /** 建议操作 */
  suggestion?: string;
}

/**
 * 扩展的发布结果（包含错误详情和重试信息）
 */
export interface PublishResultExtended extends PublishResult {
  /** 错误类型 */
  errorType?: PublishErrorType;
  /** 错误发生的步骤 */
  errorStep?: PublishStep;
  /** 是否可重试 */
  retryable?: boolean;
  /** 已重试次数 */
  retryCount?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 原始发布参数（用于重试） */
  originalParams?: PublishTaskConfig;
  /** 已上传的视频ID（上传成功但发布失败时保存） */
  uploadedVideoId?: string;
  /** 友好的错误消息 */
  friendlyMessage?: string;
  /** 建议操作 */
  suggestion?: string;
}

/**
 * 重试请求参数
 */
export interface RetryRequest {
  /** 任务ID（用于重试定时任务） */
  taskId?: string;
  /** 从哪个步骤开始重试 */
  fromStep?: PublishStep;
  /** 原始发布参数 */
  originalParams: PublishTaskConfig;
  /** 已上传的视频ID（跳过上传步骤时使用） */
  uploadedVideoId?: string;
}

/**
 * 扩展的定时发布结果
 */
export interface ScheduleResultExtended extends ScheduleResult {
  /** 发布结果（任务执行后） */
  result?: PublishResultExtended;
  /** 原始配置（用于重试） */
  config?: PublishTaskConfig;
  /** 错误类型 */
  errorType?: PublishErrorType;
  /** 是否可重试 */
  retryable?: boolean;
}

/**
 * 发布选项（包含重试配置）
 */
export interface PublishOptions {
  /** 从哪个步骤开始执行 */
  fromStep?: PublishStep;
  /** 已上传的视频ID */
  uploadedVideoId?: string;
  /** 重试次数 */
  retryCount?: number;
  /** 进度回调 */
  onProgress?: (step: PublishStep, progress: number) => void;
}

// ==================== 内容质量校验类型 ====================

/**
 * 问题严重等级
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * 问题分类
 */
export type IssueCategory = 
  | 'sensitive_word'      // 敏感词风险
  | 'brand_issue'         // 品牌问题
  | 'platform_compliance' // 平台适配
  | 'content_structure'   // 内容结构
  | 'publish_suggestion'; // 发布建议

/**
 * 单个质量问题
 */
export interface QualityIssue {
  /** 问题分类 */
  category: IssueCategory;
  /** 严重等级 */
  severity: IssueSeverity;
  /** 问题描述 */
  message: string;
  /** 问题位置（如果适用） */
  location?: string;
  /** 原始内容 */
  original?: string;
  /** 修改建议 */
  suggestion?: string;
  /** 替代表达 */
  alternatives?: string[];
}

/**
 * 质量校验结果
 */
export interface QualityCheckResult {
  /** 是否通过校验 */
  passed: boolean;
  /** 总体评分 (0-100) */
  score: number;
  /** 问题列表 */
  issues: QualityIssue[];
  /** 按分类统计 */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  /** 校验时间 */
  checkedAt: string;
  /** 建议的发布时间 */
  suggestedPublishTime?: string;
  /** 建议补充的标签 */
  suggestedTags?: string[];
}

/**
 * 质量校验输入
 */
export interface QualityCheckInput {
  /** 标题 */
  title: string;
  /** 描述/文案 */
  description: string;
  /** 标签 */
  hashtags?: string[];
  /** 内容类型 */
  contentType?: 'image' | 'video';
  /** 目标平台 */
  platform?: 'douyin' | 'tiktok';
  /** 品牌名称（可选） */
  brandName?: string;
  /** 计划发布时间 */
  scheduledTime?: string;
}
