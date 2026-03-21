import { Router } from 'express';
import { publishVideo, schedulePublish, getScheduledTasks, cancelScheduledTask, retryTask, getTaskDetail } from '../services/publisher';
import {
  VideoPublishOptions,
  ImageItem,
  ImageTextPublishOptions,
  ImageTextPublishResult,
  PublishStep,
  RetryRequest,
} from '../../../../src/models/types';

const router = Router();

// 生成唯一ID
function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 图文发布任务存储（实际应用中应该使用数据库）
interface ImageTextTask {
  id: string;
  images: ImageItem[];
  options: ImageTextPublishOptions;
  status: 'pending' | 'completed' | 'failed';
  scheduledTime?: Date;
  result?: ImageTextPublishResult;
  createdAt: Date;
}

const imageTextTasks: Map<string, ImageTextTask> = new Map();

/**
 * POST /api/publish
 * 立即发布视频
 */
router.post('/', async (req, res) => {
  try {
    const { videoPath, options, isRemoteUrl } = req.body;

    if (!videoPath) {
      return res.status(400).json({
        success: false,
        error: '缺少视频路径',
      });
    }

    const publishOptions: VideoPublishOptions = options || {};
    const result = await publishVideo(videoPath, publishOptions, isRemoteUrl);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '发布失败',
    });
  }
});

/**
 * POST /api/publish/schedule
 * 定时发布视频
 */
router.post('/schedule', async (req, res) => {
  try {
    const { videoPath, publishTime, options, isRemoteUrl } = req.body;

    if (!videoPath || !publishTime) {
      return res.status(400).json({
        success: false,
        error: '缺少视频路径或发布时间',
      });
    }

    const scheduleDate = new Date(publishTime);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '无效的发布时间',
      });
    }

    const publishOptions: VideoPublishOptions = options || {};
    const result = schedulePublish(videoPath, scheduleDate, publishOptions, isRemoteUrl);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '定时发布失败',
    });
  }
});

/**
 * GET /api/publish/tasks
 * 获取定时任务列表
 */
router.get('/tasks', (req, res) => {
  try {
    const tasks = getScheduledTasks();
    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务列表失败',
    });
  }
});

/**
 * DELETE /api/publish/tasks/:id
 * 取消定时任务
 */
router.delete('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = cancelScheduledTask(id);

    if (success) {
      res.json({
        success: true,
        message: '任务已取消',
      });
    } else {
      res.status(400).json({
        success: false,
        error: '取消任务失败，任务可能不存在或已执行',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '取消任务失败',
    });
  }
});

/**
 * GET /api/publish/tasks/:id
 * 获取任务详情
 */
router.get('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = getTaskDetail(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务详情失败',
    });
  }
});

/**
 * POST /api/publish/tasks/:id/retry
 * 重试指定任务
 */
router.post('/tasks/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromStep } = req.body;

    // 验证 fromStep 参数
    let step: PublishStep | undefined;
    if (fromStep) {
      if (!Object.values(PublishStep).includes(fromStep as PublishStep)) {
        return res.status(400).json({
          success: false,
          error: '无效的重试步骤',
        });
      }
      step = fromStep as PublishStep;
    }

    const result = await retryTask(id, step);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重试任务失败',
    });
  }
});

/**
 * POST /api/publish/retry
 * 直接重试发布（不依赖任务ID）
 */
router.post('/retry', async (req, res) => {
  try {
    const { originalParams, fromStep, uploadedVideoId } = req.body as RetryRequest;

    if (!originalParams || !originalParams.videoPath) {
      return res.status(400).json({
        success: false,
        error: '缺少原始发布参数',
      });
    }

    // 验证 fromStep 参数
    let step: PublishStep | undefined;
    if (fromStep) {
      if (!Object.values(PublishStep).includes(fromStep as PublishStep)) {
        return res.status(400).json({
          success: false,
          error: '无效的重试步骤',
        });
      }
      step = fromStep as PublishStep;
    }

    const result = await publishVideo(
      originalParams.videoPath,
      originalParams.options,
      originalParams.isRemoteUrl
    );

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重试发布失败',
    });
  }
});

// ==================== 图文发布接口 ====================

/**
 * POST /api/publish/image-text
 * 立即发布图文内容
 */
router.post('/image-text', async (req, res) => {
  try {
    const { images, options } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少图片数据',
      });
    }

    if (images.length > 9) {
      return res.status(400).json({
        success: false,
        error: '最多只能上传9张图片',
      });
    }

    // 创建图文发布任务
    const taskId = generateId();
    const task: ImageTextTask = {
      id: taskId,
      images: images as ImageItem[],
      options: options || {},
      status: 'pending',
      createdAt: new Date(),
    };

    // 模拟图文发布处理（实际应该调用抖音图文发布API）
    // 这里先返回成功，实际实现需要对接抖音图文发布能力
    const result: ImageTextPublishResult = {
      success: true,
      itemId: taskId,
      shareUrl: `https://www.douyin.com/note/${taskId}`,
      createTime: Date.now(),
    };

    task.status = 'completed';
    task.result = result;
    imageTextTasks.set(taskId, task);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '图文发布失败',
    });
  }
});

/**
 * POST /api/publish/image-text/schedule
 * 定时发布图文内容
 */
router.post('/image-text/schedule', async (req, res) => {
  try {
    const { images, publishTime, options } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少图片数据',
      });
    }

    if (!publishTime) {
      return res.status(400).json({
        success: false,
        error: '缺少发布时间',
      });
    }

    if (images.length > 9) {
      return res.status(400).json({
        success: false,
        error: '最多只能上传9张图片',
      });
    }

    const scheduleDate = new Date(publishTime);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '无效的发布时间',
      });
    }

    // 创建定时图文发布任务
    const taskId = generateId();
    const task: ImageTextTask = {
      id: taskId,
      images: images as ImageItem[],
      options: options || {},
      status: 'pending',
      scheduledTime: scheduleDate,
      createdAt: new Date(),
    };

    imageTextTasks.set(taskId, task);

    // 设置定时器执行发布
    const delay = scheduleDate.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        const existingTask = imageTextTasks.get(taskId);
        if (existingTask && existingTask.status === 'pending') {
          // 执行发布
          existingTask.status = 'completed';
          existingTask.result = {
            success: true,
            itemId: taskId,
            shareUrl: `https://www.douyin.com/note/${taskId}`,
            createTime: Date.now(),
          };
          imageTextTasks.set(taskId, existingTask);
        }
      }, delay);
    }

    res.json({
      success: true,
      data: {
        taskId,
        scheduledTime: scheduleDate.toISOString(),
        status: 'pending',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '定时图文发布失败',
    });
  }
});

/**
 * GET /api/publish/image-text/tasks
 * 获取图文发布任务列表
 */
router.get('/image-text/tasks', (req, res) => {
  try {
    const tasks = Array.from(imageTextTasks.values()).map(task => ({
      id: task.id,
      imageCount: task.images.length,
      status: task.status,
      scheduledTime: task.scheduledTime?.toISOString(),
      createdAt: task.createdAt.toISOString(),
      result: task.result,
    }));

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取图文任务列表失败',
    });
  }
});

/**
 * DELETE /api/publish/image-text/tasks/:id
 * 取消定时图文发布任务
 */
router.delete('/image-text/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = imageTextTasks.get(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '只能取消待执行的任务',
      });
    }

    imageTextTasks.delete(id);

    res.json({
      success: true,
      message: '图文发布任务已取消',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '取消图文任务失败',
    });
  }
});

export default router;
