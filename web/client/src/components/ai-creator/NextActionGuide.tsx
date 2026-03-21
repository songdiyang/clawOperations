/**
 * 下一步建议组件
 * 展示智能流程引导和下一步操作建议
 */

import React from 'react';
import { Card, Typography, Space, Tag, Button, Alert } from 'antd';
import {
  BulbOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface NextActionSuggestion {
  action: string;
  message: string;
  estimatedTime: string;
  alternatives: string[];
  tips: string[];
}

interface NextActionGuideProps {
  suggestion: NextActionSuggestion | null;
  onExecute: () => void;
  onAlternative?: (alternative: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

// 操作到按钮文字的映射
const ACTION_LABELS: Record<string, string> = {
  analyze: '开始分析',
  generate: '生成内容',
  copywriting: '生成文案',
  preview: '预览内容',
  publish: '发布到抖音',
  save_draft: '保存草稿',
};

// 操作到颜色的映射
const ACTION_COLORS: Record<string, string> = {
  analyze: '#1890ff',
  generate: '#722ed1',
  copywriting: '#13c2c2',
  preview: '#52c41a',
  publish: '#fa541c',
  save_draft: '#8c8c8c',
};

const NextActionGuide: React.FC<NextActionGuideProps> = ({
  suggestion,
  onExecute,
  onAlternative,
  loading = false,
  disabled = false,
}) => {
  if (!suggestion) {
    return null;
  }

  const actionLabel = ACTION_LABELS[suggestion.action] || '执行下一步';
  const actionColor = ACTION_COLORS[suggestion.action] || '#1890ff';

  return (
    <Card 
      size="small"
      style={{ 
        marginBottom: 16,
        borderLeft: `4px solid ${actionColor}`,
      }}
    >
      {/* 建议标题 */}
      <Space style={{ marginBottom: 12 }}>
        <BulbOutlined style={{ color: '#faad14', fontSize: 18 }} />
        <Text strong style={{ fontSize: 15 }}>下一步建议</Text>
      </Space>

      {/* 主要建议 */}
      <Alert
        message={suggestion.message}
        type="info"
        showIcon
        icon={<RocketOutlined />}
        style={{ marginBottom: 12 }}
        action={
          <Space>
            <Tag icon={<ClockCircleOutlined />} color="default">
              {suggestion.estimatedTime}
            </Tag>
            <Button
              type="primary"
              size="small"
              icon={<RightOutlined />}
              onClick={onExecute}
              loading={loading}
              disabled={disabled}
              style={{ backgroundColor: actionColor, borderColor: actionColor }}
            >
              {actionLabel}
            </Button>
          </Space>
        }
      />

      {/* 提示信息 */}
      {suggestion.tips.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {suggestion.tips.map((tip, idx) => (
            <Paragraph
              key={idx}
              type="secondary"
              style={{ marginBottom: 4, fontSize: 12 }}
            >
              <BulbOutlined style={{ marginRight: 4 }} />
              {tip}
            </Paragraph>
          ))}
        </div>
      )}

      {/* 备选操作 */}
      {suggestion.alternatives.length > 0 && onAlternative && (
        <Space size="small" wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>或者:</Text>
          {suggestion.alternatives.map((alt, idx) => (
            <Button
              key={idx}
              type="link"
              size="small"
              onClick={() => onAlternative(alt)}
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
            >
              {alt}
            </Button>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default NextActionGuide;
