import { Router } from 'express';
import { publishVideo, schedulePublish, getScheduledTasks, cancelScheduledTask } from '../services/publisher';
import { VideoPublishOptions } from '../../../../src/models/types';

const router = Router();

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

export default router;
