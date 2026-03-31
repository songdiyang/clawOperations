/**
 * 豆包 AI 客户端 (火山引擎方舟大模型)
 * 用于图片和视频生成
 */

import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { AI_CONFIG } from '../../../config/default';
import { createLogger } from '../../utils/logger';
import { GeneratedContent } from '../../models/types';

// 确保环境变量已加载（奴理模块导入顺序问题）
const projectRoot = process.cwd().toLowerCase().includes('clawoperations')
  ? process.cwd().replace(/[\/]web[\/]server.*$/, '').replace(/[\/]dist.*$/, '')
  : process.cwd();
dotenv.config({ path: path.join(projectRoot, '.env') });

const logger = createLogger('DoubaoClient');
const DEFAULT_PORTRAIT_IMAGE_SIZE = '1440x2560';
const DEFAULT_VIDEO_RATIO = '9:16';

// 防御性配置检查，确保 AI_CONFIG.DOUBAO 存在
const DOUBAO_CONFIG = AI_CONFIG?.DOUBAO ?? {
  BASE_URL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  IMAGE_MODEL: process.env.DOUBAO_ENDPOINT_ID_IMAGE || '',
  VIDEO_MODEL: process.env.DOUBAO_ENDPOINT_ID_VIDEO || '',
  POLL_INTERVAL: 3000,
  TASK_TIMEOUT: 5 * 60 * 1000,
};

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
    // 每次创建实例时重新读取环境变量（支持运行时配置更新）
    const key = apiKey || process.env.DOUBAO_API_KEY;
    if (!key) {
      throw new Error('豆包 API Key 未配置。请设置 DOUBAO_API_KEY 环境变量（火山引擎方舟 API Key）。');
    }

    const baseUrl = process.env.DOUBAO_BASE_URL || DOUBAO_CONFIG.BASE_URL;
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 分钟超时
    });

    // 优先从环境变量读取，支持运行时配置更新
    this.imageModel = process.env.DOUBAO_ENDPOINT_ID_IMAGE || DOUBAO_CONFIG.IMAGE_MODEL;
    this.videoModel = process.env.DOUBAO_ENDPOINT_ID_VIDEO || DOUBAO_CONFIG.VIDEO_MODEL;
    this.pollInterval = DOUBAO_CONFIG.POLL_INTERVAL;
    this.taskTimeout = DOUBAO_CONFIG.TASK_TIMEOUT;

    // 设置输出目录 - 使用绝对路径确保一致性
    // 生产环境: /var/www/clawoperations/generated
    // 开发环境: 项目根目录/generated
    const projectRoot = process.env.PROJECT_ROOT || 
      (process.cwd().includes('clawoperations') || process.cwd().includes('clawOperations')
        ? process.cwd().replace(/[\/]web[\/]server.*$/, '').replace(/[\/]dist.*$/, '')
        : process.cwd());
    this.outputDir = path.join(projectRoot, 'generated');
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
      throw new Error('图片生成模型未配置。请设置 DOUBAO_ENDPOINT_ID_IMAGE 环境变量（火山引擎图片生成接入点 ID）。');
    }

    logger.info('开始生成图片', { promptLength: prompt.length });

    try {
      const request: ImageGenerationRequest = {
        model: this.imageModel,
        prompt,
        size: options?.size || DEFAULT_PORTRAIT_IMAGE_SIZE, // 9:16 竖屏，且满足最小像素要求
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
      await this.downloadFile(imageUrl, localPath, 'image');

      logger.info('图片生成完成', { localPath });

      return {
        type: 'image',
        localPath,
        // 使用本地 URL 作为预览地址，避免豆包 URL 过期
        previewUrl: `/generated/${fileName}`,
        metadata: {
          width: parseInt(request.size?.split('x')[0] || DEFAULT_PORTRAIT_IMAGE_SIZE.split('x')[0]),
          height: parseInt(request.size?.split('x')[1] || DEFAULT_PORTRAIT_IMAGE_SIZE.split('x')[1]),
          size: fs.statSync(localPath).size,
        },
      };
    } catch (error: any) {
      logger.error('图片生成失败', { error: error.message, status: error.response?.status });
      // 提供更准确的错误信息
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        throw new Error(`豆包图片生成失败 (400): ${errorData?.error?.message || '请检查图片模型 ID 是否正确配置'}`);
      }
      if (error.response?.status === 403) {
        throw new Error('豆包图片生成失败 (403): API Key 无权限或接入点未上线');
      }
      throw new Error(`豆包图片生成失败: ${error.message}`);
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
      throw new Error('视频生成模型未配置。请设置 DOUBAO_ENDPOINT_ID_VIDEO 环境变量（火山引擎视频生成接入点 ID）。');
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
        ratio: DEFAULT_VIDEO_RATIO,  // 竖屏视频，适合抖音
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
      await this.downloadFile(result.content.video_url, localPath, 'video');

      logger.info('视频生成完成', { localPath, duration: result.duration });

      return {
        type: 'video',
        localPath,
        // 使用本地 URL 作为预览地址，避免豆包 URL 过期
        previewUrl: `/generated/${fileName}`,
        taskId,
        metadata: {
          duration: result.duration,
          size: fs.statSync(localPath).size,
        },
      };
    } catch (error: any) {
      logger.error('视频生成失败', { error: error.message, status: error.response?.status });
      // 提供更准确的错误信息
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        throw new Error(`豆包视频生成失败 (400): ${errorData?.error?.message || '请检查视频模型 ID 是否正确配置'}`);
      }
      if (error.response?.status === 403) {
        throw new Error('豆包视频生成失败 (403): API Key 无权限或接入点未上线');
      }
      throw new Error(`豆包视频生成失败: ${error.message}`);
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
  private async downloadFile(
    url: string,
    destPath: string,
    expectedType: 'image' | 'video'
  ): Promise<void> {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 120000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentTypeHeader = String(response.headers['content-type'] || '').toLowerCase();
    if (expectedType === 'video' && contentTypeHeader && !contentTypeHeader.startsWith('video/')) {
      throw new Error(`下载的视频文件类型异常: ${contentTypeHeader}`);
    }
    if (expectedType === 'image' && contentTypeHeader && !contentTypeHeader.startsWith('image/')) {
      throw new Error(`下载的图片文件类型异常: ${contentTypeHeader}`);
    }

    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(destPath);

      response.data.pipe(file);

      file.on('finish', () => {
        file.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }
          resolve();
        });
      });

      file.on('error', (err: Error) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });

      response.data.on('error', (err: Error) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    this.validateDownloadedFile(destPath, expectedType);
  }

  private validateDownloadedFile(destPath: string, expectedType: 'image' | 'video'): void {
    const stats = fs.statSync(destPath);
    if (stats.size <= 0) {
      throw new Error(`${expectedType === 'video' ? '视频' : '图片'}下载失败：文件为空`);
    }

    if (expectedType === 'video') {
      this.validateVideoFile(destPath, stats.size);
    }
  }

  private validateVideoFile(destPath: string, fileSize: number): void {
    const fd = fs.openSync(destPath, 'r');
    try {
      const header = Buffer.alloc(12);
      const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
      const fileTypeMarker = bytesRead >= 8 ? header.toString('ascii', 4, 8) : '';
      if (fileTypeMarker !== 'ftyp') {
        throw new Error('下载的视频文件不是有效的 MP4 内容');
      }
    } finally {
      fs.closeSync(fd);
    }

    // 极小的 mp4 往往是错误页、占位文件或只有容器壳而无真实媒体内容
    if (fileSize < 64 * 1024) {
      throw new Error(`下载的视频文件过小（${fileSize} bytes），疑似无效视频内容`);
    }

    const probeResult = spawnSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'format=duration:stream=codec_type',
      '-of', 'json',
      destPath,
    ], {
      encoding: 'utf-8',
      timeout: 10000,
    });

    if (probeResult.status === 0 && probeResult.stdout) {
      try {
        const data = JSON.parse(probeResult.stdout) as {
          format?: { duration?: string };
          streams?: Array<{ codec_type?: string }>;
        };
        const duration = Number(data.format?.duration || '0');
        const hasVideoStream = Boolean(data.streams?.some((stream) => stream.codec_type === 'video'));
        if (!hasVideoStream || !Number.isFinite(duration) || duration <= 0) {
          throw new Error('ffprobe 检测到视频时长或视频流异常');
        }
        return;
      } catch (error: any) {
        throw new Error(`下载的视频文件校验失败: ${error.message}`);
      }
    }

    // 服务器未安装 ffprobe 时，回退到更宽松但仍可拦截明显坏文件的 MP4 结构检查
    const sample = fs.readFileSync(destPath);
    const hasMoov = sample.includes(Buffer.from('moov'));
    const hasMdat = sample.includes(Buffer.from('mdat'));
    if (!hasMoov || !hasMdat) {
      throw new Error('下载的视频文件缺少有效 MP4 关键数据块');
    }
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
