import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

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
};

// AI 创作相关 API
export const aiApi = {
  /** 分析用户需求 */
  analyze: (input: string, contentTypePreference?: 'image' | 'video') =>
    client.post('/ai/analyze', { input, contentTypePreference }),
  
  /** 生成内容（图片/视频） */
  generate: (analysis: any) =>
    client.post('/ai/generate', { analysis }),
  
  /** 生成文案 */
  getCopywriting: (analysis: any) =>
    client.post('/ai/copywriting', { analysis }),
  
  /** 快速生成文案 */
  quickCopywriting: (theme: string, keyPoints?: string[]) =>
    client.post('/ai/quick-copywriting', { theme, keyPoints }),
  
  /** 一键创建（不发布） */
  create: (input: string, config?: {
    contentTypePreference?: 'image' | 'video' | 'auto';
    overrides?: any;
  }) => client.post('/ai/create', { input, config }),
  
  /** 一键创建并发布 */
  createAndPublish: (input: string, config?: {
    contentTypePreference?: 'image' | 'video' | 'auto';
    scheduleTime?: string;
    overrides?: any;
  }) => client.post('/ai/publish', { input, config }),
  
  /** 查询任务状态 */
  getTaskStatus: (taskId: string) =>
    client.get(`/ai/task/${taskId}`),
  
  /** 获取所有任务 */
  getTasks: () => client.get('/ai/tasks'),
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
