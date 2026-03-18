import cron from 'node-cron';
import { PublishService } from './publish-service';
import { PublishTaskConfig, ScheduleResult } from '../models/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('SchedulerService');

/**
 * 定时任务信息
 */
interface ScheduledTask {
  id: string;
  config: PublishTaskConfig;
  scheduledTime: Date;
  cronJob: cron.ScheduledTask;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
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
  schedulePublish(config: PublishTaskConfig, publishTime: Date): ScheduleResult {
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
    };
    this.tasks.set(taskId, task);

    return {
      taskId,
      scheduledTime: publishTime,
      status: 'pending',
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
  listScheduledTasks(): ScheduleResult[] {
    const results: ScheduleResult[] = [];
    
    for (const task of this.tasks.values()) {
      results.push({
        taskId: task.id,
        scheduledTime: task.scheduledTime,
        status: task.status,
      });
    }

    return results.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * 获取任务详情
   * @param taskId 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): ScheduleResult | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }

    return {
      taskId: task.id,
      scheduledTime: task.scheduledTime,
      status: task.status,
    };
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
      const result = await this.publishService.publishVideo(task.config);
      
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      
      logger.info(`定时任务执行完成: ${taskId}, 状态: ${task.status}`);
    } catch (error) {
      task.status = 'failed';
      task.result = error;
      
      logger.error(`定时任务执行失败: ${taskId}, 错误: ${error instanceof Error ? error.message : String(error)}`);
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
