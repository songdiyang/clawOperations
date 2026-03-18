/**
 * 豆包 AI 客户端 (火山引擎方舟大模型)
 * 用于图片和视频生成
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { AI_CONFIG } from '../../../config/default';
import { createLogger } from '../../utils/logger';
import { GeneratedContent } from '../../models/types';

const logger = createLogger('DoubaoClient');

/**
 * 图片生成请求
 */
interface ImageGenerationRequest {
  model: string;
  prompt: string;
  size?: string;
  n?: number;
  response_format?: 'url' | 'b64_json';
}

/**
 * 图片生成响应
 */
interface ImageGenerationResponse {
  created: number;
  data: {
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }[];
}

/**
 * 视频生成请求
 */
interface VideoGenerationRequest {
  model: string;
  prompt: string;
  duration?: number;
  resolution?: string;
}

/**
 * 视频生成响应
 */
interface VideoGenerationResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * 任务状态响应
 */
interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    url: string;
    duration?: number;
    width?: number;
    height?: number;
  };
  error?: string;
}

/**
 * 豆包 AI 客户端类
 */
export class DoubaoClient {
  private client: AxiosInstance;
  private imageModel: string;
  private videoModel: string;
  private pollInterval: number;
  private taskTimeout: number;
  private outputDir: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.DOUBAO_API_KEY;
    if (!key) {
      throw new Error('豆包 API Key 未配置，请设置 DOUBAO_API_KEY 环境变量');
    }

    this.client = axios.create({
      baseURL: AI_CONFIG.DOUBAO.BASE_URL,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 分钟超时
    });

    this.imageModel = AI_CONFIG.DOUBAO.IMAGE_MODEL;
    this.videoModel = AI_CONFIG.DOUBAO.VIDEO_MODEL;
    this.pollInterval = AI_CONFIG.DOUBAO.POLL_INTERVAL;
    this.taskTimeout = AI_CONFIG.DOUBAO.TASK_TIMEOUT;

    // 设置输出目录
    this.outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    logger.info('豆包客户端初始化完成', {
      imageModel: this.imageModel,
      videoModel: this.videoModel,
    });
  }

  /**
   * 生成图片
   * @param prompt 图片描述提示词
   * @param options 生成选项
   * @returns 生成的内容信息
   */
  async generateImage(
    prompt: string,
    options?: {
      size?: string;
      count?: number;
    }
  ): Promise<GeneratedContent> {
    if (!this.imageModel) {
      throw new Error('图片生成模型未配置，请设置 DOUBAO_ENDPOINT_ID_IMAGE 环境变量');
    }

    logger.info('开始生成图片', { promptLength: prompt.length });

    try {
      const request: ImageGenerationRequest = {
        model: this.imageModel,
        prompt,
        size: options?.size || '1024x1024',
        n: options?.count || 1,
        response_format: 'url',
      };

      const response = await this.client.post<ImageGenerationResponse>(
        '/images/generations',
        request
      );

      const imageUrl = response.data.data[0]?.url;
      if (!imageUrl) {
        throw new Error('图片生成失败：未返回图片URL');
      }

      // 下载图片到本地
      const fileName = `image_${Date.now()}.png`;
      const localPath = path.join(this.outputDir, fileName);
      await this.downloadFile(imageUrl, localPath);

      logger.info('图片生成完成', { localPath });

      return {
        type: 'image',
        localPath,
        previewUrl: imageUrl,
        metadata: {
          width: parseInt(request.size?.split('x')[0] || '1024'),
          height: parseInt(request.size?.split('x')[1] || '1024'),
          size: fs.statSync(localPath).size,
        },
      };
    } catch (error: any) {
      logger.error('图片生成失败', { error: error.message });
      throw new Error(`图片生成失败: ${error.message}`);
    }
  }

  /**
   * 生成视频
   * @param prompt 视频描述提示词
   * @param options 生成选项
   * @returns 生成的内容信息
   */
  async generateVideo(
    prompt: string,
    options?: {
      duration?: number;
      resolution?: string;
    }
  ): Promise<GeneratedContent> {
    if (!this.videoModel) {
      throw new Error('视频生成模型未配置，请设置 DOUBAO_ENDPOINT_ID_VIDEO 环境变量');
    }

    logger.info('开始生成视频', { promptLength: prompt.length });

    try {
      // 1. 创建视频生成任务
      const request: VideoGenerationRequest = {
        model: this.videoModel,
        prompt,
        duration: options?.duration || 5,
        resolution: options?.resolution || '720p',
      };

      const response = await this.client.post<VideoGenerationResponse>(
        '/videos/generations',
        request
      );

      const taskId = response.data.task_id;
      logger.info('视频生成任务已创建', { taskId });

      // 2. 轮询任务状态
      const result = await this.waitForTask(taskId);

      if (!result.result?.url) {
        throw new Error('视频生成失败：未返回视频URL');
      }

      // 3. 下载视频到本地
      const fileName = `video_${Date.now()}.mp4`;
      const localPath = path.join(this.outputDir, fileName);
      await this.downloadFile(result.result.url, localPath);

      logger.info('视频生成完成', { localPath, duration: result.result.duration });

      return {
        type: 'video',
        localPath,
        previewUrl: result.result.url,
        taskId,
        metadata: {
          width: result.result.width,
          height: result.result.height,
          duration: result.result.duration,
          size: fs.statSync(localPath).size,
        },
      };
    } catch (error: any) {
      logger.error('视频生成失败', { error: error.message });
      throw new Error(`视频生成失败: ${error.message}`);
    }
  }

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @returns 任务状态
   */
  async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await this.client.get<TaskStatusResponse>(
        `/videos/generations/${taskId}`
      );
      return response.data;
    } catch (error: any) {
      logger.error('查询任务状态失败', { taskId, error: error.message });
      throw new Error(`查询任务状态失败: ${error.message}`);
    }
  }

  /**
   * 等待任务完成
   * @param taskId 任务ID
   * @returns 任务结果
   */
  private async waitForTask(taskId: string): Promise<TaskStatusResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.taskTimeout) {
      const status = await this.checkTaskStatus(taskId);

      logger.debug('任务状态', { 
        taskId, 
        status: status.status, 
        progress: status.progress 
      });

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || '任务执行失败');
      }

      // 等待后继续轮询
      await this.sleep(this.pollInterval);
    }

    throw new Error('任务超时，请稍后重试');
  }

  /**
   * 下载文件
   * @param url 文件URL
   * @param destPath 目标路径
   */
  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const protocol = url.startsWith('https') ? https : require('http');

      protocol
        .get(url, (response: any) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            // 处理重定向
            this.downloadFile(response.headers.location, destPath)
              .then(resolve)
              .catch(reject);
            return;
          }

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
        .on('error', (err: Error) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    });
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取输出目录
   */
  getOutputDir(): string {
    return this.outputDir;
  }
}

export default DoubaoClient;
