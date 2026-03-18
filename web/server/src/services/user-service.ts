import bcrypt from 'bcryptjs';
import { getDatabase, saveDatabase } from '../database';
import {
  User,
  UserPublicInfo,
  CreateUserDTO,
  UpdateUserDTO,
  toUserPublicInfo,
} from '../models/user';

const SALT_ROUNDS = 10;

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDTO): Promise<UserPublicInfo> {
    const db = getDatabase();

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(dto.username)) {
      throw new Error('用户名必须是 3-20 位字母、数字或下划线');
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw new Error('邮箱格式不正确');
    }

    // 验证密码强度
    if (dto.password.length < 8) {
      throw new Error('密码长度至少 8 位');
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(dto.password)) {
      throw new Error('密码必须包含字母和数字');
    }

    // 检查用户名是否已存在
    const existingUsername = this.findByUsername(dto.username);
    if (existingUsername) {
      throw new Error('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingEmail = this.findByEmail(dto.email);
    if (existingEmail) {
      throw new Error('邮箱已被注册');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 获取新 ID
    const meta = db.get('_meta').value();
    const newId = meta.nextUserId;
    db.set('_meta.nextUserId', newId + 1).write();

    // 创建用户
    const now = new Date().toISOString();
    const newUser: User = {
      id: newId,
      username: dto.username,
      email: dto.email,
      password_hash: passwordHash,
      phone: dto.phone || null,
      avatar: null,
      role: 'user',
      is_active: 1,
      created_at: now,
      updated_at: now,
    };

    db.get('users').push(newUser).write();

    return toUserPublicInfo(newUser);
  }

  /**
   * 通过用户名查找用户
   */
  findByUsername(username: string): User | null {
    const db = getDatabase();
    const user = db.get('users').find({ username }).value();
    return user || null;
  }

  /**
   * 通过邮箱查找用户
   */
  findByEmail(email: string): User | null {
    const db = getDatabase();
    const user = db.get('users').find({ email }).value();
    return user || null;
  }

  /**
   * 通过 ID 查找用户
   */
  findById(id: number): User | null {
    const db = getDatabase();
    const user = db.get('users').find({ id }).value();
    return user || null;
  }

  /**
   * 通过用户名或邮箱查找用户
   */
  findByAccount(account: string): User | null {
    // 先尝试用户名
    let user = this.findByUsername(account);
    if (user) return user;

    // 再尝试邮箱
    user = this.findByEmail(account);
    return user;
  }

  /**
   * 验证密码
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: number, dto: UpdateUserDTO): Promise<UserPublicInfo> {
    const db = getDatabase();
    const user = this.findById(userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    const updates: Partial<User> = {};

    if (dto.username !== undefined) {
      // 验证用户名格式
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(dto.username)) {
        throw new Error('用户名必须是 3-20 位字母、数字或下划线');
      }
      // 检查是否与其他用户冲突
      const existing = this.findByUsername(dto.username);
      if (existing && existing.id !== userId) {
        throw new Error('用户名已被使用');
      }
      updates.username = dto.username;
    }

    if (dto.email !== undefined) {
      // 验证邮箱格式
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
        throw new Error('邮箱格式不正确');
      }
      // 检查是否与其他用户冲突
      const existing = this.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new Error('邮箱已被注册');
      }
      updates.email = dto.email;
    }

    if (dto.phone !== undefined) {
      updates.phone = dto.phone || null;
    }

    if (dto.avatar !== undefined) {
      updates.avatar = dto.avatar || null;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      db.get('users').find({ id: userId }).assign(updates).write();
    }

    const updatedUser = this.findById(userId);
    if (!updatedUser) {
      throw new Error('更新用户失败');
    }

    return toUserPublicInfo(updatedUser);
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const db = getDatabase();
    const user = this.findById(userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证旧密码
    const isValid = await this.validatePassword(user, oldPassword);
    if (!isValid) {
      throw new Error('原密码错误');
    }

    // 验证新密码强度
    if (newPassword.length < 8) {
      throw new Error('新密码长度至少 8 位');
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      throw new Error('新密码必须包含字母和数字');
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 更新密码
    db.get('users')
      .find({ id: userId })
      .assign({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .write();
  }

  /**
   * 获取用户公开信息
   */
  getUserPublicInfo(userId: number): UserPublicInfo | null {
    const user = this.findById(userId);
    if (!user) {
      return null;
    }
    return toUserPublicInfo(user);
  }
}

// 导出单例
export const userService = new UserService();
