import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { DouyinClient } from './douyin-client';
import { DouyinAuth } from './auth';
import {
  UploadConfig,
  UploadProgress,
  UploadCompleteResponse,
} from '../models/types';
import { UPLOAD_CONFIG } from '../../config/default';
import { validateVideoFile } from '../utils/validator';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoUpload');

/**
 * 视频上传模块
 */
export class VideoUpload {
  private client: DouyinClient;
  private auth: DouyinAuth;

  constructor(client: DouyinClient, auth: DouyinAuth) {
    this.client = client;
    this.auth = auth;
  }

  /**
   * 上传视频（自动选择上传方式）
   * @param filePath 视频文件路径
   * @param config 上传配置
   * @returns 视频 ID
   */
  async uploadVideo(filePath: string, config?: UploadConfig): Promise<string> {
    // 确保 token 有效
    await this.auth.ensureTokenValid();

    // 获取文件信息
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // 验证文件
    validateVideoFile(filePath, fileSize);

    logger.info(`开始上传视频: ${path.basename(filePath)}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    // 根据文件大小选择上传方式
    if (fileSize <= UPLOAD_CONFIG.CHUNK_UPLOAD_THRESHOLD) {
      return this.uploadVideoDirect(filePath, config);
    } else {
      return this.uploadVideoChunked(filePath, config);
    }
  }

  /**
   * 直接上传（小文件，小于 128MB）
   * @param filePath 视频文件路径
   * @param config 上传配置
   * @returns 视频 ID
   */
  private async uploadVideoDirect(filePath: string, config?: UploadConfig): Promise<string> {
    logger.info('使用直接上传方式...');

    const formData = new FormData();
    formData.append('video', fs.createReadStream(filePath));

    const stats = fs.statSync(filePath);
    let uploadedBytes = 0;

    // 监听上传进度
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('data', (chunk: string | Buffer) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      uploadedBytes += buffer.length;
      const progress: UploadProgress = {
        loaded: uploadedBytes,
        total: stats.size,
        percentage: Math.round((uploadedBytes / stats.size) * 100),
      };
      config?.onProgress?.(progress);
    });

    try {
      const response = await this.client.postForm<UploadCompleteResponse>(
        '/api/v2/video/upload/',
        formData
      );

      logger.info(`视频上传成功，video_id: ${response.data.video_id}`);
      return response.data.video_id;
    } catch (error) {
      logger.error(`视频上传失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 分片上传（大文件，大于 128MB）
   * @param filePath 视频文件路径
   * @param config 上传配置
   * @returns 视频 ID
   */
  private async uploadVideoChunked(filePath: string, config?: UploadConfig): Promise<string> {
    logger.info('使用分片上传方式...');

    const chunkSize = config?.chunkSize || UPLOAD_CONFIG.DEFAULT_CHUNK_SIZE;
    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    logger.info(`分片信息: 总分片数=${totalChunks}, 分片大小=${(chunkSize / 1024 / 1024).toFixed(2)}MB`);

    // 1. 初始化分片上传
    const uploadId = await this.initChunkUpload(totalSize, path.basename(filePath));
    logger.info(`分片上传初始化成功，upload_id: ${uploadId}`);

    // 2. 上传分片
    const uploadedChunks: number[] = [];
    
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunkBuffer = Buffer.alloc(end - start);

      // 读取分片数据
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, chunkBuffer, 0, chunkBuffer.length, start);
      fs.closeSync(fd);

      // 上传分片
      await this.uploadChunk(uploadId, chunkBuffer, partNumber);
      uploadedChunks.push(partNumber);

      // 更新进度
      const loaded = uploadedChunks.length * chunkSize;
      const progress: UploadProgress = {
        loaded: Math.min(loaded, totalSize),
        total: totalSize,
        percentage: Math.round((uploadedChunks.length / totalChunks) * 100),
      };
      config?.onProgress?.(progress);

      logger.debug(`分片 ${partNumber}/${totalChunks} 上传完成`);
    }

    // 3. 完成分片上传
    const result = await this.completeChunkUpload(uploadId);
    logger.info(`分片上传完成，video_id: ${result.data.video_id}`);

    return result.data.video_id;
  }

  /**
   * 初始化分片上传
   * @param totalSize 文件总大小
   * @param fileName 文件名
   * @returns upload_id
   */
  private async initChunkUpload(totalSize: number, fileName: string): Promise<string> {
    const openId = this.auth.getTokenInfo()?.openId;
    
    const response = await this.client.post<{ upload_id: string }>(
      '/api/v2/video/upload/init/',
      {
        open_id: openId,
        total_size: totalSize,
        file_name: fileName,
      }
    );

    return response.upload_id;
  }

  /**
   * 上传单个分片
   * @param uploadId 上传 ID
   * @param chunkData 分片数据
   * @param partNumber 分片序号
   */
  private async uploadChunk(uploadId: string, chunkData: Buffer, partNumber: number): Promise<void> {
    const formData = new FormData();
    formData.append('upload_id', uploadId);
    formData.append('part_number', partNumber.toString());
    formData.append('data', chunkData, {
      filename: `chunk_${partNumber}`,
      contentType: 'application/octet-stream',
    });

    await this.client.postForm<{ part_number: number; etag: string }>(
      '/api/v2/video/upload/part/',
      formData
    );
  }

  /**
   * 完成分片上传
   * @param uploadId 上传 ID
   * @returns 上传完成响应
   */
  private async completeChunkUpload(uploadId: string): Promise<UploadCompleteResponse> {
    const openId = this.auth.getTokenInfo()?.openId;

    const response = await this.client.post<{ video_id: string; video_url?: string }>(
      '/api/v2/video/upload/complete/',
      {
        open_id: openId,
        upload_id: uploadId,
      }
    );
    
    return { data: response };
  }

  /**
   * 从远程 URL 上传视频
   * @param videoUrl 视频 URL
   * @returns 视频 ID
   */
  async uploadFromUrl(videoUrl: string): Promise<string> {
    logger.info(`从 URL 上传视频: ${videoUrl}`);

    // 确保 token 有效
    await this.auth.ensureTokenValid();
    const openId = this.auth.getTokenInfo()?.openId;

    const response = await this.client.post<{ video_id: string }>(
      '/api/v2/video/upload/by_url/',
      {
        open_id: openId,
        url: videoUrl,
      }
    );

    logger.info(`URL 上传成功，video_id: ${response.video_id}`);
    return response.video_id;
  }
}

export default VideoUpload;
