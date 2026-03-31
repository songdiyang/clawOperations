/**
 * 创作工作流状态管理 Hook
 * 管理完整的 AI 创作流程状态
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { aiApi } from '../api/client';

// 创作任务类型
export interface CreationTask {
  id: string;
  status: 'draft' | 'analyzing' | 'generating' | 'copywriting' | 'preview' | 'publishing' | 'completed' | 'failed';
  requirement: string;
  contentTypePreference?: 'image' | 'video' | 'auto';
  videoDuration?: number;
  analysis?: {
    contentType: 'image' | 'video';
    theme: string;
    style: string;
    targetAudience: string;
    keyPoints: string[];
    imagePrompt?: string;
    videoPrompt?: string;
  };
  content?: {
    type: 'image' | 'video';
    localPath: string;
    previewUrl?: string;
    metadata?: {
      width?: number;
      height?: number;
      duration?: number;
      size?: number;
    };
  };
  copywriting?: {
    title: string;
    description: string;
    hashtags: string[];
    suggestedPoiName?: string;
  };
  error?: string;
  progress: number;
  currentStepMessage: string;
  lastCompletedStep: number;
  canResume: boolean;
}

// 下一步建议类型
export interface NextActionSuggestion {
  action: 'analyze' | 'generate' | 'copywriting' | 'preview' | 'publish' | 'save_draft';
  message: string;
  estimatedTime: string;
  alternatives: string[];
  tips: string[];
}

// Hook 返回类型
export interface UseCreationWorkflowReturn {
  // 状态
  task: CreationTask | null;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  nextAction: NextActionSuggestion | null;
  
  // 流程控制
  startNew: (
    requirement: string,
    contentTypePreference?: 'image' | 'video' | 'auto',
    videoDuration?: number
  ) => Promise<void>;
  startFromTemplate: (templateId: string) => Promise<void>;
  resumeFromDraft: (draftId: string) => Promise<void>;
  executeCurrentStep: () => Promise<void>;
  executeStep: (step: 'analyze' | 'generate' | 'copywriting' | 'preview' | 'complete') => Promise<void>;
  saveDraft: () => Promise<void>;
  reset: () => void;
  
  // 辅助功能
  canGoBack: boolean;
  canGoNext: boolean;
  canSaveDraft: boolean;
  
  // 更新函数
  updateRequirement: (requirement: string) => void;
  updateContentType: (type: 'image' | 'video' | 'auto') => void;
  updateVideoDuration: (duration: number) => void;
  updateCopywriting: (copywriting: CreationTask['copywriting']) => void;
}

/**
 * 创作工作流 Hook
 */
export function useCreationWorkflow(): UseCreationWorkflowReturn {
  const [task, setTask] = useState<CreationTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<NextActionSuggestion | null>(null);

  // 计算当前步骤
  const currentStep = task?.lastCompletedStep ?? 0;

  // 计算能力状态
  const canGoBack = currentStep > 0 && !isLoading;
  const canGoNext = !!task && !isLoading && task.status !== 'failed';
  const canSaveDraft = !!task && !!task.requirement && !isLoading;

  // 获取下一步建议
  const fetchNextAction = useCallback(async (taskId: string) => {
    try {
      const response = await aiApi.getNextAction(taskId);
      if (response.data.success) {
        setNextAction(response.data.data);
      }
    } catch (err) {
      // 静默失败，不影响主流程
      console.error('获取下一步建议失败:', err);
    }
  }, []);

  // 开始新的创作流程
  const startNew = useCallback(async (
    requirement: string, 
    contentTypePreference?: 'image' | 'video' | 'auto',
    videoDuration?: number
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiApi.startWorkflow({
        requirement,
        contentTypePreference,
        videoDuration,
      });
      
      if (response.data.success) {
        setTask(response.data.data.task);
        setNextAction(response.data.data.nextAction);
        message.success('创作任务已创建');
      } else {
        throw new Error(response.data.error || '创建任务失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '创建任务失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 从模板开始创作
  const startFromTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiApi.startWorkflow({ templateId });
      
      if (response.data.success) {
        setTask(response.data.data.task);
        setNextAction(response.data.data.nextAction);
        message.success('已从模板创建任务');
      } else {
        throw new Error(response.data.error || '创建任务失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '创建任务失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 从草稿恢复
  const resumeFromDraft = useCallback(async (draftId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiApi.resumeDraft(draftId);
      
      if (response.data.success) {
        setTask(response.data.data);
        await fetchNextAction(draftId);
        message.success('草稿已恢复');
      } else {
        throw new Error(response.data.error || '恢复草稿失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '恢复草稿失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNextAction]);

  // 执行指定步骤
  const executeStep = useCallback(async (
    step: 'analyze' | 'generate' | 'copywriting' | 'preview' | 'complete'
  ) => {
    if (!task) {
      message.error('请先创建任务');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // 更新任务状态为执行中
    const statusMap: Record<string, CreationTask['status']> = {
      analyze: 'analyzing',
      generate: 'generating',
      copywriting: 'copywriting',
      preview: 'preview',
      complete: 'publishing',
    };
    
    setTask(prev => prev ? { ...prev, status: statusMap[step] || prev.status } : null);
    
    try {
      const response = await aiApi.executeStep(task.id, step, step === 'generate'
        ? { videoDuration: task.videoDuration }
        : undefined);
      
      if (response.data.success) {
        setTask(response.data.data.task);
        setNextAction(response.data.data.nextAction);
        
        // 根据步骤显示不同的成功消息
        const successMessages: Record<string, string> = {
          analyze: '需求分析完成',
          generate: '内容生成完成',
          copywriting: '文案生成完成',
          preview: '预览就绪',
          complete: '创作完成',
        };
        message.success(successMessages[step] || '执行成功');
      } else {
        throw new Error(response.data.error || '执行失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '执行失败';
      setError(errorMsg);
      setTask(prev => prev ? { ...prev, status: 'failed', error: errorMsg } : null);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [task]);

  // 执行当前步骤对应的下一步操作
  const executeCurrentStep = useCallback(async () => {
    if (!nextAction) {
      message.warning('没有可执行的下一步操作');
      return;
    }
    
    const action = nextAction.action;
    if (action === 'save_draft') {
      await saveDraft();
    } else if (action === 'preview') {
      await executeStep('preview');
    } else if (action === 'publish') {
      await executeStep('complete');
    } else {
      await executeStep(action as any);
    }
  }, [nextAction, executeStep]);

  // 保存草稿
  const saveDraft = useCallback(async () => {
    if (!task) {
      message.error('没有可保存的任务');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await aiApi.saveDraft({
        id: task.id,
        requirement: task.requirement,
        contentTypePreference: task.contentTypePreference,
        videoDuration: task.videoDuration,
        analysis: task.analysis,
        content: task.content,
        copywriting: task.copywriting,
        lastCompletedStep: task.lastCompletedStep,
      });
      
      if (response.data.success) {
        setTask(response.data.data);
        message.success('草稿已保存');
      } else {
        throw new Error(response.data.error || '保存失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '保存失败';
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [task]);

  // 重置状态
  const reset = useCallback(() => {
    setTask(null);
    setIsLoading(false);
    setError(null);
    setNextAction(null);
  }, []);

  // 更新需求描述
  const updateRequirement = useCallback((requirement: string) => {
    setTask(prev => prev ? { ...prev, requirement } : null);
  }, []);

  // 更新内容类型偏好
  const updateContentType = useCallback((type: 'image' | 'video' | 'auto') => {
    setTask(prev => prev ? { ...prev, contentTypePreference: type } : null);
  }, []);

  const updateVideoDuration = useCallback((duration: number) => {
    setTask(prev => prev ? { ...prev, videoDuration: duration } : null);
  }, []);

  // 更新文案
  const updateCopywriting = useCallback((copywriting: CreationTask['copywriting']) => {
    setTask(prev => prev ? { ...prev, copywriting } : null);
  }, []);

  // 当任务加载时，获取下一步建议
  useEffect(() => {
    if (task?.id && !nextAction && task.status === 'draft') {
      fetchNextAction(task.id);
    }
  }, [task?.id, task?.status, nextAction, fetchNextAction]);

  return {
    // 状态
    task,
    currentStep,
    isLoading,
    error,
    nextAction,
    
    // 流程控制
    startNew,
    startFromTemplate,
    resumeFromDraft,
    executeCurrentStep,
    executeStep,
    saveDraft,
    reset,
    
    // 辅助功能
    canGoBack,
    canGoNext,
    canSaveDraft,
    
    // 更新函数
    updateRequirement,
    updateContentType,
    updateVideoDuration,
    updateCopywriting,
  };
}

export default useCreationWorkflow;
