import axios from 'axios';

// 根据环境自动选择 API 地址
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token 存储键
const TOKEN_KEY = 'clawops_token';
const USER_KEY = 'clawops_user';

// 获取存储的 Token
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// 存储 Token
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// 清除 Token
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// 获取存储的用户信息
export function getStoredUser(): any | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

// 存储用户信息
export function setStoredUser(user: any): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// AI 生成用的长超时客户端 (10分钟，视频生成需要较长时间)
const aiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 分钟
  headers: {
    'Content-Type': 'application/json',
  },
});

// 为 aiClient 添加相同的拦截器
aiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

aiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// 请求拦截器 - 自动添加 Token
client.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理 401 错误
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 无效或过期，清除存储
      clearStoredToken();
      // 发布自定义事件通知应用
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// 认证相关 API
export const authApi = {
  getStatus: () => client.get('/auth/status'),
  setConfig: (config: {
    clientKey: string;
    clientSecret: string;
    redirectUri: string;
    accessToken?: string;
    refreshToken?: string;
    openId?: string;
  }) => client.post('/auth/config', config),
  getAuthUrl: () => client.get('/auth/url'),
  handleCallback: (code: string) => client.post('/auth/callback', { code }),
  refreshToken: () => client.post('/auth/refresh'),
  
  // 抖音 OAuth 登录相关
  getDouyinLoginUrl: () => client.get('/auth/login/douyin/url'),
  douyinLoginCallback: (code: string, remember?: boolean) => 
    client.post('/auth/login/douyin/callback', { code, remember }),
};

// 上传相关 API
export const uploadApi = {
  uploadFile: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    
    return client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
  uploadFromUrl: (url: string) => client.post('/upload/url', { url }),
  
  // 图片上传
  uploadImage: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return client.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
  
  // 批量图片上传
  uploadImages: (files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    
    return client.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
  
  // 删除图片
  deleteImage: (filename: string) => client.delete(`/upload/image/${filename}`),
};

// 发布相关 API
export const publishApi = {
  publish: (data: {
    videoPath: string;
    options?: {
      title?: string;
      description?: string;
      hashtags?: string[];
      atUsers?: string[];
      poiId?: string;
      poiName?: string;
      microAppId?: string;
      microAppTitle?: string;
      microAppUrl?: string;
      articleId?: string;
    };
    isRemoteUrl?: boolean;
  }) => client.post('/publish', data),
  
  schedule: (data: {
    videoPath: string;
    publishTime: string;
    options?: {
      title?: string;
      description?: string;
      hashtags?: string[];
      atUsers?: string[];
      poiId?: string;
      poiName?: string;
      microAppId?: string;
      microAppTitle?: string;
      microAppUrl?: string;
      articleId?: string;
    };
    isRemoteUrl?: boolean;
  }) => client.post('/publish/schedule', data),
  
  getTasks: () => client.get('/publish/tasks'),
  cancelTask: (taskId: string) => client.delete(`/publish/tasks/${taskId}`),
  
  // ==================== 重试相关 ====================
  
  /** 获取任务详情（包含错误信息） */
  getTaskDetail: (taskId: string) => client.get(`/publish/tasks/${taskId}`),
  
  /** 重试指定任务 */
  retryTask: (taskId: string, fromStep?: 'validate' | 'upload' | 'publish') => 
    client.post(`/publish/tasks/${taskId}/retry`, { fromStep }),
  
  /** 直接重试发布（不依赖任务ID） */
  retry: (data: {
    originalParams: {
      videoPath: string;
      options?: {
        title?: string;
        description?: string;
        hashtags?: string[];
        atUsers?: string[];
        poiId?: string;
        poiName?: string;
        microAppId?: string;
        microAppTitle?: string;
        microAppUrl?: string;
        articleId?: string;
      };
      isRemoteUrl?: boolean;
    };
    fromStep?: 'validate' | 'upload' | 'publish';
    uploadedVideoId?: string;
  }) => client.post('/publish/retry', data),
  
  // ==================== 图文发布 ====================
  
  /** 立即发布图文 */
  publishImageText: (data: {
    images: Array<{
      id: string;
      url: string;
      uploadedUrl?: string;
      title?: string;
      description?: string;
      textStyle?: {
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        backgroundColor?: string;
        position?: 'top' | 'bottom' | 'center';
        textAlign?: 'left' | 'center' | 'right';
      };
      order: number;
    }>;
    options?: {
      title?: string;
      description?: string;
      hashtags?: string[];
      atUsers?: string[];
      poiId?: string;
      poiName?: string;
    };
  }) => client.post('/publish/image-text', data),
  
  /** 定时发布图文 */
  scheduleImageText: (data: {
    images: Array<{
      id: string;
      url: string;
      uploadedUrl?: string;
      title?: string;
      description?: string;
      textStyle?: {
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        backgroundColor?: string;
        position?: 'top' | 'bottom' | 'center';
        textAlign?: 'left' | 'center' | 'right';
      };
      order: number;
    }>;
    publishTime: string;
    options?: {
      title?: string;
      description?: string;
      hashtags?: string[];
      atUsers?: string[];
      poiId?: string;
      poiName?: string;
    };
  }) => client.post('/publish/image-text/schedule', data),
  
  /** 获取图文发布任务列表 */
  getImageTextTasks: () => client.get('/publish/image-text/tasks'),
  
  /** 取消图文发布任务 */
  cancelImageTextTask: (taskId: string) => client.delete(`/publish/image-text/tasks/${taskId}`),
};

// AI 创作相关 API
export const aiApi = {
  getConfig: () => client.get('/ai/config'),

  setConfig: (config: { deepseekApiKey: string }) =>
    client.post('/ai/config', config),
  /** 分析用户需求 */
  analyze: (input: string, contentTypePreference?: 'image' | 'video') =>
    client.post('/ai/analyze', { input, contentTypePreference }),
  
  /** 生成内容（图片/视频） - 使用长超时 */
  generate: (analysis: any, options?: { videoDuration?: number }) =>
    aiClient.post('/ai/generate', { analysis, ...options }),
  
  /** 生成文案 */
  getCopywriting: (analysis: any) =>
    client.post('/ai/copywriting', { analysis }),
  
  /** 快速生成文案 */
  quickCopywriting: (theme: string, keyPoints?: string[]) =>
    client.post('/ai/quick-copywriting', { theme, keyPoints }),
  
  /** 一键创建（不发布） */
  create: (input: string, config?: {
    contentTypePreference?: 'image' | 'video' | 'auto';
    videoDuration?: number;
    overrides?: any;
  }) => client.post('/ai/create', { input, config }),
  
  /** 一键创建并发布 */
  createAndPublish: (input: string, config?: {
    contentTypePreference?: 'image' | 'video' | 'auto';
    videoDuration?: number;
    scheduleTime?: string;
    overrides?: any;
  }) => client.post('/ai/publish', { input, config }),
  
  /** 查询任务状态 */
  getTaskStatus: (taskId: string) =>
    client.get(`/ai/task/${taskId}`),
  
  /** 获取所有任务 */
  getTasks: () => client.get('/ai/tasks'),

  // ==================== 草稿管理 ====================
  
  /** 保存草稿 */
  saveDraft: (draft: {
    id?: string;
    requirement: string;
    contentTypePreference?: 'image' | 'video' | 'auto';
    videoDuration?: number;
    analysis?: any;
    content?: any;
    copywriting?: any;
    lastCompletedStep?: number;
  }) => client.post('/ai/drafts', draft),
  
  /** 获取草稿列表 */
  getDrafts: () => client.get('/ai/drafts'),
  
  /** 获取单个草稿 */
  getDraft: (id: string) => client.get(`/ai/drafts/${id}`),
  
  /** 更新草稿 */
  updateDraft: (id: string, data: any) => client.put(`/ai/drafts/${id}`, data),
  
  /** 删除草稿 */
  deleteDraft: (id: string) => client.delete(`/ai/drafts/${id}`),
  
  /** 恢复草稿继续创作 */
  resumeDraft: (id: string) => client.post(`/ai/drafts/${id}/resume`),

  // ==================== 历史记录 ====================
  
  /** 获取历史记录 */
  getHistory: (params?: { limit?: number; offset?: number }) =>
    client.get('/ai/history', { params }),
  
  /** 获取单条历史记录详情 */
  getHistoryDetail: (id: string) => client.get(`/ai/history/${id}`),

  // ==================== 模板管理 ====================
  
  /** 上传参考图 */
  uploadReferenceImage: (formData: FormData) => 
    client.post('/ai/upload-reference-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  /** 创建模板 */
  createTemplate: (template: {
    name: string;
    description?: string;
    requirement: string;
    contentTypePreference?: 'image' | 'video' | 'auto';
    tags?: string[];
    referenceImageUrl?: string;
  }) => client.post('/ai/templates', template),
  
  /** 获取模板列表 */
  getTemplates: () => client.get('/ai/templates'),
  
  /** 获取单个模板 */
  getTemplate: (id: string) => client.get(`/ai/templates/${id}`),
  
  /** 删除模板 */
  deleteTemplate: (id: string) => client.delete(`/ai/templates/${id}`),
  
  /** 使用模板（增加使用计数） */
  useTemplate: (id: string) => client.post(`/ai/templates/${id}/use`),

  // ==================== 工作流 ====================
  
  /** 开始新的创作流程 */
  startWorkflow: (data: {
    requirement?: string;
    contentTypePreference?: 'image' | 'video' | 'auto';
    videoDuration?: number;
    templateId?: string;
  }) => client.post('/ai/workflow/start', data),
  
  /** 执行单步操作 - 使用长超时 */
  executeStep: (
    taskId: string,
    step: 'analyze' | 'generate' | 'copywriting' | 'preview' | 'complete',
    options?: { videoDuration?: number }
  ) => aiClient.post('/ai/workflow/step', { taskId, step, ...options }),
  
  /** 获取下一步建议 */
  getNextAction: (taskId: string) => client.get(`/ai/workflow/${taskId}/next-action`),

  // ==================== 内容质量校验 ====================
  
  /** 内容质量校验 */
  qualityCheck: (input: {
    title: string;
    description: string;
    hashtags?: string[];
    contentType?: 'image' | 'video';
    platform?: 'douyin' | 'tiktok';
    brandName?: string;
    scheduledTime?: string;
  }) => client.post('/ai/quality-check', input),

  /** 评估营销潜力 */
  marketingEvaluate: (input: {
    title: string;
    description: string;
    hashtags?: string[];
    contentType?: 'image' | 'video';
  }) => client.post('/ai/marketing-evaluate', input),

  /** 生成内容开场钩子 */
  generateHooks: (input: {
    theme: string;
    targetAudience?: string;
    keyPoints?: string[];
  }) => client.post('/ai/generate-hooks', input),

  /** 获取营销数据分析 */
  getAnalytics: () => client.get('/ai/analytics'),
};

export default client;

// 用户认证相关 API
export const userApi = {
  /** 用户注册 */
  register: (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) => client.post('/user/register', data),

  /** 用户登录 */
  login: (data: {
    account: string;
    password: string;
    remember?: boolean;
  }) => client.post('/user/login', data),

  /** 获取当前用户信息 */
  getProfile: () => client.get('/user/profile'),

  /** 更新用户信息 */
  updateProfile: (data: {
    username?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  }) => client.put('/user/profile', data),

  /** 修改密码 */
  changePassword: (data: {
    oldPassword: string;
    newPassword: string;
  }) => client.put('/user/password', data),

  /** 登出 */
  logout: () => client.post('/user/logout'),

  /** 检查登录状态 */
  check: () => client.get('/user/check'),
};
