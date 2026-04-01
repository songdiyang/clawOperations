import React, { useState } from 'react';
import { Button, Typography, message, Form, Input, Checkbox, Divider } from 'antd';
import {
  ExperimentOutlined,
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import AuthPageLayout from '../components/auth/AuthPageLayout';

const { Text } = Typography;

interface AdminLoginProps {
  onDevModeEnter: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onDevModeEnter }) => {
  const { login } = useAuth();
  const [adminForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (values: {
    account: string;
    password: string;
    remember?: boolean;
  }) => {
    setLoading(true);
    try {
      await login(values.account, values.password, values.remember);
      message.success('管理员登录成功！');
    } catch (error: any) {
      message.error(error.response?.data?.error || error.message || '管理员登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="管理员登录"
      subtitle="使用平台管理员账号登录，进入系统管理后台"
    >
      <Form
        form={adminForm}
        layout="vertical"
        onFinish={handleAdminLogin}
        autoComplete="off"
      >
        <Form.Item
          name="account"
          rules={[{ required: true, message: '请输入管理员账号' }]}
          style={{ marginBottom: 16 }}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="用户名或邮箱"
            allowClear
            style={{ height: 48, borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
          style={{ marginBottom: 12 }}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="管理员密码"
            style={{ height: 48, borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 20 }}>
          <Checkbox>保持登录状态</Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{
              height: 52,
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 10,
            }}
            icon={<UserOutlined />}
          >
            {loading ? '正在登录...' : '进入管理员后台'}
          </Button>
        </Form.Item>
      </Form>

      <div
        style={{
          marginTop: 24,
          padding: '16px',
          background: '#f5f7fa',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <SafetyOutlined style={{ color: '#52c41a', fontSize: 18, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>
            后台管理入口
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            仅平台管理员可使用该页面登录。登录后可管理系统配置、任务与后台功能。
          </div>
        </div>
      </div>

      {import.meta.env.DEV && (
        <>
          <Divider style={{ margin: '32px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>开发调试</Text>
          </Divider>

          <Button
            type="default"
            size="large"
            block
            onClick={onDevModeEnter}
            style={{
              height: 48,
              borderRadius: 10,
              color: '#6b7280',
              borderColor: '#e5e7eb',
            }}
            icon={<ExperimentOutlined />}
          >
            跳过登录（开发模式）
          </Button>

          <Text
            type="secondary"
            style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}
          >
            开发模式仅供调试，部分功能受限
          </Text>
        </>
      )}
    </AuthPageLayout>
  );
};

export default AdminLogin;
