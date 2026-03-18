import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default client;
