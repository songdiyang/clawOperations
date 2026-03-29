import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import { initPublisherFromEnv } from './services/publisher';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import publishRoutes from './routes/publish';
import aiRoutes from './routes/ai';
import userRoutes from './routes/user';

[
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的视频文件）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// 参考图等文件服务（从项目根目录）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// AI 生成的内容文件服务（视频/图片）
app.use('/generated', express.static(path.join(process.cwd(), 'generated')));

// API 路由
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/ai', aiRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    // 从环境变量加载抖音配置（如果已配置）
    const douyinConfigLoaded = initPublisherFromEnv();
    if (douyinConfigLoaded) {
      console.log('✅ 抖音应用配置已从环境变量加载');
    } else {
      console.log('⚠️  抖音应用配置未设置，请配置环境变量或通过管理界面配置');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Upload directory: ${path.join(__dirname, '../uploads')}`);
    });
  })
  .catch((error) => {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  });
