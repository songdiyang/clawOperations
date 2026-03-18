import { VideoPublishOptions } from '../models/types';
import { CONTENT_CONFIG, VIDEO_CONFIG } from '../../config/default';
import { createLogger } from './logger';

const logger = createLogger('Validator');

/**
 * 验证错误
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 验证视频文件
 * @param filePath 文件路径
 * @param fileSize 文件大小（字节）
 */
export function validateVideoFile(filePath: string, fileSize: number): void {
  // 检查文件格式
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext || !VIDEO_CONFIG.SUPPORTED_FORMATS.includes(ext)) {
    throw new ValidationError(
      `不支持的视频格式: ${ext}，支持的格式: ${VIDEO_CONFIG.SUPPORTED_FORMATS.join(', ')}`
    );
  }

  // 检查文件大小
  if (fileSize > VIDEO_CONFIG.MAX_SIZE) {
    throw new ValidationError(
      `视频文件过大: ${(fileSize / 1024 / 1024 / 1024).toFixed(2)}GB，最大支持: ${VIDEO_CONFIG.MAX_SIZE / 1024 / 1024 / 1024}GB`
    );
  }

  logger.debug(`视频文件验证通过: ${filePath}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
}

/**
 * 验证发布选项
 * @param options 发布选项
 */
export function validatePublishOptions(options?: VideoPublishOptions): void {
  if (!options) {
    return;
  }

  // 验证标题长度
  if (options.title && options.title.length > CONTENT_CONFIG.MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `标题过长: ${options.title.length} 字符，最大支持: ${CONTENT_CONFIG.MAX_TITLE_LENGTH} 字符`
    );
  }

  // 验证描述长度
  if (options.description && options.description.length > CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `描述过长: ${options.description.length} 字符，最大支持: ${CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH} 字符`
    );
  }

  // 验证 hashtag 数量
  if (options.hashtags && options.hashtags.length > CONTENT_CONFIG.MAX_HASHTAG_COUNT) {
    throw new ValidationError(
      `hashtag 数量过多: ${options.hashtags.length}，最大支持: ${CONTENT_CONFIG.MAX_HASHTAG_COUNT} 个`
    );
  }

  // 验证定时发布时间
  if (options.schedulePublishTime) {
    const now = Math.floor(Date.now() / 1000);
    const maxScheduleTime = now + 7 * 24 * 60 * 60; // 7天后
    
    if (options.schedulePublishTime <= now) {
      throw new ValidationError('定时发布时间必须晚于当前时间');
    }
    
    if (options.schedulePublishTime > maxScheduleTime) {
      throw new ValidationError('定时发布时间不能超过7天后');
    }
  }

  logger.debug('发布选项验证通过');
}

/**
 * 清理 hashtag（移除 # 前缀）
 * @param hashtag 原始 hashtag
 * @returns 清理后的 hashtag
 */
export function cleanHashtag(hashtag: string): string {
  return hashtag.replace(/^#+/, '').trim();
}

/**
 * 格式化 hashtag 数组为字符串
 * @param hashtags hashtag 数组
 * @returns 格式化后的字符串
 */
export function formatHashtags(hashtags?: string[]): string {
  if (!hashtags || hashtags.length === 0) {
    return '';
  }
  return hashtags.map(tag => `#${cleanHashtag(tag)}`).join(' ');
}

export default {
  validateVideoFile,
  validatePublishOptions,
  cleanHashtag,
  formatHashtags,
  ValidationError,
};
