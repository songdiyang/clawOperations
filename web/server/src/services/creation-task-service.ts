/**
 * 创作任务持久化服务 - MySQL 版
 */
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { getPool, toMysqlDatetime, fromMysqlDatetime } from '../database';
import {
  CreationTask,
  CreationTemplate,
  NextActionSuggestion,
  CreationTaskStatus,
} from '../../../../src/models/types';

function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** 解析 JSON 字段，如果为空则返回 undefined */
function parseJson<T>(raw: string | null | undefined): T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

/** 将 MySQL 行转换为 CreationTask */
function rowToTask(row: RowDataPacket): CreationTask {
  return {
    id: row.id as string,
    status: row.status as CreationTaskStatus,
    requirement: (row.requirement as string) || '',
    contentTypePreference: row.content_type as 'image' | 'video' | 'auto' | undefined,
    videoDuration: row.video_duration as number | undefined,
    referenceImageUrl: row.reference_image_url as string | undefined,
    analysis: parseJson(row.analysis as string),
    content: parseJson(row.content as string),
    copywriting: parseJson(row.copywriting as string),
    publishResult: parseJson(row.publish_result as string),
    error: row.error_message as string | undefined,
    progress: (row.progress as number) || 0,
    currentStepMessage: (row.current_step_message as string) || '',
    createdAt: fromMysqlDatetime(row.created_at as string) || nowIso(),
    updatedAt: fromMysqlDatetime(row.updated_at as string) || nowIso(),
    completedAt: row.completed_at ? fromMysqlDatetime(row.completed_at as string) || undefined : undefined,
    canResume: (row.can_resume as number) === 1,
    lastCompletedStep: (row.last_completed_step as number) || 0,
  };
}

/** 将 MySQL 行转换为 CreationTemplate */
function rowToTemplate(row: RowDataPacket): CreationTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    requirement: row.requirement as string,
    contentTypePreference: row.content_type as 'image' | 'video' | 'auto' | undefined,
    tags: parseJson<string[]>(row.tags as string) || [],
    referenceImageUrl: row.reference_image_url as string | undefined,
    usageCount: (row.usage_count as number) || 0,
    createdAt: fromMysqlDatetime(row.created_at as string) || nowIso(),
    updatedAt: fromMysqlDatetime(row.updated_at as string) || nowIso(),
  };
}

class CreationTaskService {
  // ==================== 草稿管理 ====================

  async saveDraft(data: Partial<CreationTask>): Promise<CreationTask> {
    const pool = getPool();
    const now = toMysqlDatetime();

    if (data.id) {
      const existing = await this.getDraft(data.id);
      if (existing) {
        const merged: CreationTask = { ...existing, ...data, updatedAt: nowIso() };
        await pool.execute(
          'UPDATE creation_tasks SET status=?, requirement=?, content_type=?, video_duration=?, analysis=?, content=?, copywriting=?, publish_result=?, progress=?, current_step_message=?, error_message=?, can_resume=?, last_completed_step=?, reference_image_url=?, updated_at=? WHERE id=? AND task_type=?',
          [
            merged.status,
            merged.requirement,
            merged.contentTypePreference || null,
            merged.videoDuration ?? null,
            merged.analysis ? JSON.stringify(merged.analysis) : null,
            merged.content ? JSON.stringify(merged.content) : null,
            merged.copywriting ? JSON.stringify(merged.copywriting) : null,
            merged.publishResult ? JSON.stringify(merged.publishResult) : null,
            merged.progress,
            merged.currentStepMessage,
            merged.error || null,
            merged.canResume ? 1 : 0,
            merged.lastCompletedStep,
            merged.referenceImageUrl || null,
            now,
            data.id,
            'draft',
          ]
        );
        return merged;
      }
    }

    const id = data.id || generateId('draft_');
    const draft: CreationTask = {
      id,
      status: 'draft',
      requirement: data.requirement || '',
      contentTypePreference: data.contentTypePreference,
      videoDuration: data.videoDuration,
      referenceImageUrl: data.referenceImageUrl,
      analysis: data.analysis,
      content: data.content,
      copywriting: data.copywriting,
      publishResult: data.publishResult,
      error: data.error,
      progress: data.progress || 0,
      currentStepMessage: data.currentStepMessage || '草稿已保存',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      canResume: true,
      lastCompletedStep: data.lastCompletedStep || 0,
    };

    await pool.execute(
      'INSERT INTO creation_tasks (id, task_type, status, requirement, content_type, video_duration, analysis, content, copywriting, publish_result, progress, current_step_message, error_message, can_resume, last_completed_step, reference_image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        draft.id, 'draft', draft.status, draft.requirement,
        draft.contentTypePreference || null,
        draft.videoDuration ?? null,
        draft.analysis ? JSON.stringify(draft.analysis) : null,
        draft.content ? JSON.stringify(draft.content) : null,
        draft.copywriting ? JSON.stringify(draft.copywriting) : null,
        draft.publishResult ? JSON.stringify(draft.publishResult) : null,
        draft.progress, draft.currentStepMessage, draft.error || null,
        draft.canResume ? 1 : 0, draft.lastCompletedStep,
        draft.referenceImageUrl || null, now, now,
      ]
    );
    return draft;
  }

  async getDraft(id: string): Promise<CreationTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM creation_tasks WHERE id=? AND task_type='draft'",
      [id]
    );
    return rows.length > 0 ? rowToTask(rows[0]) : null;
  }

  async listDrafts(): Promise<CreationTask[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM creation_tasks WHERE task_type='draft' ORDER BY updated_at DESC"
    );
    return rows.map(rowToTask);
  }

  async updateDraft(id: string, data: Partial<CreationTask>): Promise<CreationTask | null> {
    const existing = await this.getDraft(id);
    if (!existing) return null;
    return this.saveDraft({ ...existing, ...data, id });
  }

  async deleteDraft(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM creation_tasks WHERE id=? AND task_type='draft'",
      [id]
    );
    return result.affectedRows > 0;
  }

  async resumeDraft(id: string): Promise<CreationTask | null> {
    return this.updateDraft(id, { canResume: true, currentStepMessage: '从草稿恢复' });
  }

  // ==================== 历史记录管理 ====================

  async saveToHistory(task: CreationTask): Promise<CreationTask> {
    const pool = getPool();
    const now = toMysqlDatetime();
    const nowStr = nowIso();

    const historyItem: CreationTask = {
      ...task,
      id: generateId('history_'),
      status: task.status === 'completed' ? 'completed' : task.status,
      updatedAt: nowStr,
      completedAt: task.status === 'completed' ? nowStr : undefined,
      canResume: false,
    };

    await pool.execute(
      'INSERT INTO creation_tasks (id, task_type, status, requirement, content_type, video_duration, analysis, content, copywriting, publish_result, progress, current_step_message, error_message, can_resume, last_completed_step, reference_image_url, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        historyItem.id, 'history', historyItem.status, historyItem.requirement,
        historyItem.contentTypePreference || null,
        historyItem.videoDuration ?? null,
        historyItem.analysis ? JSON.stringify(historyItem.analysis) : null,
        historyItem.content ? JSON.stringify(historyItem.content) : null,
        historyItem.copywriting ? JSON.stringify(historyItem.copywriting) : null,
        historyItem.publishResult ? JSON.stringify(historyItem.publishResult) : null,
        historyItem.progress, historyItem.currentStepMessage, historyItem.error || null,
        0, historyItem.lastCompletedStep, historyItem.referenceImageUrl || null,
        historyItem.completedAt ? toMysqlDatetime(historyItem.completedAt) : null,
        now, now,
      ]
    );

    // 如果来源是草稿，删除原草稿
    if (task.id?.startsWith('draft_')) {
      await this.deleteDraft(task.id);
    }

    return historyItem;
  }

  async getHistory(options?: { limit?: number; offset?: number }): Promise<CreationTask[]> {
    const pool = getPool();
    const limit = Number.isFinite(options?.limit) ? Math.max(0, Number(options?.limit)) : 20;
    const offset = Number.isFinite(options?.offset) ? Math.max(0, Number(options?.offset)) : 0;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM creation_tasks
        WHERE task_type='history'
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}`
    );
    return rows.map(rowToTask);
  }

  async getHistoryById(id: string): Promise<CreationTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM creation_tasks WHERE id=? AND task_type='history'",
      [id]
    );
    return rows.length > 0 ? rowToTask(rows[0]) : null;
  }

  async getHistoryCount(): Promise<number> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM creation_tasks WHERE task_type='history'"
    );
    return (rows[0] as RowDataPacket).cnt as number;
  }

  // ==================== 模板管理 ====================

  async createTemplate(
    data: Omit<CreationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<CreationTemplate> {
    const pool = getPool();
    const now = toMysqlDatetime();
    const template: CreationTemplate = {
      id: generateId('tpl_'),
      name: data.name,
      description: data.description,
      requirement: data.requirement,
      contentTypePreference: data.contentTypePreference,
      tags: data.tags || [],
      referenceImageUrl: data.referenceImageUrl,
      usageCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await pool.execute(
      'INSERT INTO creation_templates (id, name, description, requirement, content_type, tags, reference_image_url, usage_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        template.id, template.name, template.description || null,
        template.requirement, template.contentTypePreference || null,
        JSON.stringify(template.tags), template.referenceImageUrl || null,
        0, now, now,
      ]
    );
    return template;
  }

  async listTemplates(): Promise<CreationTemplate[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM creation_templates ORDER BY usage_count DESC, updated_at DESC'
    );
    return rows.map(rowToTemplate);
  }

  async getTemplate(id: string): Promise<CreationTemplate | null> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM creation_templates WHERE id=?',
      [id]
    );
    return rows.length > 0 ? rowToTemplate(rows[0]) : null;
  }

  async updateTemplate(id: string, data: Partial<CreationTemplate>): Promise<CreationTemplate | null> {
    const pool = getPool();
    const existing = await this.getTemplate(id);
    if (!existing) return null;

    const updated: CreationTemplate = { ...existing, ...data, updatedAt: nowIso() };
    const now = toMysqlDatetime();
    await pool.execute(
      'UPDATE creation_templates SET name=?, description=?, requirement=?, content_type=?, tags=?, reference_image_url=?, usage_count=?, updated_at=? WHERE id=?',
      [
        updated.name, updated.description || null, updated.requirement,
        updated.contentTypePreference || null, JSON.stringify(updated.tags),
        updated.referenceImageUrl || null, updated.usageCount, now, id,
      ]
    );
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM creation_templates WHERE id=?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async useTemplate(id: string): Promise<CreationTemplate | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;
    return this.updateTemplate(id, { usageCount: template.usageCount + 1 });
  }

  // ==================== 工作流辅助（纯逻辑，同步） ====================

  getNextActionSuggestion(task: CreationTask): NextActionSuggestion {
    const step = task.lastCompletedStep;
    switch (step) {
      case 0:
        return {
          action: 'analyze', message: '开始智能分析您的需求',
          estimatedTime: '约 10-15 秒',
          alternatives: ['保存草稿稍后继续', '修改需求描述'],
          tips: ['AI 将分析您的需求并提取关键信息', '分析完成后可以查看和调整分析结果'],
        };
      case 1:
        return {
          action: 'generate',
          message: `生成${task.analysis?.contentType === 'image' ? '图片' : '视频'}内容`,
          estimatedTime: task.analysis?.contentType === 'image' ? '约 30 秒' : '约 2-3 分钟',
          alternatives: ['保存草稿稍后继续', '重新分析需求', '修改内容类型'],
          tips: [task.analysis?.contentType === 'video' ? '视频生成需要较长时间，请耐心等待' : '图片生成通常很快', '生成过程中您可以查看分析结果'],
        };
      case 2:
        return {
          action: 'copywriting', message: '生成发布文案', estimatedTime: '约 10-15 秒',
          alternatives: ['保存草稿稍后继续', '重新生成内容'],
          tips: ['文案将根据分析结果自动生成', '生成后可以手动编辑调整'],
        };
      case 3:
        return {
          action: 'preview', message: '预览并确认发布内容', estimatedTime: '根据您的操作',
          alternatives: ['保存草稿稍后发布', '重新生成文案', '保存为模板'],
          tips: ['请仔细检查内容和文案', '确认无误后可以发布到抖音'],
        };
      case 4:
        return {
          action: 'publish', message: '发布到抖音', estimatedTime: '约 30 秒 - 1 分钟',
          alternatives: ['保存草稿稍后发布', '设置定时发布'],
          tips: ['发布前请确保已授权抖音账号', '发布后可在历史记录中查看'],
        };
      default:
        return {
          action: 'save_draft', message: '保存当前进度', estimatedTime: '立即完成',
          alternatives: ['从头开始新创作'],
          tips: ['草稿会自动保存您的所有进度'],
        };
    }
  }

  calculateProgress(step: number, status: CreationTaskStatus): number {
    const stepProgress: Record<number, number> = { 0: 0, 1: 25, 2: 50, 3: 75, 4: 90, 5: 100 };
    if (status === 'analyzing') return 10;
    if (status === 'generating') return 35;
    if (status === 'copywriting') return 60;
    if (status === 'publishing') return 95;
    if (status === 'completed') return 100;
    if (status === 'failed') return stepProgress[step] || 0;
    return stepProgress[step] || 0;
  }
}

export const creationTaskService = new CreationTaskService();
