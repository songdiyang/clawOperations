/**
 * 用户模型定义
 */

/** 用户角色 */
export type UserRole = 'user' | 'admin';

/** 用户实体 */
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  is_active: number; // SQLite 使用 0/1 表示布尔值
  douyin_open_id?: string | null; // 抖音 OpenID，用于 OAuth 登录
  douyin_nickname?: string | null; // 抖音昵称
  douyin_avatar?: string | null; // 抖音头像
  created_at: string;
  updated_at: string;
}

/** 用户公开信息（不包含敏感数据） */
export interface UserPublicInfo {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  is_active: boolean;
  douyin_open_id?: string | null;
  douyin_nickname?: string | null;
  douyin_avatar?: string | null;
  created_at: string;
  updated_at: string;
}

/** 创建用户 DTO */
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

/** 登录 DTO */
export interface LoginDTO {
  /** 用户名或邮箱 */
  account: string;
  password: string;
  /** 记住登录状态 */
  remember?: boolean;
}

/** 抖音 OAuth 登录 DTO */
export interface DouyinLoginDTO {
  /** 授权码 */
  code: string;
  /** 记住登录状态 */
  remember?: boolean;
}

/** 抖音用户信息 */
export interface DouyinUserInfo {
  open_id: string;
  nickname: string;
  avatar: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** 更新用户信息 DTO */
export interface UpdateUserDTO {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

/** 修改密码 DTO */
export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}

/** 登录响应 */
export interface LoginResponse {
  user: UserPublicInfo;
  token: string;
  expiresIn: number;
}

/** 用户抖音认证配置 */
export interface UserAuthConfig {
  id: number;
  user_id: number;
  client_key?: string | null;
  client_secret?: string | null;
  redirect_uri?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  open_id?: string | null;
  expires_at?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * 将数据库用户记录转换为公开信息
 */
export function toUserPublicInfo(user: User): UserPublicInfo {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar || user.douyin_avatar,
    role: user.role,
    is_active: user.is_active === 1,
    douyin_open_id: user.douyin_open_id,
    douyin_nickname: user.douyin_nickname,
    douyin_avatar: user.douyin_avatar,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
