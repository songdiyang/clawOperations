/**
 * 工作流步骤组件
 * 展示创作流程的步骤条和当前状态
 */

import React from 'react';
import { Steps, Card, Typography, Space, Tag, Progress } from 'antd';
import {
  BulbOutlined,
  RobotOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SendOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// 步骤定义
export const WORKFLOW_STEPS = [
  {
    key: 0,
    title: '输入需求',
    icon: <BulbOutlined />,
    description: '描述您的创作需求',
  },
  {
    key: 1,
    title: '智能分析',
    icon: <RobotOutlined />,
    description: 'AI 分析并提取关键信息',
  },
  {
    key: 2,
    title: '内容生成',
    icon: <VideoCameraOutlined />,
    description: '生成图片或视频内容',
  },
  {
    key: 3,
    title: '文案生成',
    icon: <FileTextOutlined />,
    description: '生成推广文案',
  },
  {
    key: 4,
    title: '发布',
    icon: <SendOutlined />,
    description: '预览并发布到抖音',
  },
];

interface WorkflowStepsProps {
  currentStep: number;
  status: 'draft' | 'analyzing' | 'generating' | 'copywriting' | 'preview' | 'publishing' | 'completed' | 'failed';
  progress: number;
  currentStepMessage?: string;
  onStepClick?: (step: number) => void;
  allowStepClick?: boolean;
}

/**
 * 根据任务状态获取步骤状态
 */
function getStepStatus(
  stepIndex: number,
  currentStep: number,
  taskStatus: string
): 'wait' | 'process' | 'finish' | 'error' {
  if (taskStatus === 'failed' && stepIndex === currentStep) {
    return 'error';
  }
  
  if (stepIndex < currentStep) {
    return 'finish';
  }
  
  if (stepIndex === currentStep) {
    // 检查是否正在执行
    const processingStatuses = ['analyzing', 'generating', 'copywriting', 'publishing'];
    if (processingStatuses.includes(taskStatus)) {
      return 'process';
    }
    return 'process';
  }
  
  return 'wait';
}

/**
 * 获取步骤图标
 */
function getStepIcon(
  stepIndex: number,
  currentStep: number,
  taskStatus: string,
  defaultIcon: React.ReactNode
): React.ReactNode {
  const status = getStepStatus(stepIndex, currentStep, taskStatus);
  
  if (status === 'process') {
    // 检查是否正在加载
    const processingStatuses = ['analyzing', 'generating', 'copywriting', 'publishing'];
    if (processingStatuses.includes(taskStatus)) {
      return <LoadingOutlined />;
    }
  }
  
  if (status === 'finish') {
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  }
  
  if (status === 'error') {
    return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  }
  
  return defaultIcon;
}

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  currentStep,
  status,
  progress,
  currentStepMessage,
  onStepClick,
  allowStepClick = false,
}) => {
  const items = WORKFLOW_STEPS.map((step, index) => ({
    key: step.key,
    title: step.title,
    description: index === currentStep ? currentStepMessage || step.description : step.description,
    icon: getStepIcon(index, currentStep, status, step.icon),
    status: getStepStatus(index, currentStep, status),
    disabled: !allowStepClick || index > currentStep,
  }));

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Steps
        current={currentStep}
        items={items}
        size="small"
        onChange={allowStepClick ? onStepClick : undefined}
      />
      
      {/* 进度条 */}
      {status !== 'draft' && status !== 'completed' && status !== 'failed' && (
        <div style={{ marginTop: 12 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">{currentStepMessage || '处理中...'}</Text>
            <Text type="secondary">{progress}%</Text>
          </Space>
          <Progress 
            percent={progress} 
            showInfo={false} 
            size="small"
            status="active"
          />
        </div>
      )}
      
      {/* 完成状态 */}
      {status === 'completed' && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Tag color="success" icon={<CheckCircleOutlined />}>
            创作完成
          </Tag>
        </div>
      )}
      
      {/* 失败状态 */}
      {status === 'failed' && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Tag color="error" icon={<CloseCircleOutlined />}>
            执行失败
          </Tag>
        </div>
      )}
    </Card>
  );
};

export default WorkflowSteps;
