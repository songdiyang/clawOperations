/**
 * ClawPublisher 使用示例
 * 
 * 这个示例展示了如何使用 ClawPublisher 进行抖音视频发布
 */

import { ClawPublisher } from './src/index';

// ==================== 初始化 ====================

// 方式 1: 使用预置的 Token（推荐用于生产环境）
const publisher = new ClawPublisher({
  clientKey: 'your_client_key',
  clientSecret: 'your_client_secret',
  redirectUri: 'https://your-domain.com/callback',
  accessToken: 'your_access_token',
  refreshToken: 'your_refresh_token',
  openId: 'your_open_id',
});

// 方式 2: 首次授权（需要用户交互）
const publisherForAuth = new ClawPublisher({
  clientKey: 'your_client_key',
  clientSecret: 'your_client_secret',
  redirectUri: 'https://your-domain.com/callback',
});

// 获取授权 URL，引导用户访问
const authUrl = publisherForAuth.getAuthUrl();
console.log('请访问以下链接进行授权:', authUrl);

// 用户授权后，使用回调的 code 获取 Token
async function handleCallback(code: string) {
  const tokenInfo = await publisherForAuth.handleAuthCallback(code);
  console.log('Token 获取成功:', tokenInfo);
  // 保存 tokenInfo 供后续使用
}

// ==================== 视频上传 ====================

async function uploadVideoExample() {
  // 上传本地视频
  const videoId = await publisher.uploadVideo(
    '/path/to/your/video.mp4',
    (progress) => {
      console.log(`上传进度: ${progress.percentage}%`);
    }
  );
  console.log('视频上传成功，ID:', videoId);
  return videoId;
}

// ==================== 视频发布 ====================

async function publishVideoExample() {
  // 方式 1: 一站式发布（上传 + 发布）
  const result = await publisher.publishVideo({
    videoPath: '/path/to/your/video.mp4',
    options: {
      title: '美味小龙虾制作教程',
      description: '今天教大家做麻辣小龙虾',
      hashtags: ['美食', '小龙虾', '教程', '家常菜'],
      poiId: 'some_poi_id', // 地理位置
      poiName: '武汉光谷',
    },
  });

  if (result.success) {
    console.log('发布成功！');
    console.log('视频 ID:', result.videoId);
    console.log('分享链接:', result.shareUrl);
  } else {
    console.error('发布失败:', result.error);
  }
}

async function publishWithAdvancedOptions() {
  // 高级发布选项
  const result = await publisher.publishVideo({
    videoPath: '/path/to/your/video.mp4',
    options: {
      title: '夏日限定｜麻辣小龙虾',
      description: '夏天到了，小龙虾吃起来！\n今天分享一个超简单的做法',
      hashtags: ['美食', '小龙虾', '夏日美食', '夜宵', '武汉'],
      atUsers: ['friend_open_id_1', 'friend_open_id_2'],
      poiId: 'poi_123456',
      poiName: '武汉光谷步行街',
      microAppId: 'app_xxx', // 挂载小程序
      microAppTitle: '查看完整食谱',
      microAppUrl: 'https://example.com/recipe',
      articleId: 'product_xxx', // 挂载商品
    },
  });

  return result;
}

// ==================== 定时发布 ====================

async function schedulePublishExample() {
  // 设置定时发布（例如：明天上午 10 点）
  const tomorrow10AM = new Date();
  tomorrow10AM.setDate(tomorrow10AM.getDate() + 1);
  tomorrow10AM.setHours(10, 0, 0, 0);

  const scheduleResult = publisher.scheduleVideo(
    {
      videoPath: '/path/to/your/video.mp4',
      options: {
        title: '定时发布的视频',
        description: '这是一条定时发布的视频',
        hashtags: ['测试', '定时发布'],
      },
    },
    tomorrow10AM
  );

  console.log('定时任务已创建:', scheduleResult.taskId);
  console.log('计划发布时间:', scheduleResult.scheduledTime);

  // 查看所有定时任务
  const tasks = publisher.listScheduledTasks();
  console.log('所有定时任务:', tasks);

  // 如果需要取消定时任务
  // publisher.cancelSchedule(scheduleResult.taskId);
}

// ==================== 从 URL 发布 ====================

async function publishFromUrlExample() {
  // 从远程 URL 下载并发布
  const result = await publisher.downloadAndPublish(
    'https://example.com/video.mp4',
    {
      title: '从 URL 发布的视频',
      description: '这个视频是从远程 URL 下载并发布的',
      hashtags: ['URL', '远程'],
    }
  );

  return result;
}

// ==================== 视频管理 ====================

async function videoManagementExample(videoId: string) {
  // 查询视频状态
  const status = await publisher.queryVideoStatus(videoId);
  console.log('视频状态:', status.status);
  console.log('分享链接:', status.shareUrl);

  // 删除视频
  // await publisher.deleteVideo(videoId);
}

// ==================== 完整工作流示例 ====================

async function completeWorkflow() {
  try {
    // 1. 检查 Token 是否有效
    if (!publisher.isTokenValid()) {
      console.log('Token 已过期，正在刷新...');
      await publisher.refreshToken();
    }

    // 2. 发布视频
    const result = await publisher.publishVideo({
      videoPath: '/path/to/video.mp4',
      options: {
        title: '【夏日特辑】正宗潜江小龙虾做法',
        description: '今天给大家带来正宗的潜江小龙虾做法，麻辣鲜香，超级好吃！\n\n食材准备：\n- 小龙虾 2斤\n- 干辣椒、花椒\n- 葱姜蒜\n\n#小龙虾 #美食教程 #夏日美食',
        hashtags: ['小龙虾', '美食教程', '夏日美食', '潜江小龙虾', '家常菜'],
        poiId: 'poi_wuhan',
        poiName: '武汉市',
      },
    });

    if (result.success) {
      console.log('✅ 视频发布成功！');
      console.log('📹 视频 ID:', result.videoId);
      console.log('🔗 分享链接:', result.shareUrl);
      
      // 3. 查询视频状态
      const status = await publisher.queryVideoStatus(result.videoId!);
      console.log('📊 视频状态:', status.status);
    } else {
      console.error('❌ 发布失败:', result.error);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 运行示例
// completeWorkflow();
