import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadVideo } from '../services/publisher';

const router = Router();

// 确保上传目录存在 (使用与 index.ts 静态文件服务一致的路径)
const uploadsDir = path.join(__dirname, '../../uploads/');
const imagesDir = path.join(__dirname, '../../uploads/images/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 配置视频 multer 存储
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 配置图片 multer 存储
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 视频文件过滤器
const videoFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 MP4, MOV, AVI, WebM, MKV 格式的视频文件'));
  }
};

// 图片文件过滤器
const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 JPG, PNG, GIF, WebP 格式的图片文件'));
  }
};

// 视频上传配置
const uploadVideo_multer = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // 4GB
  },
});

// 图片上传配置
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per image
  },
});

/**
 * POST /api/upload
 * 上传视频文件
 */
router.post('/', uploadVideo_multer.single('video'), async (req, res) => {
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

// ==================== 图片上传接口 ====================

/**
 * POST /api/upload/image
 * 单图上传
 */
router.post('/image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件',
      });
    }

    // 构建访问 URL
    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '图片上传失败',
    });
  }
});

/**
 * POST /api/upload/images
 * 批量图片上传（最多9张）
 */
router.post('/images', uploadImage.array('images', 9), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件',
      });
    }

    const images = files.map((file, index) => ({
      url: `/uploads/images/${file.filename}`,
      fileName: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      order: index,
    }));

    res.json({
      success: true,
      data: {
        images,
        count: images.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '图片批量上传失败',
    });
  }
});

/**
 * DELETE /api/upload/image/:filename
 * 删除已上传的图片
 */
router.delete('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(imagesDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: '图片已删除',
      });
    } else {
      res.status(404).json({
        success: false,
        error: '图片不存在',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除图片失败',
    });
  }
});

export default router;
