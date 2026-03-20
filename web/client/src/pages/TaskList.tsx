import React, { useState, useEffect } from 'react';
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
} from '@ant-design/icons';
import { publishApi } from '../api/client';

const { Text } = Typography;

interface Task {
  taskId: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await publishApi.getTasks();
      setTasks(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (taskId: string) => {
    try {
      await publishApi.cancelTask(taskId);
      message.success('任务已取消');
      fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '取消任务失败');
    }
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
  };

  // 筛选数据
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.taskId.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      render: getStatusTag,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Task) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Popconfirm
              title="取消任务"
              description="确定要取消这个任务吗？"
              onConfirm={() => handleCancel(record.taskId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                取消
              </Button>
            </Popconfirm>
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
            label="失败"
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
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTasks}
            loading={loading}
          >
            刷新
          </Button>
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
