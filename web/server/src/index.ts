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
import systemRoutes from './routes/system';
import { systemConfigService } from './services/system-config-service';

// 获取项目根目录（处理编译后路径问题）
const getProjectRoot = () => {
  const cwd = process.cwd();
  // 检查是否在 clawoperations 目录下
  if (cwd.toLowerCase().includes('clawoperations')) {
    // 移除可能的 web/server 或 dist 后缀
    return cwd.replace(/[\/]web[\/]server.*$/, '').replace(/[\/]dist.*$/, '');
  }
  return cwd;
};

const projectRoot = getProjectRoot();

// 加载环境变量（使用项目根目录）
const envPath = path.join(projectRoot, '.env');
console.log(`📂 Project root: ${projectRoot}`);
console.log(`🔑 Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的视频文件）
app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));
// AI 生成的内容文件服务（视频/图片）
app.use('/generated', express.static(path.join(projectRoot, 'generated')));

// API 路由
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);

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
  .then(async () => {
    // 从数据库加载系统配置到环境变量
    await systemConfigService.loadConfigToEnv();
    
    // 从环境变量加载抖音配置（如果已配置）
    const douyinConfigLoaded = initPublisherFromEnv();
    if (douyinConfigLoaded) {
      console.log('✅ 抖音应用配置已从环境变量加载');
    } else {
      console.log('⚠️  抖音应用配置未设置，请配置环境变量或通过管理界面配置');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Upload directory: ${path.join(projectRoot, 'uploads')}`);
      console.log(`📁 Generated directory: ${path.join(projectRoot, 'generated')}`);
    });
  })
  .catch((error) => {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  });
