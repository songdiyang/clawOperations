/**
 * 草稿管理组件
 * 展示和管理保存的创作草稿
 */

import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  Card, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Empty, 
  Popconfirm,
  message,
  Spin,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { aiApi } from '../../api/client';

const { Text, Paragraph } = Typography;

interface Draft {
  id: string;
  requirement: string;
  status: string;
  lastCompletedStep: number;
  updatedAt: string;
  contentTypePreference?: 'image' | 'video' | 'auto';
}

interface DraftManagerProps {
  visible: boolean;
  onClose: () => void;
  onResume: (draft: Draft) => void;
  onDelete?: (draftId: string) => void;
}

// 步骤名称映射
const STEP_NAMES = ['输入需求', '智能分析', '内容生成', '文案生成', '发布'];

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
  }
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DraftManager: React.FC<DraftManagerProps> = ({
  visible,
  onClose,
  onResume,
  onDelete,
}) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载草稿列表
  const loadDrafts = async () => {
    setLoading(true);
    try {
      const response = await aiApi.getDrafts();
      if (response.data.success) {
        setDrafts(response.data.data);
      }
    } catch (error: any) {
      message.error('加载草稿失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadDrafts();
    }
  }, [visible]);

  // 删除草稿
  const handleDelete = async (id: string) => {
    try {
      const response = await aiApi.deleteDraft(id);
      if (response.data.success) {
        message.success('草稿已删除');
        setDrafts(drafts.filter(d => d.id !== id));
        onDelete?.(id);
      }
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 恢复草稿
  const handleResume = async (draft: Draft) => {
    try {
      const response = await aiApi.resumeDraft(draft.id);
      if (response.data.success) {
        onResume(response.data.data);
        onClose();
      }
    } catch (error: any) {
      message.error('恢复草稿失败: ' + (error.message || '未知错误'));
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <FileTextOutlined />
          <span>我的草稿</span>
          <Tag color="blue">{drafts.length}</Tag>
        </Space>
      }
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {drafts.length === 0 ? (
          <Empty 
            description="暂无草稿" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={drafts}
            renderItem={(draft) => (
              <Card
                size="small"
                style={{ marginBottom: 12 }}
                hoverable
                actions={[
                  <Button
                    key="resume"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleResume(draft)}
                  >
                    继续编辑
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确定删除这个草稿吗？"
                    onConfirm={() => handleDelete(draft.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 8 }}
                >
                  {draft.requirement || '无需求描述'}
                </Paragraph>
                
                <Space size="small" wrap>
                  <Tag color="blue">
                    {STEP_NAMES[draft.lastCompletedStep] || '未开始'}
                  </Tag>
                  
                  {draft.contentTypePreference && draft.contentTypePreference !== 'auto' && (
                    <Tag color="purple">
                      {draft.contentTypePreference === 'image' ? '图片' : '视频'}
                    </Tag>
                  )}
                  
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatDate(draft.updatedAt)}
                  </Text>
                </Space>
              </Card>
            )}
          />
        )}
      </Spin>
    </Drawer>
  );
};

export default DraftManager;
