import React from 'react';
import { Alert, Button, Space, Typography, Tag, Tooltip, Divider } from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  LinkOutlined,
  WarningOutlined,
  CloudUploadOutlined,
  SendOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

// 错误类型枚举（与后端保持一致）
export enum PublishErrorType {
  TIMEOUT = 'TIMEOUT',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MATERIAL_ERROR = 'MATERIAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// 发布步骤枚举
export enum PublishStep {
  VALIDATE = 'validate',
  UPLOAD = 'upload',
  PUBLISH = 'publish',
}

// 扩展的发布结果接口
export interface PublishResultExtended {
  success: boolean;
  videoId?: string;
  shareUrl?: string;
  error?: string;
  createTime?: number;
  errorType?: PublishErrorType;
  errorStep?: PublishStep;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
  uploadedVideoId?: string;
  friendlyMessage?: string;
  suggestion?: string;
}

interface PublishErrorDisplayProps {
  result: PublishResultExtended;
  onRetry: (fromStep?: PublishStep) => void;
  onReauthorize?: () => void;
  retrying?: boolean;
}

// 错误类型配置
const errorTypeConfig: Record<PublishErrorType, {
  icon: React.ReactNode;
  color: string;
  tagColor: string;
  label: string;
}> = {
  [PublishErrorType.TIMEOUT]: {
    icon: <ClockCircleOutlined />,
    color: '#faad14',
    tagColor: 'warning',
    label: '请求超时',
  },
  [PublishErrorType.TOKEN_EXPIRED]: {
    icon: <ExclamationCircleOutlined />,
    color: '#ff4d4f',
    tagColor: 'error',
    label: '登录过期',
  },
  [PublishErrorType.MATERIAL_ERROR]: {
    icon: <StopOutlined />,
    color: '#ff7a45',
    tagColor: 'orange',
    label: '素材异常',
  },
  [PublishErrorType.RATE_LIMIT]: {
    icon: <WarningOutlined />,
    color: '#faad14',
    tagColor: 'warning',
    label: '平台限流',
  },
  [PublishErrorType.PERMISSION_DENIED]: {
    icon: <StopOutlined />,
    color: '#ff4d4f',
    tagColor: 'error',
    label: '权限不足',
  },
  [PublishErrorType.NETWORK_ERROR]: {
    icon: <LinkOutlined />,
    color: '#faad14',
    tagColor: 'warning',
    label: '网络错误',
  },
  [PublishErrorType.VALIDATION_ERROR]: {
    icon: <ExclamationCircleOutlined />,
    color: '#ff7a45',
    tagColor: 'orange',
    label: '参数错误',
  },
  [PublishErrorType.UNKNOWN]: {
    icon: <ExclamationCircleOutlined />,
    color: '#999',
    tagColor: 'default',
    label: '未知错误',
  },
};

// 步骤配置
const stepConfig: Record<PublishStep, {
  icon: React.ReactNode;
  label: string;
}> = {
  [PublishStep.VALIDATE]: {
    icon: <CheckCircleOutlined />,
    label: '参数验证',
  },
  [PublishStep.UPLOAD]: {
    icon: <CloudUploadOutlined />,
    label: '上传素材',
  },
  [PublishStep.PUBLISH]: {
    icon: <SendOutlined />,
    label: '发布内容',
  },
};

const PublishErrorDisplay: React.FC<PublishErrorDisplayProps> = ({
  result,
  onRetry,
  onReauthorize,
  retrying = false,
}) => {
  const errorType = result.errorType || PublishErrorType.UNKNOWN;
  const errorStep = result.errorStep;
  const config = errorTypeConfig[errorType];
  const stepInfo = errorStep ? stepConfig[errorStep] : null;

  // 判断是否可以从特定步骤重试
  const canRetryFromStep = (step: PublishStep): boolean => {
    if (!result.retryable) return false;
    
    // 如果有已上传的视频ID，可以直接从发布步骤重试
    if (step === PublishStep.PUBLISH && result.uploadedVideoId) {
      return true;
    }
    
    // 如果错误发生在上传或发布步骤，可以从上传步骤重试
    if (step === PublishStep.UPLOAD && 
        (errorStep === PublishStep.UPLOAD || errorStep === PublishStep.PUBLISH)) {
      return true;
    }
    
    // 验证步骤只能完整重试
    return step === PublishStep.VALIDATE;
  };

  // 生成重试选项
  const getRetryOptions = () => {
    const options: { step?: PublishStep; label: string; description: string }[] = [];
    
    // 完整重试
    if (result.retryable) {
      options.push({
        step: undefined,
        label: '完整重试',
        description: '从头开始重新执行所有步骤',
      });
    }
    
    // 如果有已上传的视频ID，可以只重试发布步骤
    if (result.uploadedVideoId && canRetryFromStep(PublishStep.PUBLISH)) {
      options.push({
        step: PublishStep.PUBLISH,
        label: '仅重试发布',
        description: '跳过上传，直接重试发布步骤',
      });
    }
    
    return options;
  };

  const retryOptions = getRetryOptions();

  return (
    <Alert
      type="error"
      showIcon
      icon={config.icon}
      message={
        <Space>
          <Text strong>发布失败</Text>
          <Tag color={config.tagColor}>{config.label}</Tag>
          {stepInfo && (
            <Tag icon={stepInfo.icon} color="default">
              失败步骤: {stepInfo.label}
            </Tag>
          )}
        </Space>
      }
      description={
        <div style={{ marginTop: 12 }}>
          {/* 错误消息 */}
          <Paragraph style={{ marginBottom: 8 }}>
            <Text type="secondary">错误信息：</Text>
            <Text>{result.friendlyMessage || result.error || '发布过程中发生错误'}</Text>
          </Paragraph>

          {/* 建议操作 */}
          {result.suggestion && (
            <Paragraph style={{ marginBottom: 8 }}>
              <Text type="secondary">建议操作：</Text>
              <Text type="warning">{result.suggestion}</Text>
            </Paragraph>
          )}

          {/* 重试信息 */}
          {result.retryCount !== undefined && result.maxRetries !== undefined && (
            <Paragraph style={{ marginBottom: 12 }}>
              <Text type="secondary">
                已重试 {result.retryCount} 次 / 最多 {result.maxRetries} 次
              </Text>
            </Paragraph>
          )}

          {/* 已上传视频ID提示 */}
          {result.uploadedVideoId && (
            <Paragraph style={{ marginBottom: 12 }}>
              <Tag color="green" icon={<CheckCircleOutlined />}>
                素材已上传成功
              </Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                可以跳过上传步骤直接重试发布
              </Text>
            </Paragraph>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* 操作按钮 */}
          <Space wrap>
            {/* Token过期特殊处理 */}
            {errorType === PublishErrorType.TOKEN_EXPIRED && onReauthorize && (
              <Button
                type="primary"
                danger
                onClick={onReauthorize}
                icon={<LinkOutlined />}
              >
                重新授权
              </Button>
            )}

            {/* 重试选项 */}
            {retryOptions.map((option, index) => (
              <Tooltip key={index} title={option.description}>
                <Button
                  type={index === 0 ? 'primary' : 'default'}
                  onClick={() => onRetry(option.step)}
                  loading={retrying}
                  disabled={!result.retryable}
                  icon={<ReloadOutlined />}
                >
                  {option.label}
                </Button>
              </Tooltip>
            ))}

            {/* 不可重试提示 */}
            {!result.retryable && (
              <Text type="secondary">
                此错误类型不支持自动重试，请根据建议操作手动处理
              </Text>
            )}
          </Space>
        </div>
      }
      style={{ marginBottom: 16 }}
    />
  );
};

export default PublishErrorDisplay;
