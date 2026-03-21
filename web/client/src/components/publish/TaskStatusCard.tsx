import React from 'react';
import { Card, Tag, Space, Button, Typography, Tooltip, Progress, Collapse } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  PublishResultExtended,
  PublishStep,
  PublishErrorType,
} from './PublishErrorDisplay';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 扩展的定时任务结果接口
export interface ScheduleResultExtended {
  taskId: string;
  scheduledTime: Date | string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: PublishResultExtended;
  config?: {
    videoPath: string;
    options?: any;
    isRemoteUrl?: boolean;
  };
  errorType?: PublishErrorType;
  retryable?: boolean;
}

interface TaskStatusCardProps {
  task: ScheduleResultExtended;
  onRetry: (taskId: string, fromStep?: PublishStep) => void;
  onCancel: (taskId: string) => void;
  loading?: boolean;
}

// 状态配置
const statusConfig: Record<string, {
  icon: React.ReactNode;
  color: string;
  tagColor: string;
  label: string;
}> = {
  pending: {
    icon: <ClockCircleOutlined />,
    color: '#1890ff',
    tagColor: 'processing',
    label: '等待执行',
  },
  completed: {
    icon: <CheckCircleOutlined />,
    color: '#52c41a',
    tagColor: 'success',
    label: '已完成',
  },
  failed: {
    icon: <CloseCircleOutlined />,
    color: '#ff4d4f',
    tagColor: 'error',
    label: '执行失败',
  },
  cancelled: {
    icon: <StopOutlined />,
    color: '#999',
    tagColor: 'default',
    label: '已取消',
  },
};

// 错误类型标签颜色
const errorTypeColors: Record<PublishErrorType, string> = {
  [PublishErrorType.TIMEOUT]: 'warning',
  [PublishErrorType.TOKEN_EXPIRED]: 'error',
  [PublishErrorType.MATERIAL_ERROR]: 'orange',
  [PublishErrorType.RATE_LIMIT]: 'warning',
  [PublishErrorType.PERMISSION_DENIED]: 'error',
  [PublishErrorType.NETWORK_ERROR]: 'warning',
  [PublishErrorType.VALIDATION_ERROR]: 'orange',
  [PublishErrorType.UNKNOWN]: 'default',
};

// 错误类型标签文字
const errorTypeLabels: Record<PublishErrorType, string> = {
  [PublishErrorType.TIMEOUT]: '超时',
  [PublishErrorType.TOKEN_EXPIRED]: '登录过期',
  [PublishErrorType.MATERIAL_ERROR]: '素材异常',
  [PublishErrorType.RATE_LIMIT]: '限流',
  [PublishErrorType.PERMISSION_DENIED]: '权限不足',
  [PublishErrorType.NETWORK_ERROR]: '网络错误',
  [PublishErrorType.VALIDATION_ERROR]: '参数错误',
  [PublishErrorType.UNKNOWN]: '未知',
};

const TaskStatusCard: React.FC<TaskStatusCardProps> = ({
  task,
  onRetry,
  onCancel,
  loading = false,
}) => {
  const config = statusConfig[task.status] || statusConfig.pending;
  const scheduledTime = typeof task.scheduledTime === 'string' 
    ? dayjs(task.scheduledTime) 
    : dayjs(task.scheduledTime);
  
  const isFailed = task.status === 'failed';
  const isPending = task.status === 'pending';
  const canRetry = isFailed && task.retryable !== false;
  const canCancel = isPending;

  // 获取重试选项
  const getRetryOptions = () => {
    const options: { step?: PublishStep; label: string }[] = [];
    
    if (canRetry) {
      options.push({ step: undefined, label: '完整重试' });
      
      // 如果有已上传的视频ID，可以只重试发布步骤
      if (task.result?.uploadedVideoId) {
        options.push({ step: PublishStep.PUBLISH, label: '仅重试发布' });
      }
    }
    
    return options;
  };

  const retryOptions = getRetryOptions();

  // 计算到执行时间的倒计时
  const getTimeRemaining = () => {
    if (!isPending) return null;
    const now = dayjs();
    const diff = scheduledTime.diff(now);
    
    if (diff <= 0) return '即将执行';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟后执行`;
    }
    return `${minutes}分钟后执行`;
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderLeft: `4px solid ${config.color}`,
      }}
    >
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space>
          <Tag color={config.tagColor} icon={config.icon}>
            {config.label}
          </Tag>
          {isFailed && task.errorType && (
            <Tag color={errorTypeColors[task.errorType]}>
              {errorTypeLabels[task.errorType]}
            </Tag>
          )}
          {task.result?.uploadedVideoId && (
            <Tooltip title="素材已上传成功，可跳过上传步骤重试">
              <Tag color="green" icon={<CheckCircleOutlined />}>
                素材已上传
              </Tag>
            </Tooltip>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {task.taskId.slice(-8)}
        </Text>
      </div>

      {/* 时间信息 */}
      <div style={{ marginTop: 8 }}>
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <Text type="secondary">
            计划时间: {scheduledTime.format('YYYY-MM-DD HH:mm')}
          </Text>
          {isPending && (
            <Text type="warning" style={{ fontSize: 12 }}>
              ({getTimeRemaining()})
            </Text>
          )}
        </Space>
      </div>

      {/* 视频信息 */}
      {task.config && (
        <div style={{ marginTop: 8 }}>
          <Space>
            <VideoCameraOutlined style={{ color: '#999' }} />
            <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
              {task.config.isRemoteUrl ? 'URL: ' : '文件: '}
              {task.config.videoPath}
            </Text>
          </Space>
        </div>
      )}

      {/* 错误详情 */}
      {isFailed && task.result && (
        <Collapse
          ghost
          size="small"
          style={{ marginTop: 8 }}
        >
          <Panel
            header={
              <Space>
                <InfoCircleOutlined />
                <Text type="secondary">查看错误详情</Text>
              </Space>
            }
            key="error"
          >
            <div style={{ padding: '8px 0' }}>
              <Paragraph style={{ marginBottom: 4 }}>
                <Text type="secondary">错误信息: </Text>
                <Text type="danger">
                  {task.result.friendlyMessage || task.result.error || '未知错误'}
                </Text>
              </Paragraph>
              {task.result.suggestion && (
                <Paragraph style={{ marginBottom: 4 }}>
                  <Text type="secondary">建议操作: </Text>
                  <Text type="warning">{task.result.suggestion}</Text>
                </Paragraph>
              )}
              {task.result.errorStep && (
                <Paragraph style={{ marginBottom: 4 }}>
                  <Text type="secondary">失败步骤: </Text>
                  <Tag>
                    {task.result.errorStep === 'validate' && '参数验证'}
                    {task.result.errorStep === 'upload' && '上传素材'}
                    {task.result.errorStep === 'publish' && '发布内容'}
                  </Tag>
                </Paragraph>
              )}
              {task.result.retryCount !== undefined && (
                <Paragraph style={{ marginBottom: 0 }}>
                  <Text type="secondary">已重试次数: </Text>
                  <Text>{task.result.retryCount}</Text>
                </Paragraph>
              )}
            </div>
          </Panel>
        </Collapse>
      )}

      {/* 成功结果 */}
      {task.status === 'completed' && task.result?.success && (
        <div style={{ marginTop: 8 }}>
          {task.result.shareUrl && (
            <Paragraph style={{ marginBottom: 0 }}>
              <Text type="secondary">分享链接: </Text>
              <a href={task.result.shareUrl} target="_blank" rel="noopener noreferrer">
                {task.result.shareUrl}
              </a>
            </Paragraph>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          {/* 取消按钮 */}
          {canCancel && (
            <Tooltip title="取消此定时任务">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onCancel(task.taskId)}
                loading={loading}
              >
                取消任务
              </Button>
            </Tooltip>
          )}

          {/* 重试按钮 */}
          {canRetry && retryOptions.map((option, index) => (
            <Tooltip key={index} title={option.step === PublishStep.PUBLISH ? '跳过上传，直接重试发布' : '从头开始重新执行'}>
              <Button
                size="small"
                type={index === 0 ? 'primary' : 'default'}
                icon={<ReloadOutlined />}
                onClick={() => onRetry(task.taskId, option.step)}
                loading={loading}
              >
                {option.label}
              </Button>
            </Tooltip>
          ))}

          {/* 不可重试提示 */}
          {isFailed && !canRetry && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              此错误不支持重试
            </Text>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default TaskStatusCard;
