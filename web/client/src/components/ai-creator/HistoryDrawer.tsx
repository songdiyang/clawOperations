/**
 * 历史记录抽屉组件
 * 展示完成的创作历史
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
  Image,
  message,
  Spin,
  Modal,
  Descriptions,
} from 'antd';
import {
  HistoryOutlined,
  EyeOutlined,
  CopyOutlined,
  FileAddOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { aiApi } from '../../api/client';

const { Text, Paragraph } = Typography;

interface HistoryItem {
  id: string;
  requirement: string;
  status: string;
  analysis?: {
    theme: string;
    style: string;
    targetAudience: string;
    keyPoints: string[];
    contentType: 'image' | 'video';
  };
  content?: {
    type: 'image' | 'video';
    localPath: string;
    previewUrl?: string;
  };
  copywriting?: {
    title: string;
    description: string;
    hashtags: string[];
  };
  completedAt?: string;
  updatedAt: string;
}

interface HistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onCreateTemplate: (item: HistoryItem) => void;
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  visible,
  onClose,
  onCreateTemplate,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // 加载历史记录
  const loadHistory = async (reset = false) => {
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const response = await aiApi.getHistory({ limit, offset: newOffset });
      if (response.data.success) {
        const { items, total: totalCount } = response.data.data;
        if (reset) {
          setHistory(items);
          setOffset(limit);
        } else {
          setHistory([...history, ...items]);
          setOffset(newOffset + limit);
        }
        setTotal(totalCount);
      }
    } catch (error: any) {
      message.error('加载历史记录失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadHistory(true);
    }
  }, [visible]);

  // 查看详情
  const handleViewDetail = async (item: HistoryItem) => {
    try {
      const response = await aiApi.getHistoryDetail(item.id);
      if (response.data.success) {
        setSelectedItem(response.data.data);
        setDetailVisible(true);
      }
    } catch (error: any) {
      message.error('获取详情失败');
    }
  };

  // 复制文案
  const handleCopyCopywriting = (item: HistoryItem) => {
    if (item.copywriting) {
      const text = `${item.copywriting.title}\n\n${item.copywriting.description}\n\n${item.copywriting.hashtags.map(t => `#${t}`).join(' ')}`;
      navigator.clipboard.writeText(text);
      message.success('文案已复制');
    }
  };

  return (
    <>
      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            <span>创作历史</span>
            <Tag color="blue">{total}</Tag>
          </Space>
        }
        placement="right"
        width={450}
        open={visible}
        onClose={onClose}
      >
        <Spin spinning={loading && history.length === 0}>
          {history.length === 0 ? (
            <Empty 
              description="暂无历史记录" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              <List
                dataSource={history}
                renderItem={(item) => (
                  <Card
                    size="small"
                    style={{ marginBottom: 12 }}
                    hoverable
                  >
                    {/* 标题和状态 */}
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space>
                        {item.content?.type === 'image' ? (
                          <PictureOutlined style={{ color: '#1890ff' }} />
                        ) : (
                          <VideoCameraOutlined style={{ color: '#722ed1' }} />
                        )}
                        <Text strong ellipsis style={{ maxWidth: 200 }}>
                          {item.copywriting?.title || item.analysis?.theme || '未命名'}
                        </Text>
                      </Space>
                      {item.status === 'completed' ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>
                      ) : (
                        <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
                      )}
                    </Space>
                    
                    {/* 需求描述 */}
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      type="secondary"
                      style={{ marginBottom: 8, fontSize: 12 }}
                    >
                      {item.requirement}
                    </Paragraph>
                    
                    {/* 时间和操作 */}
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {formatDate(item.completedAt || item.updatedAt)}
                      </Text>
                      <Space size="small">
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewDetail(item)}
                        >
                          详情
                        </Button>
                        {item.copywriting && (
                          <Button
                            type="link"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyCopywriting(item)}
                          >
                            复制
                          </Button>
                        )}
                        <Button
                          type="link"
                          size="small"
                          icon={<FileAddOutlined />}
                          onClick={() => onCreateTemplate(item)}
                        >
                          存为模板
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                )}
              />
              
              {/* 加载更多 */}
              {history.length < total && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Button 
                    onClick={() => loadHistory(false)} 
                    loading={loading}
                  >
                    加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </Spin>
      </Drawer>

      {/* 详情弹窗 */}
      <Modal
        title="创作详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedItem && (
          <div>
            {/* 分析结果 */}
            {selectedItem.analysis && (
              <>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>分析结果</Text>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="主题">{selectedItem.analysis.theme}</Descriptions.Item>
                  <Descriptions.Item label="风格">{selectedItem.analysis.style}</Descriptions.Item>
                  <Descriptions.Item label="目标受众">{selectedItem.analysis.targetAudience}</Descriptions.Item>
                  <Descriptions.Item label="内容类型">
                    {selectedItem.analysis.contentType === 'image' ? '图片' : '视频'}
                  </Descriptions.Item>
                </Descriptions>
                {selectedItem.analysis.keyPoints && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">关键卖点: </Text>
                    {selectedItem.analysis.keyPoints.map((point, idx) => (
                      <Tag key={idx}>{point}</Tag>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* 生成内容 */}
            {selectedItem.content && (
              <>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>生成内容</Text>
                {selectedItem.content.type === 'image' && selectedItem.content.previewUrl && (
                  <Image
                    src={selectedItem.content.previewUrl}
                    style={{ maxWidth: '100%', maxHeight: 300 }}
                  />
                )}
                {selectedItem.content.type === 'video' && selectedItem.content.previewUrl && (
                  <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <video
                      src={selectedItem.content.previewUrl}
                      controls
                      style={{ maxWidth: '100%', maxHeight: 300, display: 'block', borderRadius: 8 }}
                    >
                      您的浏览器不支持视频播放
                    </video>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      {selectedItem.content.localPath}
                    </Text>
                  </div>
                )}
                {selectedItem.content.type === 'video' && !selectedItem.content.previewUrl && (
                  <Text type="secondary">视频文件: {selectedItem.content.localPath}</Text>
                )}
              </>
            )}
            
            {/* 文案 */}
            {selectedItem.copywriting && (
              <>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>推广文案</Text>
                <Card size="small">
                  <Paragraph strong>{selectedItem.copywriting.title}</Paragraph>
                  <Paragraph>{selectedItem.copywriting.description}</Paragraph>
                  <Space wrap>
                    {selectedItem.copywriting.hashtags.map((tag, idx) => (
                      <Tag key={idx} color="blue">#{tag}</Tag>
                    ))}
                  </Space>
                </Card>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default HistoryDrawer;
