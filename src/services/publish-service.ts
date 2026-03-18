import { DouyinClient } from '../api/douyin-client';
import { DouyinAuth } from '../api/auth';
import { VideoUpload } from '../api/video-upload';
import { VideoPublish } from '../api/video-publish';
import {
  PublishTaskConfig,
  PublishResult,
  VideoPublishOptions,
  UploadProgress,
} from '../models/types';
import { validateVideoFile, validatePublishOptions } from '../utils/validator';
import { createLogger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import https from 'https';

const logger = createLogger('PublishService');

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
   * 一站式发布视频（上传 + 发布）
   * @param config 发布任务配置
   * @returns 发布结果
   */
  async publishVideo(config: PublishTaskConfig): Promise<PublishResult> {
    const { videoPath, options, isRemoteUrl } = config;

    logger.info(`开始发布流程: ${isRemoteUrl ? 'URL' : '本地文件'} - ${videoPath}`);

    try {
      // 1. 验证发布参数
      validatePublishOptions(options);

      // 2. 上传视频
      let videoId: string;
      if (isRemoteUrl) {
        videoId = await this.videoUpload.uploadFromUrl(videoPath);
      } else {
        // 本地文件上传
        videoId = await this.videoUpload.uploadVideo(videoPath, {
          onProgress: (progress) => {
            logger.info(`上传进度: ${progress.percentage}% (${progress.loaded}/${progress.total})`);
          },
        });
      }

      // 3. 发布视频
      const publishResult = await this.videoPublish.createVideo(videoId, options);

      logger.info(`发布流程完成，video_id: ${publishResult.data.video_id}`);

      return {
        success: true,
        videoId: publishResult.data.video_id,
        shareUrl: publishResult.data.share_url,
        createTime: publishResult.data.create_time,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`发布流程失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
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
  ): Promise<PublishResult> {
    try {
      validatePublishOptions(options);

      const result = await this.videoPublish.createVideo(videoId, options);

      return {
        success: true,
        videoId: result.data.video_id,
        shareUrl: result.data.share_url,
        createTime: result.data.create_time,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`发布失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
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
  ): Promise<PublishResult> {
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
      logger.error(`下载并发布失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
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

