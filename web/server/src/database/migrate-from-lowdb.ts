/**
 * 数据迁移脚本：将 lowdb (db.json) 数据迁移到 MySQL
 *
 * 运行方式（仅执行一次）：
 *   npm run migrate
 *   或：ts-node src/database/migrate-from-lowdb.ts
 *
 * 前置条件：
 *   1. 已在 MySQL 中执行 schema.sql 创建好表结构
 *   2. .env 已配置 DB_HOST / DB_USER / DB_PASS / DB_NAME
 */

import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── 数据库连接配置 ──────────────────────────────────────────────────────────

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'clawops',
  password: process.env.DB_PASS || 'ClawOps@2024!',
  database: process.env.DB_NAME || 'clawops',
  multipleStatements: true,
  dateStrings: true,
};

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function toMysqlDatetime(date?: string | null): string {
  if (!date) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

function jsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

// ─── lowdb 数据结构类型 ──────────────────────────────────────────────────────

interface LowdbUser {
  id: number;
  username: string;
  email?: string | null;
  password_hash: string;
  phone?: string | null;
  avatar?: string | null;
  role?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

interface LowdbAuthConfig {
  id?: number;
  user_id: number;
  client_key?: string | null;
  client_secret?: string | null;
  redirect_uri?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  open_id?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
}

interface LowdbCreationTask {
  id: string;
  status: string;
  requirement?: string | null;
  contentTypePreference?: string | null;
  analysis?: unknown;
  content?: unknown;
  copywriting?: unknown;
  progress?: number;
  currentStepMessage?: string | null;
  error?: string | null;
  canResume?: boolean;
  lastCompletedStep?: number;
  douyinPostId?: string | null;
  previewUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  referenceImageUrl?: string | null;
}

interface LowdbTemplate {
  id: string;
  name: string;
  description?: string | null;
  requirement: string;
  contentTypePreference?: string | null;
  tags?: string[];
  referenceImageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LowdbAppConfig {
  douyin?: {
    client_key?: string | null;
    client_secret?: string | null;
    redirect_uri?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    open_id?: string | null;
    expires_at?: string | null;
    updated_at?: string | null;
  };
  ai?: {
    deepseek_api_key?: string | null;
    deepseek_base_url?: string | null;
    doubao_api_key?: string | null;
    doubao_base_url?: string | null;
    doubao_endpoint_id_image?: string | null;
    doubao_endpoint_id_video?: string | null;
    updated_at?: string | null;
  };
}

interface LowdbData {
  users?: LowdbUser[];
  user_auth_configs?: LowdbAuthConfig[];
  creation_drafts?: LowdbCreationTask[];
  creation_history?: LowdbCreationTask[];
  creation_templates?: LowdbTemplate[];
  app_config?: LowdbAppConfig;
}

// ─── 迁移主流程 ──────────────────────────────────────────────────────────────

async function migrate() {
  // 1. 读取 db.json
  const dbJsonPath = path.resolve(__dirname, '../../data/db.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.error(`❌ 找不到 db.json: ${dbJsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  const data: LowdbData = JSON.parse(raw);
  console.log('✅ 已读取 db.json');

  // 2. 连接 MySQL
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 已连接 MySQL');

  try {
    await conn.beginTransaction();

    // ── 3. 迁移用户 ───────────────────────────────────────────────────────────
    const users = data.users || [];
    let userCount = 0;
    for (const u of users) {
      await conn.execute(
        `INSERT INTO users
          (id, username, email, password_hash, phone, avatar, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username=VALUES(username), email=VALUES(email),
           password_hash=VALUES(password_hash), phone=VALUES(phone),
           avatar=VALUES(avatar), role=VALUES(role),
           is_active=VALUES(is_active), updated_at=VALUES(updated_at)`,
        [
          u.id,
          u.username,
          u.email ?? null,
          u.password_hash,
          u.phone ?? null,
          u.avatar ?? null,
          u.role ?? 'user',
          u.is_active ?? 1,
          toMysqlDatetime(u.created_at),
          toMysqlDatetime(u.updated_at),
        ]
      );
      userCount++;
    }
    console.log(`✅ 已迁移 ${userCount} 个用户`);

    // 修正 AUTO_INCREMENT 起点（避免与已迁移 ID 冲突）
    const maxUserId = users.reduce((max, u) => Math.max(max, u.id), 0);
    if (maxUserId > 0) {
      await conn.execute(`ALTER TABLE users AUTO_INCREMENT = ${maxUserId + 1}`);
    }

    // ── 4. 迁移用户认证配置 ────────────────────────────────────────────────────
    const authConfigs = data.user_auth_configs || [];
    let authCount = 0;
    for (const cfg of authConfigs) {
      await conn.execute(
        `INSERT INTO user_auth_configs
          (user_id, client_key, client_secret, redirect_uri,
           access_token, refresh_token, open_id, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           client_key=VALUES(client_key), client_secret=VALUES(client_secret),
           redirect_uri=VALUES(redirect_uri), access_token=VALUES(access_token),
           refresh_token=VALUES(refresh_token), open_id=VALUES(open_id),
           expires_at=VALUES(expires_at), updated_at=VALUES(updated_at)`,
        [
          cfg.user_id,
          cfg.client_key ?? null,
          cfg.client_secret ?? null,
          cfg.redirect_uri ?? null,
          cfg.access_token ?? null,
          cfg.refresh_token ?? null,
          cfg.open_id ?? null,
          cfg.expires_at ? toMysqlDatetime(cfg.expires_at) : null,
          toMysqlDatetime(cfg.updated_at),
        ]
      );
      authCount++;
    }
    console.log(`✅ 已迁移 ${authCount} 条用户认证配置`);

    // ── 5. 迁移草稿 ────────────────────────────────────────────────────────────
    const drafts = data.creation_drafts || [];
    let draftCount = 0;
    for (const t of drafts) {
      await insertTask(conn, t, 'draft');
      draftCount++;
    }
    console.log(`✅ 已迁移 ${draftCount} 条草稿`);

    // ── 6. 迁移历史记录 ────────────────────────────────────────────────────────
    const history = data.creation_history || [];
    let historyCount = 0;
    for (const t of history) {
      await insertTask(conn, t, 'history');
      historyCount++;
    }
    console.log(`✅ 已迁移 ${historyCount} 条历史记录`);

    // ── 7. 迁移模板 ────────────────────────────────────────────────────────────
    const templates = data.creation_templates || [];
    let templateCount = 0;
    for (const tpl of templates) {
      await conn.execute(
        `INSERT INTO creation_templates
          (id, name, description, requirement, content_type_preference,
           tags, reference_image_url, use_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           name=VALUES(name), description=VALUES(description),
           requirement=VALUES(requirement),
           content_type_preference=VALUES(content_type_preference),
           tags=VALUES(tags), reference_image_url=VALUES(reference_image_url),
           updated_at=VALUES(updated_at)`,
        [
          tpl.id,
          tpl.name,
          tpl.description ?? null,
          tpl.requirement,
          tpl.contentTypePreference ?? null,
          tpl.tags ? JSON.stringify(tpl.tags) : null,
          tpl.referenceImageUrl ?? null,
          toMysqlDatetime(tpl.createdAt),
          toMysqlDatetime(tpl.updatedAt),
        ]
      );
      templateCount++;
    }
    console.log(`✅ 已迁移 ${templateCount} 个模板`);

    // ── 8. 迁移应用配置 ────────────────────────────────────────────────────────
    const appCfg = data.app_config || {};
    let cfgCount = 0;

    if (appCfg.douyin) {
      const { updated_at, ...douyinData } = appCfg.douyin;
      await conn.execute(
        `INSERT INTO app_config (config_key, config_value, updated_at)
         VALUES ('douyin_config', ?, ?)
         ON DUPLICATE KEY UPDATE config_value=VALUES(config_value), updated_at=VALUES(updated_at)`,
        [JSON.stringify(douyinData), toMysqlDatetime(updated_at)]
      );
      cfgCount++;
    }

    if (appCfg.ai) {
      const { updated_at, ...aiData } = appCfg.ai;
      await conn.execute(
        `INSERT INTO app_config (config_key, config_value, updated_at)
         VALUES ('ai_config', ?, ?)
         ON DUPLICATE KEY UPDATE config_value=VALUES(config_value), updated_at=VALUES(updated_at)`,
        [JSON.stringify(aiData), toMysqlDatetime(updated_at)]
      );
      cfgCount++;
    }

    console.log(`✅ 已迁移 ${cfgCount} 条应用配置`);

    await conn.commit();
    console.log('\n🎉 数据迁移完成！');

  } catch (err) {
    await conn.rollback();
    console.error('❌ 迁移失败，已回滚:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

// ─── 插入创作任务（草稿/历史共用） ──────────────────────────────────────────

async function insertTask(
  conn: mysql.Connection,
  t: LowdbCreationTask,
  taskType: 'draft' | 'history'
): Promise<void> {
  await conn.execute(
    `INSERT INTO creation_tasks
      (id, task_type, status, requirement, content_type_preference,
       analysis, content, copywriting, progress, current_step_message,
       error_message, can_resume, last_completed_step,
       douyin_post_id, preview_url, reference_image_url,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       task_type=VALUES(task_type), status=VALUES(status),
       requirement=VALUES(requirement),
       content_type_preference=VALUES(content_type_preference),
       analysis=VALUES(analysis), content=VALUES(content),
       copywriting=VALUES(copywriting), progress=VALUES(progress),
       current_step_message=VALUES(current_step_message),
       error_message=VALUES(error_message), can_resume=VALUES(can_resume),
       last_completed_step=VALUES(last_completed_step),
       douyin_post_id=VALUES(douyin_post_id), preview_url=VALUES(preview_url),
       reference_image_url=VALUES(reference_image_url),
       updated_at=VALUES(updated_at)`,
    [
      t.id,
      taskType,
      t.status,
      t.requirement ?? null,
      t.contentTypePreference ?? null,
      jsonOrNull(t.analysis),
      jsonOrNull(t.content),
      jsonOrNull(t.copywriting),
      t.progress ?? 0,
      t.currentStepMessage ?? null,
      t.error ?? null,
      t.canResume !== false ? 1 : 0,
      t.lastCompletedStep ?? 0,
      t.douyinPostId ?? null,
      t.previewUrl ?? null,
      t.referenceImageUrl ?? null,
      toMysqlDatetime(t.createdAt),
      toMysqlDatetime(t.updatedAt),
    ]
  );
}

// ─── 入口 ─────────────────────────────────────────────────────────────────────

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
