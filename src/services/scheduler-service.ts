import cron from 'node-cron';
import { PublishService } from './publish-service';
import {
  PublishTaskConfig,
  ScheduleResult,
  ScheduleResultExtended,
  PublishResultExtended,
  PublishStep,
  PublishErrorType,
} from '../models/types';
import { classifyError } from '../utils/error-classifier';
import { createLogger } from '../utils/logger';

const logger = createLogger('SchedulerService');

/**
 * 定时任务信息（内部使用，包含完整信息）
 */
interface ScheduledTask {
  id: string;
  config: PublishTaskConfig;
  scheduledTime: Date;
  cronJob: cron.ScheduledTask;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: PublishResultExtended;
  /** 已上传的视频ID（用于重试） */
  uploadedVideoId?: string;
  /** 错误类型 */
  errorType?: PublishErrorType;
  /** 是否可重试 */
  retryable?: boolean;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 定时发布调度服务
 */
export class SchedulerService {
  private publishService: PublishService;
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor(publishService: PublishService) {
    this.publishService = publishService;
  }

  /**
   * 注册定时发布任务
   * @param config 发布任务配置
   * @param publishTime 发布时间
   * @returns 任务信息
   */
  schedulePublish(config: PublishTaskConfig, publishTime: Date): ScheduleResultExtended {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 验证时间
    if (publishTime <= new Date()) {
      throw new Error('定时发布时间必须晚于当前时间');
    }

    // 计算 cron 表达式
    const cronExpression = this.dateToCron(publishTime);
    logger.info(`创建定时任务: ${taskId}, 执行时间: ${publishTime.toLocaleString()}`);

    // 创建 cron 任务
    const cronJob = cron.schedule(cronExpression, async () => {
      await this.executeTask(taskId);
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai',
    });

    // 存储任务
    const task: ScheduledTask = {
      id: taskId,
      config,
      scheduledTime: publishTime,
      cronJob,
      status: 'pending',
      retryCount: 0,
    };
    this.tasks.set(taskId, task);

    return {
      taskId,
      scheduledTime: publishTime,
      status: 'pending',
      config,
    };
  }

  /**
   * 取消定时任务
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelSchedule(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      logger.warn(`任务不存在: ${taskId}`);
      return false;
    }

    if (task.status !== 'pending') {
      logger.warn(`任务状态不是 pending，无法取消: ${taskId}`);
      return false;
    }

    task.cronJob.stop();
    task.status = 'cancelled';
    logger.info(`任务已取消: ${taskId}`);

    return true;
  }

  /**
   * 列出所有待发布的任务
   * @returns 任务列表
   */
  listScheduledTasks(): ScheduleResultExtended[] {
    const results: ScheduleResultExtended[] = [];
    
    for (const task of this.tasks.values()) {
      results.push({
        taskId: task.id,
        scheduledTime: task.scheduledTime,
        status: task.status,
        config: task.config,
        result: task.result,
        errorType: task.errorType,
        retryable: task.retryable,
      });
    }

    return results.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * 获取任务详情
   * @param taskId 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): ScheduleResultExtended | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }

    return {
      taskId: task.id,
      scheduledTime: task.scheduledTime,
      status: task.status,
      config: task.config,
      result: task.result,
      errorType: task.errorType,
      retryable: task.retryable,
    };
  }

  /**
   * 获取任务完整详情（内部使用）
   * @param taskId 任务 ID
   * @returns 完整任务信息
   */
  getTaskDetail(taskId: string): ScheduledTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 执行定时任务
   * @param taskId 任务 ID
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    
    if (!task || task.status !== 'pending') {
      return;
    }

    logger.info(`执行定时任务: ${taskId}`);

    try {
      const result = await this.publishService.publishVideo(task.config, {
        uploadedVideoId: task.uploadedVideoId,
        retryCount: task.retryCount,
      });
      
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      
      // 保存错误信息用于重试
      if (!result.success) {
        task.errorType = result.errorType;
        task.retryable = result.retryable;
        task.uploadedVideoId = result.uploadedVideoId;
      }
      
      logger.info(`定时任务执行完成: ${taskId}, 状态: ${task.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error instanceof Error ? error : errorMessage);
      
      task.status = 'failed';
      task.result = {
        success: false,
        error: errorMessage,
        errorType: classification.type,
        retryable: classification.retryable,
        friendlyMessage: classification.message,
        suggestion: classification.suggestion,
        originalParams: task.config,
      };
      task.errorType = classification.type;
      task.retryable = classification.retryable;
      
      logger.error(`定时任务执行失败: ${taskId}, 错误: ${errorMessage}`);
    }
  }

  /**
   * 重试失败的任务
   * @param taskId 任务 ID
   * @param fromStep 从哪个步骤开始重试
   * @returns 发布结果
   */
  async retryTask(taskId: string, fromStep?: PublishStep): Promise<PublishResultExtended> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return {
        success: false,
        error: '任务不存在',
        errorType: PublishErrorType.UNKNOWN,
        retryable: false,
      };
    }

    if (task.status !== 'failed') {
      return {
        success: false,
        error: '只能重试失败的任务',
        errorType: PublishErrorType.UNKNOWN,
        retryable: false,
      };
    }

    if (!task.retryable) {
      return {
        success: false,
        error: '该任务不支持重试',
        errorType: task.errorType,
        retryable: false,
        friendlyMessage: task.result?.friendlyMessage,
        suggestion: task.result?.suggestion,
      };
    }

    logger.info(`重试任务: ${taskId}, 从步骤: ${fromStep || 'validate'}`);

    // 更新重试次数
    task.retryCount++;
    task.status = 'pending';

    try {
      const result = await this.publishService.publishVideo(task.config, {
        fromStep,
        uploadedVideoId: task.uploadedVideoId,
        retryCount: task.retryCount,
      });

      task.status = result.success ? 'completed' : 'failed';
      task.result = result;

      if (!result.success) {
        task.errorType = result.errorType;
        task.retryable = result.retryable;
        task.uploadedVideoId = result.uploadedVideoId;
      }

      logger.info(`任务重试完成: ${taskId}, 状态: ${task.status}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const classification = classifyError(error instanceof Error ? error : errorMessage);

      task.status = 'failed';
      const failedResult: PublishResultExtended = {
        success: false,
        error: errorMessage,
        errorType: classification.type,
        retryable: classification.retryable,
        friendlyMessage: classification.message,
        suggestion: classification.suggestion,
        originalParams: task.config,
        retryCount: task.retryCount,
      };
      
      task.result = failedResult;
      task.errorType = classification.type;
      task.retryable = classification.retryable;

      logger.error(`任务重试失败: ${taskId}, 错误: ${errorMessage}`);
      return failedResult;
    }
  }

  /**
   * 将日期转换为 cron 表达式
   * @param date 日期
   * @returns cron 表达式
   */
  private dateToCron(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minutes} ${hours} ${day} ${month} *`;
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedTasks(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        this.tasks.delete(taskId);
      }
    }
    logger.info('已清理完成的任务');
  }

  /**
   * 停止所有任务
   */
  stopAll(): void {
    for (const task of this.tasks.values()) {
      task.cronJob.stop();
    }
    logger.info('所有定时任务已停止');
  }
}

export default SchedulerService;
