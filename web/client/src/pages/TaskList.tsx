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
  Badge,
  Empty,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { publishApi } from '../api/client';

const { Title, Text } = Typography;

interface Task {
  taskId: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取任务列表
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
    
    // 自动刷新（每 30 秒）
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // 取消任务
  const handleCancel = async (taskId: string) => {
    try {
      await publishApi.cancelTask(taskId);
      message.success('任务已取消');
      fetchTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '取消任务失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Tag icon={<ClockCircleOutlined />} color="processing">
            待执行
          </Tag>
        );
      case 'completed':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            已完成
          </Tag>
        );
      case 'failed':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            失败
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag icon={<PauseCircleOutlined />} color="default">
            已取消
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: '任务 ID',
      dataIndex: 'taskId',
      key: 'taskId',
      ellipsis: true,
      width: 280,
    },
    {
      title: '计划时间',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
      sorter: (a: Task, b: Task) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: getStatusTag,
      filters: [
        { text: '待执行', value: 'pending' },
        { text: '已完成', value: 'completed' },
        { text: '失败', value: 'failed' },
        { text: '已取消', value: 'cancelled' },
      ],
      onFilter: (value: React.Key | boolean, record: Task) => record.status === value,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Task) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <Popconfirm
              title="确定要取消这个任务吗？"
              onConfirm={() => handleCancel(record.taskId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 统计各状态任务数量
  const stats = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
  };

  return (
    <div>
      <Title level={3}>任务管理</Title>
      <Text type="secondary">查看和管理定时发布任务</Text>

      <Card style={{ marginTop: 24, marginBottom: 24 }}>
        <Space size="large" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={stats.pending} showZero color="#1890ff" />
            <Text>待执行</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={stats.completed} showZero color="#52c41a" />
            <Text>已完成</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={stats.failed} showZero color="#f5222d" />
            <Text>失败</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={stats.cancelled} showZero color="#d9d9d9" />
            <Text>已取消</Text>
          </div>
        </Space>
      </Card>

      <Card
        title="任务列表"
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
        <Table
          columns={columns}
          dataSource={tasks}
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
                description="暂无定时任务"
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
