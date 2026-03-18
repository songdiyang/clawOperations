/**
 * 默认配置常量
 */

export const API_CONFIG = {
  /** 抖音开放平台 API 基地址 */
  BASE_URL: 'https://open.douyin.com',
};

export const UPLOAD_CONFIG = {
  /** 分片上传阈值 (128MB) */
  CHUNK_UPLOAD_THRESHOLD: 128 * 1024 * 1024,
  /** 默认分片大小 (5MB) */
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024,
};

export const RETRY_CONFIG = {
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 基础延迟时间 (毫秒) */
  BASE_DELAY: 1000,
  /** 最大延迟时间 (毫秒) */
  MAX_DELAY: 30000,
};

export const VIDEO_CONFIG = {
  /** 支持的视频格式 */
  SUPPORTED_FORMATS: ['mp4', 'mov', 'avi'],
  /** 视频大小限制 (4GB) */
  MAX_SIZE: 4 * 1024 * 1024 * 1024,
};

export const CONTENT_CONFIG = {
  /** 标题最大长度 */
  MAX_TITLE_LENGTH: 55,
  /** 描述最大长度 */
  MAX_DESCRIPTION_LENGTH: 300,
  /** hashtag 最大数量 */
  MAX_HASHTAG_COUNT: 5,
};

export const AI_CONFIG = {
  /** DeepSeek AI 配置 */
  DEEPSEEK: {
    BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    MODEL: 'deepseek-chat',
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.7,
  },
  /** 豆包 AI 配置 (火山引擎) */
  DOUBAO: {
    BASE_URL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    IMAGE_MODEL: process.env.DOUBAO_ENDPOINT_ID_IMAGE || '',
    VIDEO_MODEL: process.env.DOUBAO_ENDPOINT_ID_VIDEO || '',
    /** 任务轮询间隔 (毫秒) */
    POLL_INTERVAL: 3000,
    /** 任务超时时间 (毫秒) - 5分钟 */
    TASK_TIMEOUT: 5 * 60 * 1000,
  },
};

export default {
  API_CONFIG,
  UPLOAD_CONFIG,
  RETRY_CONFIG,
  VIDEO_CONFIG,
  CONTENT_CONFIG,
  AI_CONFIG,
};
