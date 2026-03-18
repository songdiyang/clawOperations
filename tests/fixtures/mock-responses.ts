/**
 * 测试固件 - Mock API 响应数据
 */

// OAuth 相关
export const mockTokenResponse = {
  data: {
    access_token: 'mock_access_token_123',
    refresh_token: 'mock_refresh_token_456',
    expires_in: 7200,
    open_id: 'mock_open_id_789',
    scope: 'video.create,video.upload',
  },
};

export const mockRefreshTokenResponse = {
  data: {
    access_token: 'mock_new_access_token_123',
    refresh_token: 'mock_new_refresh_token_456',
    expires_in: 7200,
    open_id: 'mock_open_id_789',
    scope: 'video.create,video.upload',
  },
};

// 视频上传相关
export const mockUploadInitResponse = {
  data: {
    upload_id: 'mock_upload_id_abc',
  },
};

export const mockUploadPartResponse = {
  data: {
    part_number: 1,
    etag: 'mock_etag_xyz',
  },
};

export const mockUploadCompleteResponse = {
  data: {
    video_id: 'mock_video_id_123',
    video_url: 'https://example.com/video.mp4',
  },
};

export const mockUploadByUrlResponse = {
  data: {
    video_id: 'mock_video_id_from_url',
  },
};

// 视频发布相关
export const mockVideoCreateResponse = {
  data: {
    video_id: 'mock_video_id_123',
    share_url: 'https://www.douyin.com/video/mock_video_id_123',
    create_time: Date.now(),
  },
};

export const mockVideoStatusResponse = {
  data: {
    status: 'published',
    share_url: 'https://www.douyin.com/video/mock_video_id_123',
    create_time: Date.now(),
  },
};

// 错误响应
export const mockErrorResponse = {
  data: {
    error_code: 10001,
    description: '参数错误',
  },
};

export const mockRateLimitError = {
  data: {
    error_code: 429,
    description: '请求过于频繁',
  },
};

export const mockUnauthorizedError = {
  data: {
    error_code: 401,
    description: '未授权',
  },
};
