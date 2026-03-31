/**
 * 数据库连接层 - MySQL + Redis
 */
import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import Redis from 'ioredis';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let pool: Pool | null = null;
let redisClient: Redis | null = null;

/**
 * 获取 MySQL 连接池
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * 获取 Redis 客户端
 */
export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initDatabase() first.');
  }
  return redisClient;
}

/**
 * 将 JS Date 或 ISO 字符串转换为 MySQL DATETIME 格式
 */
export function toMysqlDatetime(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 将 MySQL DATETIME 字符串转换为 ISO 字符串（带时区 Z）
 */
export function fromMysqlDatetime(s: string | Date | null | undefined): string | null {
  if (!s) return null;
  if (s instanceof Date) return s.toISOString();
  // MySQL returns 'YYYY-MM-DD HH:MM:SS'
  return new Date(s.replace(' ', 'T') + 'Z').toISOString();
}

/**
 * 执行 schema SQL，逐条语句运行
 */
async function runSchema(p: Pool): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await p.execute(statement);
    } catch (err: any) {
      // 忽略重复键名错误（多次初始化时）
      if (err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
        throw err;
      }
    }
  }
}

/**
 * 创建默认管理员账号
 */
async function createDefaultAdmin(p: Pool): Promise<void> {
  const [rows] = await p.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if ((rows as RowDataPacket[]).length === 0) {
    const passwordHash = bcrypt.hashSync('Admin@123456', 10);
    const now = toMysqlDatetime();
    await p.execute(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin', 'admin@clawoperations.local', passwordHash, 'admin', 1, now, now]
    );
    console.log('👤 Default admin account created (username: admin, password: Admin@123456)');
  }
}

/**
 * 初始化数据库（启动时调用）
 */
export async function initDatabase(): Promise<void> {
  // 创建 MySQL 连接池
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'clawops',
    password: process.env.DB_PASS || 'ClawOps@2024!',
    database: process.env.DB_NAME || 'clawops',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    dateStrings: true,
  });

  // 测试连接
  const conn = await pool.getConnection();
  conn.release();
  console.log('📦 MySQL connected successfully');

  // 创建 Redis 客户端
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = new Redis(redisUrl, {
    lazyConnect: false,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
    maxRetriesPerRequest: 3,
  });
  redisClient.on('connect', () => console.log('🔴 Redis connected successfully'));
  redisClient.on('error', (err: Error) => console.warn('⚠️  Redis error:', err.message));

  // 执行建表 SQL
  await runSchema(pool);
  console.log('📋 Database schema initialized');

  // 创建默认管理员
  await createDefaultAdmin(pool);

  console.log('✅ Database initialized successfully');
}

/**
 * 关闭数据库连接（进程退出时）
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('📦 MySQL connection pool closed');
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔴 Redis connection closed');
  }
}

// 进程退出时清理
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

export default { getPool, getRedis, initDatabase, closeDatabase };
