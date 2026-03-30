import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  Typography,
  Empty,
  Row,
  Col,
  Input,
  Select,
  Modal,
  notification,
  Tooltip,
  Collapse,
  Progress,
  Segmented,
  Image,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  SyncOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { publishApi, aiApi } from '../api/client';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface TaskResult {
  success: boolean;
  error?: string;
  errorType?: string;
  errorStep?: string;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
  uploadedVideoId?: string;
  friendlyMessage?: string;
  suggestion?: string;
}

interface Task {
  taskId: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: TaskResult;
  config?: {
    videoPath: string;
    options?: any;
    isRemoteUrl?: boolean;
  };
  errorType?: string;
  retryable?: boolean;
}

// AI 任务类型
interface AITask {
  taskId: string;
  status: 'pending' | 'analyzing' | 'generating' | 'copywriting' | 'publishing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  result?: {
    success: boolean;
    analysis?: {
      contentType: 'image' | 'video';
      theme: string;
      style?: string;
      targetAudience?: string;
      keyPoints?: string[];
    };
    content?: {
      type: 'image' | 'video';
      previewUrl?: string;
      localPath?: string;
    };
    copywriting?: {
      title: string;
      description: string;
      hashtags: string[];
    };
  };
}

// 统一任务类型
interface UnifiedTask {
  taskId: string;
  type: 'publish' | 'ai';
  status: string;
  time: string;
  progress?: number;
  currentStep?: string;
  error?: string;
  result?: any;
  retryable?: boolean;
  contentType?: 'image' | 'video';
}

// 获取正确的预览 URL（处理豆包 URL 过期问题）
const getPreviewUrl = (content?: { previewUrl?: string; localPath?: string }): string | null => {
  if (!content) return null;
  
  // 优先使用本地 URL
  if (content.previewUrl?.startsWith('/generated/')) {
    return content.previewUrl;
  }
  
  // 从 localPath 提取文件名构造本地 URL
  if (content.localPath) {
    const fileName = content.localPath.split(/[\\\/]/).pop();
    if (fileName) {
      return `/generated/${fileName}`;
    }
  }
  
  // 回退到原始 previewUrl（可能是过期的外部链接）
  return content.previewUrl || null;
};

const TaskList: React.FC = () => {
  const [publishTasks, setPublishTasks] = useState<Task[]>([]);
  const [aiTasks, setAITasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'publish' | 'ai'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<{
    analysis?: {
      theme: string;
      style?: string;
      targetAudience?: string;
      keyPoints?: string[];
      contentType: 'image' | 'video';
    };
    content?: {
      type: 'image' | 'video';
      previewUrl?: string;
      localPath?: string;
    };
    copywriting?: {
      title: string;
      description: string;
      hashtags: string[];
    };
  } | null>(null);

  // 打开详情弹窗
  const openDetail = (result: any) => {
    if (!result) {
      message.warning('无法获取任务详情');
      return;
    }
    setDetailData({
      analysis: result.analysis,
      content: result.content,
      copywriting: result.copywriting,
    });
    setDetailOpen(true);
  };

  // 合并两种任务为统一格式
  const unifiedTasks: UnifiedTask[] = [
    // AI 任务
    ...aiTasks.map((t): UnifiedTask => ({
      taskId: t.taskId,
      type: 'ai',
      status: t.status,
      time: new Date(t.createdAt).toISOString(),
      progress: t.progress,
      currentStep: t.currentStep,
      error: t.error,
      result: t.result,
      retryable: false,
      contentType: t.result?.analysis?.contentType || t.result?.content?.type,
    })),
    // 发布任务
    ...publishTasks.map((t): UnifiedTask => ({
      taskId: t.taskId,
      type: 'publish',
      status: t.status,
      time: t.scheduledTime,
      error: t.result?.error,
      result: t.result,
      retryable: t.retryable,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const fetchTasks = useCallback(async (isInitial = false) => {
    // 只有初次加载或手动刷新时才显示 loading
    if (isInitial && !initialLoaded) {
      setLoading(true);
    }
    try {
      // 并行获取两种任务
      const [publishRes, aiRes] = await Promise.all([
        publishApi.getTasks().catch(() => ({ data: { data: [] } })),
        aiApi.getTasks().catch(() => ({ data: { data: [] } })),
      ]);
      setPublishTasks(publishRes.data.data || []);
      setAITasks(aiRes.data.data || []);
    } catch (error: any) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
      if (!initialLoaded) setInitialLoaded(true);
    }
  }, [initialLoaded]);

  // 检查是否有进行中的 AI 任务
  const hasActiveAITasks = aiTasks.some(t => 
    ['pending', 'analyzing', 'generating', 'copywriting', 'publishing'].includes(t.status)
  );

  useEffect(() => {
    // 初次加载
    fetchTasks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 后台轮询：有进行中的 AI 任务时每 5 秒刷新；否则每 30 秒刷新
    const intervalMs = hasActiveAITasks ? 5000 : 30000;
    const interval = setInterval(() => fetchTasks(false), intervalMs);
    return () => clearInterval(interval);
  }, [hasActiveAITasks, fetchTasks]);

  const handleCancel = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await publishApi.cancelTask(taskId);
      message.success('任务已取消');
      fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '取消任务失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 重试任务
  const handleRetry = async (taskId: string, fromStep?: string) => {
    setActionLoading(taskId);
    try {
      const response = await publishApi.retryTask(taskId, fromStep as any);
      const result = response.data.data;

      if (result.success) {
        message.success('重试成功！');
        notification.success({
          message: '任务重试成功',
          description: `任务 ${taskId.slice(-8)} 已成功完成`,
        });
      } else {
        message.error(result.friendlyMessage || result.error || '重试失败');
        notification.error({
          message: '任务重试失败',
          description: result.friendlyMessage || result.error || '重试过程中发生错误',
          duration: 0,
        });
      }

      await fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '重试失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 批量重试失败任务（只对定时发布任务有效）
  const handleRetryAllFailed = async () => {
    const failedTasks = publishTasks.filter(t => t.status === 'failed' && t.retryable !== false);
    
    if (failedTasks.length === 0) {
      message.info('没有可重试的失败任务');
      return;
    }

    Modal.confirm({
      title: '批量重试',
      content: `确定要重试 ${failedTasks.length} 个失败的任务吗？`,
      okText: '全部重试',
      cancelText: '取消',
      onOk: async () => {
        let successCount = 0;
        let failCount = 0;

        for (const task of failedTasks) {
          try {
            const response = await publishApi.retryTask(task.taskId);
            if (response.data.data.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        }

        notification.info({
          message: '批量重试完成',
          description: `成功: ${successCount} 个, 失败: ${failCount} 个`,
        });

        await fetchTasks();
      },
    });
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
      pending: { icon: <ClockCircleOutlined />, color: 'processing', text: '待执行' },
      completed: { icon: <CheckCircleOutlined />, color: 'success', text: '已完成' },
      failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
      cancelled: { icon: <PauseCircleOutlined />, color: 'default', text: '已取消' },
      // AI 任务特有状态
      analyzing: { icon: <SyncOutlined spin />, color: 'processing', text: '分析中' },
      generating: { icon: <SyncOutlined spin />, color: 'blue', text: '生成中' },
      copywriting: { icon: <SyncOutlined spin />, color: 'cyan', text: '文案中' },
      publishing: { icon: <SyncOutlined spin />, color: 'orange', text: '发布中' },
    };
    const config = configs[status] || { icon: null, color: 'default', text: status };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  // 任务类型标签
  const getTypeTag = (type: 'publish' | 'ai', contentType?: 'image' | 'video') => {
    if (type === 'ai') {
      return (
        <Tag icon={<RobotOutlined />} color="purple">
          AI创作{contentType === 'image' ? '(图)' : contentType === 'video' ? '(视频)' : ''}
        </Tag>
      );
    }
    return (
      <Tag icon={<VideoCameraOutlined />} color="blue">
        定时发布
      </Tag>
    );
  };

  // 统计数据 - 使用统一任务列表
  const stats = {
    total: unifiedTasks.length,
    pending: unifiedTasks.filter((t) => ['pending', 'analyzing', 'generating', 'copywriting', 'publishing'].includes(t.status)).length,
    completed: unifiedTasks.filter((t) => t.status === 'completed').length,
    failed: unifiedTasks.filter((t) => t.status === 'failed').length,
    retryable: unifiedTasks.filter((t) => t.status === 'failed' && t.retryable !== false && t.type === 'publish').length,
    aiTasks: aiTasks.length,
    publishTasks: publishTasks.length,
  };

  // 筛选数据
  const filteredTasks = unifiedTasks.filter((task) => {
    const matchesSearch = task.taskId.toLowerCase().includes(searchText.toLowerCase());
    // 状态筛选：pending 包括所有进行中的状态
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && ['pending', 'analyzing', 'generating', 'copywriting', 'publishing'].includes(task.status)) ||
      task.status === statusFilter;
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns = [
    {
      title: '任务 ID',
      dataIndex: 'taskId',
      key: 'taskId',
      ellipsis: true,
      render: (id: string, record: UnifiedTask) => (
        <Space direction="vertical" size={2}>
          <Text code copyable={{ text: id }} style={{ fontSize: 13 }}>
            {id.slice(0, 20)}...
          </Text>
          {getTypeTag(record.type, record.contentType)}
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 180,
      render: (time: string) => (
        <Text>{new Date(time).toLocaleString()}</Text>
      ),
      sorter: (a: UnifiedTask, b: UnifiedTask) =>
        new Date(a.time).getTime() - new Date(b.time).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string, record: UnifiedTask) => (
        <Space direction="vertical" size={4}>
          {getStatusTag(status)}
          {/* AI 任务显示进度条 */}
          {record.type === 'ai' && record.progress !== undefined && record.status !== 'completed' && record.status !== 'failed' && (
            <Progress 
              percent={record.progress} 
              size="small" 
              status="active"
              style={{ width: 100 }}
              format={(percent) => `${percent}%`}
            />
          )}
          {/* AI 任务显示当前步骤 */}
          {record.type === 'ai' && record.currentStep && record.status !== 'completed' && record.status !== 'failed' && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.currentStep}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '详情',
      key: 'detail',
      width: 280,
      render: (_: any, record: UnifiedTask) => {
        // AI 任务完成后显示结果信息
        if (record.type === 'ai' && record.status === 'completed' && record.result) {
          const content = record.result.content;
          const previewUrl = getPreviewUrl(content);
          return (
            <Space direction="vertical" size={2}>
              {record.result.analysis?.theme && (
                <Text style={{ fontSize: 12 }}>主题: {record.result.analysis.theme}</Text>
              )}
              {content?.type && (
                <Tag color={content.type === 'video' ? 'blue' : 'green'} style={{ fontSize: 11 }}>
                  {content.type === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                  {' '}{content.type === 'video' ? '视频' : '图片'}已生成
                </Tag>
              )}
              {previewUrl && (
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  style={{ fontSize: 11, padding: 0, height: 'auto' }}
                  onClick={() => openDetail(record.result)}
                >
                  查看详情
                </Button>
              )}
            </Space>
          );
        }
        
        // 失败任务显示错误详情
        if (record.status === 'failed') {
          const errorMsg = record.error || record.result?.error;
          if (!errorMsg) return <Text type="secondary">-</Text>;
          
          return (
            <Collapse ghost size="small">
              <Panel
                header={
                  <Space>
                    <InfoCircleOutlined />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {record.result?.friendlyMessage || errorMsg?.slice(0, 30) || '查看详情'}
                    </Text>
                  </Space>
                }
                key="1"
              >
                <div style={{ fontSize: 12 }}>
                  {errorMsg && (
                    <Paragraph type="danger" style={{ marginBottom: 4, fontSize: 12 }}>
                      {errorMsg}
                    </Paragraph>
                  )}
                  {record.result?.suggestion && (
                    <Paragraph type="warning" style={{ marginBottom: 4, fontSize: 12 }}>
                      建议: {record.result.suggestion}
                    </Paragraph>
                  )}
                  {record.result?.errorStep && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      失败步骤: {record.result.errorStep === 'validate' ? '验证' : 
                                record.result.errorStep === 'upload' ? '上传' : '发布'}
                    </Text>
                  )}
                  {record.result?.uploadedVideoId && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color="green" style={{ fontSize: 11 }}>
                        <CheckCircleOutlined /> 素材已上传
                      </Tag>
                    </div>
                  )}
                </div>
              </Panel>
            </Collapse>
          );
        }
        
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: UnifiedTask) => (
        <Space size="small" wrap>
          {/* 定时发布任务的操作 */}
          {record.type === 'publish' && record.status === 'pending' && (
            <Popconfirm
              title="取消任务"
              description="确定要取消这个任务吗？"
              onConfirm={() => handleCancel(record.taskId)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="text" 
                danger 
                size="small" 
                icon={<DeleteOutlined />}
                loading={actionLoading === record.taskId}
              >
                取消
              </Button>
            </Popconfirm>
          )}
          {record.type === 'publish' && record.status === 'failed' && record.retryable !== false && (
            <>
              <Tooltip title="完整重试">
                <Button
                  type="primary"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => handleRetry(record.taskId)}
                  loading={actionLoading === record.taskId}
                >
                  重试
                </Button>
              </Tooltip>
              {record.result?.uploadedVideoId && (
                <Tooltip title="跳过上传，直接重试发布">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRetry(record.taskId, 'publish')}
                    loading={actionLoading === record.taskId}
                  >
                    仅发布
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          {record.type === 'publish' && record.status === 'failed' && record.retryable === false && (
            <Text type="secondary" style={{ fontSize: 12 }}>不可重试</Text>
          )}
          {/* AI 任务查看详情 */}
          {record.type === 'ai' && record.status === 'completed' && record.result && (
            <Button
              size="small"
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => openDetail(record.result)}
            >
              查看详情
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 统计卡片组件
  const StatCard = ({
    icon,
    value,
    label,
    color,
    bgColor,
  }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    color: string;
    bgColor: string;
  }) => (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        border: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#1f2937', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<UnorderedListOutlined />}
            value={stats.total}
            label="全部任务"
            color="#1677ff"
            bgColor="#e6f4ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<ClockCircleOutlined />}
            value={stats.pending}
            label="待执行"
            color="#faad14"
            bgColor="#fffbe6"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<CheckCircleOutlined />}
            value={stats.completed}
            label="已完成"
            color="#52c41a"
            bgColor="#f6ffed"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<ExclamationCircleOutlined />}
            value={stats.failed}
            label={`失败${stats.retryable > 0 ? ` (${stats.retryable}可重试)` : ''}`}
            color="#ff4d4f"
            bgColor="#fff2f0"
          />
        </Col>
      </Row>

      {/* 任务列表 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1677ff' }} />
            <span>任务列表</span>
          </Space>
        }
        extra={
          <Space>
            {stats.retryable > 0 && (
              <Button
                type="primary"
                danger
                icon={<ReloadOutlined />}
                onClick={handleRetryAllFailed}
              >
                批量重试 ({stats.retryable})
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTasks(true)}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 筛选工具栏 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Segmented
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as typeof typeFilter)}
            options={[
              { value: 'all', label: `全部 (${stats.total})` },
              { value: 'ai', label: <span><RobotOutlined /> AI创作 ({stats.aiTasks})</span> },
              { value: 'publish', label: <span><VideoCameraOutlined /> 定时发布 ({stats.publishTasks})</span> },
            ]}
          />
          <Input
            placeholder="搜索任务 ID"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '进行中' },
              { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="taskId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  <span style={{ color: '#9ca3af' }}>
                    暂无{statusFilter !== 'all' ? '符合条件的' : ''}任务
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* 创作详情弹窗 */}
      <Modal
        title="创作详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={650}
        centered
        destroyOnClose
      >
        {detailData && (
          <div>
            {/* 分析结果 */}
            {detailData.analysis && (
              <>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>分析结果</Text>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="主题">{detailData.analysis.theme}</Descriptions.Item>
                  <Descriptions.Item label="风格">{detailData.analysis.style || '-'}</Descriptions.Item>
                  <Descriptions.Item label="目标受众">{detailData.analysis.targetAudience || '-'}</Descriptions.Item>
                  <Descriptions.Item label="内容类型">
                    {detailData.analysis.contentType === 'image' ? '图片' : '视频'}
                  </Descriptions.Item>
                </Descriptions>
                {detailData.analysis.keyPoints && detailData.analysis.keyPoints.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">关键卖点: </Text>
                    {detailData.analysis.keyPoints.map((point, idx) => (
                      <Tag key={idx}>{point}</Tag>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* 生成内容 */}
            {detailData.content && (
              <>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>生成内容</Text>
                {detailData.content.type === 'image' ? (
                  <Image
                    src={getPreviewUrl(detailData.content) || ''}
                    style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 8 }}
                  />
                ) : (
                  <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                    <video
                      src={getPreviewUrl(detailData.content) || ''}
                      controls
                      style={{ maxWidth: '100%', maxHeight: 350, display: 'block', borderRadius: 8 }}
                    >
                      您的浏览器不支持视频播放
                    </video>
                  </div>
                )}
                {detailData.content.localPath && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {detailData.content.localPath}
                  </Text>
                )}
              </>
            )}
            
            {/* 推广文案 */}
            {detailData.copywriting && (
              <>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>推广文案</Text>
                <Card size="small" style={{ background: '#f9fafb' }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {detailData.copywriting.title}
                  </Text>
                  <Text style={{ display: 'block', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                    {detailData.copywriting.description}
                  </Text>
                  <Space wrap>
                    {detailData.copywriting.hashtags.map((tag, idx) => (
                      <Tag key={idx} color="blue">#{tag}</Tag>
                    ))}
                  </Space>
                </Card>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskList;
