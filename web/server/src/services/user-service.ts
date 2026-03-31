import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool, toMysqlDatetime, fromMysqlDatetime } from '../database';
import {
  User,
  UserPublicInfo,
  CreateUserDTO,
  UpdateUserDTO,
  DouyinUserInfo,
  toUserPublicInfo,
} from '../models/user';

const SALT_ROUNDS = 10;

/**
 * 将 MySQL 行数据转换为 User 对象
 */
function rowToUser(row: RowDataPacket): User {
  return {
    id: row.id as number,
    username: row.username as string,
    email: row.email as string,
    password_hash: row.password_hash as string,
    phone: row.phone as string | null,
    avatar: row.avatar as string | null,
    role: row.role as 'user' | 'admin',
    is_active: row.is_active as number,
    douyin_open_id: row.douyin_open_id as string | null,
    douyin_nickname: row.douyin_nickname as string | null,
    douyin_avatar: row.douyin_avatar as string | null,
    created_at: fromMysqlDatetime(row.created_at as string) || new Date().toISOString(),
    updated_at: fromMysqlDatetime(row.updated_at as string) || new Date().toISOString(),
  };
}

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDTO): Promise<UserPublicInfo> {
    const pool = getPool();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(dto.username)) {
      throw new Error('用户名必须是 3-20 位字母、数字或下划线');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw new Error('邮箱格式不正确');
    }
    if (dto.password.length < 8) {
      throw new Error('密码长度至少 8 位');
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(dto.password)) {
      throw new Error('密码必须包含字母和数字');
    }

    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) throw new Error('用户名已被使用');

    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) throw new Error('邮箱已被注册');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const now = toMysqlDatetime();

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash, phone, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [dto.username, dto.email, passwordHash, dto.phone || null, 'user', 1, now, now]
    );

    const newUser = await this.findById(result.insertId);
    return toUserPublicInfo(newUser!);
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  }

  /**
   * 通过 ID 查找用户
   */
  async findById(id: number): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  }

  /**
   * 通过用户名或邮箱查找用户
   */
  async findByAccount(account: string): Promise<User | null> {
    let user = await this.findByUsername(account);
    if (user) return user;
    return this.findByEmail(account);
  }

  /**
   * 通过抖音 OpenID 查找用户
   */
  async findByDouyinOpenId(openId: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE douyin_open_id = ?',
      [openId]
    );
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  }

  /**
   * 通过抖音 OAuth 创建或更新用户
   */
  async createOrUpdateFromDouyin(douyinInfo: DouyinUserInfo): Promise<UserPublicInfo> {
    const pool = getPool();
    const existingUser = await this.findByDouyinOpenId(douyinInfo.open_id);

    if (existingUser) {
      const now = toMysqlDatetime();
      await pool.execute(
        'UPDATE users SET douyin_nickname=?, douyin_avatar=?, updated_at=? WHERE id=?',
        [douyinInfo.nickname, douyinInfo.avatar, now, existingUser.id]
      );
      const updatedUser = await this.findById(existingUser.id);
      return toUserPublicInfo(updatedUser!);
    }

    const now = toMysqlDatetime();
    const randomUsername = `douyin_${douyinInfo.open_id.substring(0, 8)}_${Date.now().toString(36)}`;
    const randomPassword = await bcrypt.hash(Math.random().toString(36), SALT_ROUNDS);

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash, avatar, role, is_active, douyin_open_id, douyin_nickname, douyin_avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        randomUsername,
        `${randomUsername}@douyin.temp`,
        randomPassword,
        douyinInfo.avatar,
        'user',
        1,
        douyinInfo.open_id,
        douyinInfo.nickname,
        douyinInfo.avatar,
        now,
        now,
      ]
    );

    const newUser = await this.findById(result.insertId);
    return toUserPublicInfo(newUser!);
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
    const pool = getPool();
    const user = await this.findById(userId);
    if (!user) throw new Error('用户不存在');

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (dto.username !== undefined) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(dto.username)) throw new Error('用户名必须是 3-20 位字母、数字或下划线');
      const existing = await this.findByUsername(dto.username);
      if (existing && existing.id !== userId) throw new Error('用户名已被使用');
      setClauses.push('username = ?');
      values.push(dto.username);
    }

    if (dto.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) throw new Error('邮箱格式不正确');
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== userId) throw new Error('邮箱已被注册');
      setClauses.push('email = ?');
      values.push(dto.email);
    }

    if (dto.phone !== undefined) {
      setClauses.push('phone = ?');
      values.push(dto.phone || null);
    }

    if (dto.avatar !== undefined) {
      setClauses.push('avatar = ?');
      values.push(dto.avatar || null);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      values.push(toMysqlDatetime());
      values.push(userId);
      await pool.execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    const updatedUser = await this.findById(userId);
    if (!updatedUser) throw new Error('更新用户失败');
    return toUserPublicInfo(updatedUser);
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const pool = getPool();
    const user = await this.findById(userId);
    if (!user) throw new Error('用户不存在');

    const isValid = await this.validatePassword(user, oldPassword);
    if (!isValid) throw new Error('原密码错误');

    if (newPassword.length < 8) throw new Error('新密码长度至少 8 位');
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) throw new Error('新密码必须包含字母和数字');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, toMysqlDatetime(), userId]
    );
  }

  /**
   * 获取用户公开信息
   */
  async getUserPublicInfo(userId: number): Promise<UserPublicInfo | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    return toUserPublicInfo(user);
  }
}

export const userService = new UserService();
