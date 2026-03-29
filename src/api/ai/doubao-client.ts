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
 * 视频生成请求 (火山引擎方舟 contents/generations/tasks API)
 */
interface VideoGenerationRequest {
  model: string;
  content: { type: string; text?: string; image_url?: { url: string } }[];
  resolution?: string;
  ratio?: string;
  duration?: number;
  watermark?: boolean;
}

/**
 * 视频生成响应 (创建任务返回)
 */
interface VideoGenerationResponse {
  id: string;
}

/**
 * 任务状态响应 (火山引擎方舟 contents/generations/tasks/{id} API)
 */
interface TaskStatusResponse {
  id: string;
  model: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'cancelled';
  content?: {
    video_url?: string;
  };
  usage?: {
    completion_tokens: number;
    total_tokens: number;
  };
  resolution?: string;
  ratio?: string;
  duration?: number;
  framespersecond?: number;
  error?: {
    code: string;
    message: string;
  };
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
      referenceImageUrl?: string;  // 参考图 URL
    }
  ): Promise<GeneratedContent> {
    if (!this.videoModel) {
      throw new Error('视频生成模型未配置，请设置 DOUBAO_ENDPOINT_ID_VIDEO 环境变量');
    }

    logger.info('开始生成视频', { 
      promptLength: prompt.length,
      hasReferenceImage: !!options?.referenceImageUrl 
    });

    try {
      // 构建 content 数组
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [];
      
      // 如果有参考图，先添加图片
      if (options?.referenceImageUrl) {
        content.push({
          type: 'image_url',
          image_url: { url: options.referenceImageUrl },
        });
        logger.info('使用参考图生成视频', { referenceImageUrl: options.referenceImageUrl });
      }
      
      // 添加文本提示词
      content.push({
        type: 'text',
        text: prompt,
      });

      // 1. 创建视频生成任务 (火山引擎方舟 API)
      const request: VideoGenerationRequest = {
        model: this.videoModel,
        content,
        duration: options?.duration || 5,
        resolution: options?.resolution || '720p',
        ratio: '9:16',  // 竖屏视频，适合抖音
        watermark: false,
      };

      const response = await this.client.post<VideoGenerationResponse>(
        '/contents/generations/tasks',
        request
      );

      const taskId = response.data.id;
      logger.info('视频生成任务已创建', { taskId });

      // 2. 轮询任务状态
      const result = await this.waitForTask(taskId);

      if (!result.content?.video_url) {
        throw new Error('视频生成失败：未返回视频URL');
      }

      // 3. 下载视频到本地
      const fileName = `video_${Date.now()}.mp4`;
      const localPath = path.join(this.outputDir, fileName);
      await this.downloadFile(result.content.video_url, localPath);

      logger.info('视频生成完成', { localPath, duration: result.duration });

      return {
        type: 'video',
        localPath,
        previewUrl: result.content.video_url,
        taskId,
        metadata: {
          duration: result.duration,
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
        `/contents/generations/tasks/${taskId}`
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
      });

      if (status.status === 'succeeded') {
        return status;
      }

      if (status.status === 'failed' || status.status === 'expired' || status.status === 'cancelled') {
        throw new Error(status.error?.message || `任务${status.status === 'failed' ? '执行失败' : status.status === 'expired' ? '已过期' : '已取消'}`);
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
