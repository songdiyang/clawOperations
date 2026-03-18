import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadVideo } from '../services/publisher';

const router = Router();

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 文件过滤器
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 MP4, MOV, AVI 格式的视频文件'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // 4GB
  },
});

/**
 * POST /api/upload
 * 上传视频文件
 */
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件',
      });
    }

    const filePath = req.file.path;
    
    // 上传视频到抖音
    const videoId = await uploadVideo(filePath, (progress) => {
      // 这里可以通过 WebSocket 发送进度，暂时直接返回
      console.log(`上传进度: ${progress.percentage}%`);
    });

    res.json({
      success: true,
      data: {
        videoId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    });
  }
});

/**
 * POST /api/upload/url
 * 从 URL 上传视频
 */
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少视频 URL',
      });
    }

    const { uploadFromUrl } = await import('../services/publisher');
    const videoId = await uploadFromUrl(url);

    res.json({
      success: true,
      data: { videoId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '从 URL 上传失败',
    });
  }
});

export default router;
