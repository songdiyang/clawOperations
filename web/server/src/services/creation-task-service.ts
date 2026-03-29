/**
 * 创作任务持久化服务
 * 管理草稿、历史记录和模板
 */

import { getDatabase } from '../database';
import { 
  CreationTask, 
  CreationTemplate, 
  NextActionSuggestion,
  CreationTaskStatus
} from '../../../../src/models/types';

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 获取当前时间 ISO 字符串
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * 创作任务服务类
 */
class CreationTaskService {
  // ==================== 草稿管理 ====================

  /**
   * 保存草稿
   */
  saveDraft(data: Partial<CreationTask>): CreationTask {
    const db = getDatabase();
    const timestamp = now();
    
    // 如果有 ID，更新现有草稿
    if (data.id) {
      const existing = db.get('creation_drafts').find({ id: data.id }).value();
      if (existing) {
        const updated: CreationTask = {
          ...existing,
          ...data,
          updatedAt: timestamp,
        };
        db.get('creation_drafts').find({ id: data.id }).assign(updated).write();
        return updated;
      }
    }
    
    // 创建新草稿
    const draft: CreationTask = {
      id: generateId('draft_'),
      status: 'draft',
      requirement: data.requirement || '',
      contentTypePreference: data.contentTypePreference,
      analysis: data.analysis,
      content: data.content,
      copywriting: data.copywriting,
      progress: data.progress || 0,
      currentStepMessage: data.currentStepMessage || '草稿已保存',
      createdAt: timestamp,
      updatedAt: timestamp,
      canResume: true,
      lastCompletedStep: data.lastCompletedStep || 0,
    };
    
    db.get('creation_drafts').push(draft).write();
    return draft;
  }

  /**
   * 获取单个草稿
   */
  getDraft(id: string): CreationTask | null {
    const db = getDatabase();
    return db.get('creation_drafts').find({ id }).value() || null;
  }

  /**
   * 获取所有草稿
   */
  listDrafts(): CreationTask[] {
    const db = getDatabase();
    return db.get('creation_drafts')
      .orderBy(['updatedAt'], ['desc'])
      .value();
  }

  /**
   * 更新草稿
   */
  updateDraft(id: string, data: Partial<CreationTask>): CreationTask | null {
    const db = getDatabase();
    const existing = db.get('creation_drafts').find({ id }).value();
    
    if (!existing) return null;
    
    const updated: CreationTask = {
      ...existing,
      ...data,
      updatedAt: now(),
    };
    
    db.get('creation_drafts').find({ id }).assign(updated).write();
    return updated;
  }

  /**
   * 删除草稿
   */
  deleteDraft(id: string): boolean {
    const db = getDatabase();
    const existing = db.get('creation_drafts').find({ id }).value();
    
    if (!existing) return false;
    
    db.get('creation_drafts').remove({ id }).write();
    return true;
  }

  /**
   * 恢复草稿（返回草稿数据用于继续创作）
   */
  resumeDraft(id: string): CreationTask | null {
    const draft = this.getDraft(id);
    if (!draft) return null;
    
    // 更新状态为可恢复
    return this.updateDraft(id, {
      canResume: true,
      currentStepMessage: '从草稿恢复',
    });
  }

  // ==================== 历史记录管理 ====================

  /**
   * 保存到历史记录
   */
  saveToHistory(task: CreationTask): CreationTask {
    const db = getDatabase();
    const timestamp = now();
    
    const historyItem: CreationTask = {
      ...task,
      id: generateId('history_'),
      status: task.status === 'completed' ? 'completed' : task.status,
      updatedAt: timestamp,
      completedAt: task.status === 'completed' ? timestamp : undefined,
      canResume: false,
    };
    
    db.get('creation_history').push(historyItem).write();
    
    // 如果来源是草稿，删除原草稿
    if (task.id?.startsWith('draft_')) {
      this.deleteDraft(task.id);
    }
    
    return historyItem;
  }

  /**
   * 获取历史记录列表
   */
  getHistory(options?: { limit?: number; offset?: number }): CreationTask[] {
    const db = getDatabase();
    let query = db.get('creation_history').orderBy(['updatedAt'], ['desc']);
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    return query.slice(offset, offset + limit).value();
  }

  /**
   * 获取单条历史记录
   */
  getHistoryById(id: string): CreationTask | null {
    const db = getDatabase();
    return db.get('creation_history').find({ id }).value() || null;
  }

  /**
   * 获取历史记录总数
   */
  getHistoryCount(): number {
    const db = getDatabase();
    return db.get('creation_history').size().value();
  }

  // ==================== 模板管理 ====================

  /**
   * 创建模板
   */
  createTemplate(data: Omit<CreationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): CreationTemplate {
    const db = getDatabase();
    const timestamp = now();
    
    const template: CreationTemplate = {
      id: generateId('tpl_'),
      name: data.name,
      description: data.description,
      requirement: data.requirement,
      contentTypePreference: data.contentTypePreference,
      tags: data.tags || [],
      referenceImageUrl: data.referenceImageUrl,
      usageCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    db.get('creation_templates').push(template).write();
    return template;
  }

  /**
   * 获取所有模板
   */
  listTemplates(): CreationTemplate[] {
    const db = getDatabase();
    return db.get('creation_templates')
      .orderBy(['usageCount', 'updatedAt'], ['desc', 'desc'])
      .value();
  }

  /**
   * 获取单个模板
   */
  getTemplate(id: string): CreationTemplate | null {
    const db = getDatabase();
    return db.get('creation_templates').find({ id }).value() || null;
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, data: Partial<CreationTemplate>): CreationTemplate | null {
    const db = getDatabase();
    const existing = db.get('creation_templates').find({ id }).value();
    
    if (!existing) return null;
    
    const updated: CreationTemplate = {
      ...existing,
      ...data,
      updatedAt: now(),
    };
    
    db.get('creation_templates').find({ id }).assign(updated).write();
    return updated;
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const db = getDatabase();
    const existing = db.get('creation_templates').find({ id }).value();
    
    if (!existing) return false;
    
    db.get('creation_templates').remove({ id }).write();
    return true;
  }

  /**
   * 使用模板（增加使用计数）
   */
  useTemplate(id: string): CreationTemplate | null {
    const db = getDatabase();
    const template = db.get('creation_templates').find({ id }).value();
    
    if (!template) return null;
    
    const updated: CreationTemplate = {
      ...template,
      usageCount: template.usageCount + 1,
      updatedAt: now(),
    };
    
    db.get('creation_templates').find({ id }).assign(updated).write();
    return updated;
  }

  // ==================== 工作流辅助 ====================

  /**
   * 根据任务状态生成下一步建议
   */
  getNextActionSuggestion(task: CreationTask): NextActionSuggestion {
    const step = task.lastCompletedStep;
    
    switch (step) {
      case 0: // 刚输入需求
        return {
          action: 'analyze',
          message: '开始智能分析您的需求',
          estimatedTime: '约 10-15 秒',
          alternatives: ['保存草稿稍后继续', '修改需求描述'],
          tips: ['AI 将分析您的需求并提取关键信息', '分析完成后可以查看和调整分析结果'],
        };
        
      case 1: // 分析完成
        const contentType = task.analysis?.contentType === 'image' ? '图片' : '视频';
        return {
          action: 'generate',
          message: `生成推广${contentType}`,
          estimatedTime: task.analysis?.contentType === 'image' ? '约 30 秒' : '约 2-3 分钟',
          alternatives: ['保存草稿稍后继续', '重新分析需求', '修改内容类型'],
          tips: [
            task.analysis?.contentType === 'video' ? '视频生成需要较长时间，请耐心等待' : '图片生成通常很快',
            '生成过程中您可以查看分析结果',
          ],
        };
        
      case 2: // 内容生成完成
        return {
          action: 'copywriting',
          message: '生成推广文案',
          estimatedTime: '约 10-15 秒',
          alternatives: ['保存草稿稍后继续', '重新生成内容'],
          tips: ['文案将根据分析结果自动生成', '生成后可以手动编辑调整'],
        };
        
      case 3: // 文案生成完成
        return {
          action: 'preview',
          message: '预览并确认发布内容',
          estimatedTime: '根据您的操作',
          alternatives: ['保存草稿稍后发布', '重新生成文案', '保存为模板'],
          tips: ['请仔细检查内容和文案', '确认无误后可以发布到抖音'],
        };
        
      case 4: // 预览完成，准备发布
        return {
          action: 'publish',
          message: '发布到抖音',
          estimatedTime: '约 30 秒 - 1 分钟',
          alternatives: ['保存草稿稍后发布', '设置定时发布'],
          tips: ['发布前请确保已授权抖音账号', '发布后可在历史记录中查看'],
        };
        
      default:
        return {
          action: 'save_draft',
          message: '保存当前进度',
          estimatedTime: '立即完成',
          alternatives: ['从头开始新创作'],
          tips: ['草稿会自动保存您的所有进度'],
        };
    }
  }

  /**
   * 计算任务进度百分比
   */
  calculateProgress(step: number, status: CreationTaskStatus): number {
    const stepProgress: Record<number, number> = {
      0: 0,    // 输入需求
      1: 25,   // 分析完成
      2: 50,   // 内容生成完成
      3: 75,   // 文案生成完成
      4: 90,   // 预览完成
      5: 100,  // 发布完成
    };
    
    // 如果正在执行某个步骤，返回中间值
    if (status === 'analyzing') return 10;
    if (status === 'generating') return 35;
    if (status === 'copywriting') return 60;
    if (status === 'publishing') return 95;
    if (status === 'completed') return 100;
    if (status === 'failed') return stepProgress[step] || 0;
    
    return stepProgress[step] || 0;
  }
}

// 导出单例
export const creationTaskService = new CreationTaskService();
