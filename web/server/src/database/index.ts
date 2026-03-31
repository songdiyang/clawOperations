import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { User, UserAuthConfig } from '../models/user';
import { CreationTask, CreationTemplate } from '../../../../src/models/types';

// 数据库类型定义
interface DatabaseSchema {
  users: User[];
  user_auth_configs: UserAuthConfig[];
  // 创作相关
  creation_drafts: CreationTask[];
  creation_history: CreationTask[];
  creation_templates: CreationTemplate[];
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
      deepseek_base_url: string | null;
      doubao_api_key: string | null;
      doubao_base_url: string | null;
      doubao_endpoint_id_image: string | null;
      doubao_endpoint_id_video: string | null;
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
  creation_drafts: [],
  creation_history: [],
  creation_templates: [],
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
      deepseek_base_url: null,
      doubao_api_key: null,
      doubao_base_url: null,
      doubao_endpoint_id_image: null,
      doubao_endpoint_id_video: null,
      updated_at: null,
    },
  },
  _meta: {
    nextUserId: 1,
    nextAuthConfigId: 1,
  },
}).write();

// 创建默认管理员账号（如果不存在）
const createDefaultAdmin = async () => {
  const users = db.get('users').value();
  const adminExists = users.some((u: User) => u.role === 'admin');
  
  if (!adminExists) {
    const SALT_ROUNDS = 10;
    const passwordHash = bcrypt.hashSync('Admin@123456', SALT_ROUNDS);
    const now = new Date().toISOString();
    
    const meta = db.get('_meta').value();
    const newId = meta.nextUserId;
    db.set('_meta.nextUserId', newId + 1).write();
    
    const adminUser: User = {
      id: newId,
      username: 'admin',
      email: 'admin@clawoperations.local',
      password_hash: passwordHash,
      phone: null,
      avatar: null,
      role: 'admin',
      is_active: 1,
      created_at: now,
      updated_at: now,
    };
    
    db.get('users').push(adminUser).write();
    console.log('👤 Default admin account created (username: admin, password: Admin@123456)');
  }
};

// 迁移旧的 AI 配置结构（如果缺少新字段）
const migrateAIConfig = () => {
  const aiConfig = db.get('app_config.ai').value() as Record<string, unknown> | null;
  if (aiConfig && !('doubao_api_key' in aiConfig)) {
    db.set('app_config.ai', {
      deepseek_api_key: (aiConfig.deepseek_api_key as string) || null,
      deepseek_base_url: null,
      doubao_api_key: null,
      doubao_base_url: null,
      doubao_endpoint_id_image: null,
      doubao_endpoint_id_video: null,
      updated_at: (aiConfig.updated_at as string) || null,
    }).write();
    console.log('🔄 AI config schema migrated');
  }
};

migrateAIConfig();
createDefaultAdmin();

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
