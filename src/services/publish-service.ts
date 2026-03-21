import { DouyinClient } from '../api/douyin-client';
import { DouyinAuth } from '../api/auth';
import { VideoUpload } from '../api/video-upload';
import { VideoPublish } from '../api/video-publish';
import {
  PublishTaskConfig,
  PublishResult,
  PublishResultExtended,
  PublishStep,
  PublishErrorType,
  VideoPublishOptions,
  UploadProgress,
  PublishOptions,
  RetryRequest,
} from '../models/types';
import { validateVideoFile, validatePublishOptions } from '../utils/validator';
import { classifyError, shouldAutoRetry, calculateRetryDelay } from '../utils/error-classifier';
import { createLogger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import https from 'https';

const logger = createLogger('PublishService');

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * 发布服务 - 业务编排层
 */
export class PublishService {
  private videoUpload: VideoUpload;
  private videoPublish: VideoPublish;
  private auth: DouyinAuth;

  constructor(client: DouyinClient, auth: DouyinAuth) {
    this.auth = auth;
    this.videoUpload = new VideoUpload(client, auth);
    this.videoPublish = new VideoPublish(client, auth);
  }

  /**
   * 一站式发布视频（上传 + 发布）- 增强版，支持分步骤执行和错误分类
   * @param config 发布任务配置
   * @param options 发布选项（包含重试配置）
   * @returns 扩展的发布结果
   */
  async publishVideo(
    config: PublishTaskConfig,
    options?: PublishOptions
  ): Promise<PublishResultExtended> {
    const { videoPath, options: publishOptions, isRemoteUrl } = config;
    const { fromStep, uploadedVideoId, retryCount = 0, onProgress } = options || {};

    logger.info(`开始发布流程: ${isRemoteUrl ? 'URL' : '本地文件'} - ${videoPath}, 从步骤: ${fromStep || 'validate'}, 重试次数: ${retryCount}`);

    let currentVideoId = uploadedVideoId;

    try {
      // 步骤1: 参数验证（如果不是从上传或发布步骤开始）
      if (!fromStep || fromStep === PublishStep.VALIDATE) {
        onProgress?.(PublishStep.VALIDATE, 0);
        try {
          validatePublishOptions(publishOptions);
          onProgress?.(PublishStep.VALIDATE, 100);
          logger.info('参数验证通过');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const classification = classifyError(error instanceof Error ? error : errorMessage);
          
          return {
            success: false,
            error: errorMessage,
            errorType: PublishErrorType.VALIDATION_ERROR,
            errorStep: PublishStep.VALIDATE,
            retryable: false,
            retryCount,
            maxRetries: DEFAULT_MAX_RETRIES,
            originalParams: config,
            friendlyMessage: classification.message,
            suggestion: classification.suggestion,
          };
        }
      }

      // 步骤2: 上传视频（如果没有已上传的 videoId 且不是从发布步骤开始）
      if (!currentVideoId && (!fromStep || fromStep === PublishStep.VALIDATE || fromStep === PublishStep.UPLOAD)) {
        onProgress?.(PublishStep.UPLOAD, 0);
        try {
          if (isRemoteUrl) {
            currentVideoId = await this.videoUpload.uploadFromUrl(videoPath);
          } else {
            currentVideoId = await this.videoUpload.uploadVideo(videoPath, {
              onProgress: (progress) => {
                onProgress?.(PublishStep.UPLOAD, progress.percentage);
                logger.info(`上传进度: ${progress.percentage}% (${progress.loaded}/${progress.total})`);
              },
            });
          }
          onProgress?.(PublishStep.UPLOAD, 100);
          logger.info(`视频上传成功，video_id: ${currentVideoId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const classification = classifyError(error instanceof Error ? error : errorMessage);
          
          logger.error(`上传失败: ${errorMessage}`);
          
          return {
            success: false,
            error: errorMessage,
            errorType: classification.type,
            errorStep: PublishStep.UPLOAD,
            retryable: classification.retryable,
            retryCount,
            maxRetries: DEFAULT_MAX_RETRIES,
            originalParams: config,
            friendlyMessage: classification.message,
            suggestion: classification.suggestion,
          };
        }
      }

      // 步骤3: 发布视频
      onProgress?.(PublishStep.PUBLISH, 0);
      try {
        const publishResult = await this.videoPublish.createVideo(currentVideoId!, publishOptions);
        onProgress?.(PublishStep.PUBLISH, 100);
        
        logger.info(`发布流程完成，video_id: ${publishResult.data.video_id}`);

        return {
          success: true,
          videoId: publishResult.data.video_id,
          shareUrl: publishResult.data.share_url,
          createTime: publishResult.data.create_time,
          retryCount,
          maxRetries: DEFAULT_MAX_RETRIES,
          originalParams: config,
          uploadedVideoId: currentVideoId,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const classification = classifyError(error instanceof Error ? error : errorMessage);
        
        logger.error(`发布失败: ${errorMessage}`);
        
        return {
          success: false,
          error: errorMessage,
          errorType: classification.type,
          errorStep: PublishStep.PUBLISH,
          retryable: classification.retryable,
          retryCount,
          maxRetries: DEFAULT_MAX_RETRIES,
          originalParams: config,
          uploadedVideoId: currentVideoId, // 保存已上传的 videoId，便于重试时跳过上传
          friendlyMessage: classification.message,
          suggestion: classification.suggestion,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error instanceof Error ? error : errorMessage);
      
      logger.error(`发布流程异常: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        errorType: classification.type,
        errorStep: PublishStep.VALIDATE,
        retryable: classification.retryable,
        retryCount,
        maxRetries: DEFAULT_MAX_RETRIES,
        originalParams: config,
        uploadedVideoId: currentVideoId,
        friendlyMessage: classification.message,
        suggestion: classification.suggestion,
      };
    }
  }

  /**
   * 重试发布
   * @param request 重试请求参数
   * @returns 发布结果
   */
  async retryPublish(request: RetryRequest): Promise<PublishResultExtended> {
    const { fromStep, originalParams, uploadedVideoId } = request;
    
    logger.info(`重试发布，从步骤: ${fromStep || 'validate'}，已上传videoId: ${uploadedVideoId || '无'}`);
    
    // 获取之前的重试次数并递增
    const previousResult = await this.publishVideo(originalParams);
    const retryCount = (previousResult.retryCount || 0) + 1;
    
    return this.publishVideo(originalParams, {
      fromStep,
      uploadedVideoId,
      retryCount,
    });
  }

  /**
   * 带自动重试的发布
   * @param config 发布任务配置
   * @param maxRetries 最大重试次数
   * @returns 发布结果
   */
  async publishVideoWithRetry(
    config: PublishTaskConfig,
    maxRetries: number = DEFAULT_MAX_RETRIES
  ): Promise<PublishResultExtended> {
    let result: PublishResultExtended;
    let retryCount = 0;
    let uploadedVideoId: string | undefined;

    while (retryCount <= maxRetries) {
      result = await this.publishVideo(config, {
        fromStep: uploadedVideoId ? PublishStep.PUBLISH : undefined,
        uploadedVideoId,
        retryCount,
      });

      if (result.success) {
        return result;
      }

      // 保存已上传的 videoId
      if (result.uploadedVideoId) {
        uploadedVideoId = result.uploadedVideoId;
      }

      // 检查是否应该自动重试
      if (!shouldAutoRetry(result.errorType || PublishErrorType.UNKNOWN, retryCount, maxRetries)) {
        logger.info(`错误类型 ${result.errorType} 不支持自动重试或已达最大重试次数`);
        return result;
      }

      // 计算延迟时间
      const delay = calculateRetryDelay(retryCount);
      logger.info(`将在 ${delay}ms 后进行第 ${retryCount + 1} 次重试`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }

    return result!;
  }

  /**
   * 仅上传视频（不发布）
   * @param filePath 视频文件路径
   * @param onProgress 进度回调
   * @returns 视频 ID
   */
  async uploadVideo(
    filePath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    return this.videoUpload.uploadVideo(filePath, { onProgress });
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
  ): Promise<PublishResultExtended> {
    try {
      validatePublishOptions(options);

      const result = await this.videoPublish.createVideo(videoId, options);

      return {
        success: true,
        videoId: result.data.video_id,
        shareUrl: result.data.share_url,
        createTime: result.data.create_time,
        uploadedVideoId: videoId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error instanceof Error ? error : errorMessage);
      
      logger.error(`发布失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        errorType: classification.type,
        errorStep: PublishStep.PUBLISH,
        retryable: classification.retryable,
        uploadedVideoId: videoId,
        friendlyMessage: classification.message,
        suggestion: classification.suggestion,
      };
    }
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
  ): Promise<PublishResultExtended> {
    logger.info(`下载并发布视频: ${videoUrl}`);

    const tempFilePath = path.join(process.cwd(), `temp_${Date.now()}.mp4`);

    try {
      // 1. 下载视频
      await this.downloadFile(videoUrl, tempFilePath);
      logger.info(`视频下载完成: ${tempFilePath}`);

      // 2. 验证文件
      const stats = fs.statSync(tempFilePath);
      validateVideoFile(tempFilePath, stats.size);

      // 3. 发布
      const result = await this.publishVideo({
        videoPath: tempFilePath,
        options,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error instanceof Error ? error : errorMessage);
      
      logger.error(`下载并发布失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        errorType: classification.type,
        errorStep: PublishStep.UPLOAD,
        retryable: classification.retryable,
        friendlyMessage: classification.message,
        suggestion: classification.suggestion,
      };
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.debug(`临时文件已删除: ${tempFilePath}`);
      }
    }
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
    return this.videoPublish.queryVideoStatus(videoId);
  }

  /**
   * 删除视频
   * @param videoId 视频 ID
   */
  async deleteVideo(videoId: string): Promise<void> {
    return this.videoPublish.deleteVideo(videoId);
  }

  /**
   * 下载文件
   * @param url 文件 URL
   * @param destPath 目标路径
   */
  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败，状态码: ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    });
  }
}

export default PublishService;

