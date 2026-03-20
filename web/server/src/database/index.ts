import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';
import fs from 'fs';
import { User, UserAuthConfig } from '../models/user';

// 数据库类型定义
interface DatabaseSchema {
  users: User[];
  user_auth_configs: UserAuthConfig[];
  app_config: {
    douyin: {
      client_key: string | null;
      client_secret: string | null;
      redirect_uri: string | null;
      access_token: string | null;
      refresh_token: string | null;
      open_id: string | null;
      expires_at: number | null;
      updated_at: string | null;
    };
    ai: {
      deepseek_api_key: string | null;
      updated_at: string | null;
    };
  };
  _meta: {
    nextUserId: number;
    nextAuthConfigId: number;
  };
}

// 数据库文件路径
const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'db.json');

// 确保数据目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 初始化数据库
const adapter = new FileSync<DatabaseSchema>(DB_PATH);
const db = low(adapter);

// 设置默认数据
db.defaults({
  users: [],
  user_auth_configs: [],
  app_config: {
    douyin: {
      client_key: null,
      client_secret: null,
      redirect_uri: null,
      access_token: null,
      refresh_token: null,
      open_id: null,
      expires_at: null,
      updated_at: null,
    },
    ai: {
      deepseek_api_key: null,
      updated_at: null,
    },
  },
  _meta: {
    nextUserId: 1,
    nextAuthConfigId: 1,
  },
}).write();

console.log('📦 Database initialized successfully');

/**
 * 获取数据库实例
 */
export function getDatabase() {
  return db;
}

/**
 * 保存数据库（lowdb 自动保存，此函数保持兼容性）
 */
export function saveDatabase(): void {
  db.write();
}

/**
 * 初始化数据库（兼容异步接口）
 */
export async function initDatabase(): Promise<typeof db> {
  return db;
}

/**
 * 关闭数据库（lowdb 不需要关闭）
 */
export function closeDatabase(): void {
  console.log('📦 Database connection closed');
}

// 进程退出时的清理
process.on('exit', () => {
  closeDatabase();
});

process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default db;
