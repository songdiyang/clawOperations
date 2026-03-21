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
} from '@ant-design/icons';
import { publishApi } from '../api/client';

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

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await publishApi.getTasks();
      setTasks(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

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

  // 批量重试失败任务
  const handleRetryAllFailed = async () => {
    const failedTasks = tasks.filter(t => t.status === 'failed' && t.retryable !== false);
    
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
    };
    const config = configs[status] || { icon: null, color: 'default', text: status };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  // 统计数据
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    retryable: tasks.filter((t) => t.status === 'failed' && t.retryable !== false).length,
  };

  // 筛选数据
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.taskId.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 错误类型标签颜色
  const errorTypeColors: Record<string, string> = {
    TIMEOUT: 'warning',
    TOKEN_EXPIRED: 'error',
    MATERIAL_ERROR: 'orange',
    RATE_LIMIT: 'warning',
    PERMISSION_DENIED: 'error',
    NETWORK_ERROR: 'warning',
    VALIDATION_ERROR: 'orange',
    UNKNOWN: 'default',
  };

  // 错误类型标签文字
  const errorTypeLabels: Record<string, string> = {
    TIMEOUT: '超时',
    TOKEN_EXPIRED: '登录过期',
    MATERIAL_ERROR: '素材异常',
    RATE_LIMIT: '限流',
    PERMISSION_DENIED: '权限不足',
    NETWORK_ERROR: '网络错误',
    VALIDATION_ERROR: '参数错误',
    UNKNOWN: '未知',
  };

  const columns = [
    {
      title: '任务 ID',
      dataIndex: 'taskId',
      key: 'taskId',
      ellipsis: true,
      render: (id: string) => (
        <Text code copyable={{ text: id }} style={{ fontSize: 13 }}>
          {id.slice(0, 20)}...
        </Text>
      ),
    },
    {
      title: '计划时间',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 180,
      render: (time: string) => (
        <Text>{new Date(time).toLocaleString()}</Text>
      ),
      sorter: (a: Task, b: Task) =>
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: Task) => (
        <Space direction="vertical" size={2}>
          {getStatusTag(status)}
          {record.status === 'failed' && record.errorType && (
            <Tag color={errorTypeColors[record.errorType] || 'default'} style={{ fontSize: 11 }}>
              {errorTypeLabels[record.errorType] || record.errorType}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '错误详情',
      key: 'errorDetail',
      width: 250,
      render: (_: any, record: Task) => {
        if (record.status !== 'failed' || !record.result) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <Collapse ghost size="small">
            <Panel
              header={
                <Space>
                  <InfoCircleOutlined />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.result.friendlyMessage || record.result.error?.slice(0, 30) || '查看详情'}
                  </Text>
                </Space>
              }
              key="1"
            >
              <div style={{ fontSize: 12 }}>
                {record.result.error && (
                  <Paragraph type="danger" style={{ marginBottom: 4, fontSize: 12 }}>
                    {record.result.error}
                  </Paragraph>
                )}
                {record.result.suggestion && (
                  <Paragraph type="warning" style={{ marginBottom: 4, fontSize: 12 }}>
                    建议: {record.result.suggestion}
                  </Paragraph>
                )}
                {record.result.errorStep && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    失败步骤: {record.result.errorStep === 'validate' ? '验证' : 
                              record.result.errorStep === 'upload' ? '上传' : '发布'}
                  </Text>
                )}
                {record.result.uploadedVideoId && (
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
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Task) => (
        <Space size="small" wrap>
          {record.status === 'pending' && (
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
          {record.status === 'failed' && record.retryable !== false && (
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
          {record.status === 'failed' && record.retryable === false && (
            <Text type="secondary" style={{ fontSize: 12 }}>不可重试</Text>
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
              onClick={fetchTasks}
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
          }}
        >
          <Input
            placeholder="搜索任务 ID"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待执行' },
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
    </div>
  );
};

export default TaskList;
