import React, { useState, useEffect } from 'react';
import { Button, Typography, message, Spin, Divider, Row, Col, Form, Input, Checkbox } from 'antd';
import { 
  TikTokOutlined, 
  ExperimentOutlined,
  RobotOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { authApi, setStoredToken, setStoredUser } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph, Link } = Typography;

interface LoginProps {
  onDevModeEnter: () => void;
}

// 产品特性列表
const features = [
  {
    icon: <RobotOutlined style={{ fontSize: 28 }} />,
    title: 'AI 智能创作',
    description: '输入需求，自动生成视频内容和推广文案',
  },
  {
    icon: <VideoCameraOutlined style={{ fontSize: 28 }} />,
    title: '一键发布抖音',
    description: '视频直接发布到抖音平台，省时省力',
  },
  {
    icon: <ClockCircleOutlined style={{ fontSize: 28 }} />,
    title: '定时发布管理',
    description: '设定发布时间，自动执行任务',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 28 }} />,
    title: '高效批量处理',
    description: '批量生成和发布，提升运营效率',
  },
];

const Login: React.FC<LoginProps> = ({ onDevModeEnter }) => {
  const { login } = useAuth();
  const [adminForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginMode, setLoginMode] = useState<'douyin' | 'admin'>('douyin');

  // 检查 URL 中是否有授权回调的 code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleDouyinCallback(code);
    } else {
      setCheckingAuth(false);
    }
  }, []);

  // 处理抽音授权回调
  const handleDouyinCallback = async (code: string) => {
    setLoading(true);
    try {
      const response = await authApi.douyinLoginCallback(code);
        
      if (response.data?.success && response.data?.data) {
        // 使用正确的存储函数，确保 token key 一致
        setStoredToken(response.data.data.token);
        if (response.data.data.user) {
          setStoredUser(response.data.data.user);
        }
        message.success('登录成功！');
        // 清除 URL 中的 code 参数
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      } else {
        message.error(response.data?.error || '登录失败，请重试');
      }
    } catch (error: any) {
      console.error('Douyin callback error:', error);
      message.error(error.message || '授权处理失败');
    } finally {
      setLoading(false);
      setCheckingAuth(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // 点击抖音登录按钮
  const handleDouyinLogin = async () => {
    setLoading(true);
    try {
      const response = await authApi.getDouyinLoginUrl();
      
      if (response.data?.success && response.data?.data?.url) {
        window.location.href = response.data.data.url;
      } else {
        message.error(response.data?.error || '获取授权地址失败');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Get auth URL error:', error);
      message.error(error.message || '获取授权地址失败，请稍后重试');
      setLoading(false);
    }
  };

  // 点击管理员登录
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

  // 检查授权回调中显示加载状态
  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Spin size="large" tip="正在处理授权..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* 左侧品牌展示区 */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 50%, #91caff 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景装饰 */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />

        {/* 内容区 */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <RobotOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>

          <Title level={1} style={{ color: '#fff', marginBottom: 16, fontSize: 36 }}>
            ClawOperations
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginBottom: 48 }}>
            智能视频创作与发布平台
          </Paragraph>

          {/* 特性列表 */}
          <Row gutter={[24, 24]}>
            {features.map((feature, index) => (
              <Col span={12} key={index}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: '24px 16px',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'left',
                    height: '100%',
                  }}
                >
                  <div style={{ color: '#fff', marginBottom: 12 }}>
                    {feature.icon}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4, fontSize: 15 }}>
                    {feature.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>
                    {feature.description}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div
        style={{
          width: 480,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* 欢迎文字 */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8, color: '#1f2937' }}>
              欢迎回来
            </Title>
            <Text type="secondary" style={{ fontSize: 15 }}>
              {loginMode === 'douyin' ? '使用抖音账号登录，开始创作之旅' : '使用管理员账号登录，进入系统管理'}
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 4,
              borderRadius: 12,
              background: '#f5f7fa',
              marginBottom: 20,
            }}
          >
            <Button
              type={loginMode === 'douyin' ? 'primary' : 'text'}
              block
              onClick={() => setLoginMode('douyin')}
              style={{
                height: 40,
                borderRadius: 10,
                background: loginMode === 'douyin' ? '#000' : 'transparent',
                borderColor: loginMode === 'douyin' ? '#000' : 'transparent',
                color: loginMode === 'douyin' ? '#fff' : '#6b7280',
                boxShadow: 'none',
              }}
              icon={<TikTokOutlined />}
            >
              抖音登录
            </Button>
            <Button
              type={loginMode === 'admin' ? 'primary' : 'text'}
              block
              onClick={() => setLoginMode('admin')}
              style={{
                height: 40,
                borderRadius: 10,
                background: loginMode === 'admin' ? '#1677ff' : 'transparent',
                borderColor: loginMode === 'admin' ? '#1677ff' : 'transparent',
                color: loginMode === 'admin' ? '#fff' : '#6b7280',
                boxShadow: 'none',
              }}
              icon={<UserOutlined />}
            >
              管理员登录
            </Button>
          </div>

          {loginMode === 'douyin' ? (
            <>
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleDouyinLogin}
                style={{
                  height: 52,
                  fontSize: 16,
                  fontWeight: 500,
                  borderRadius: 10,
                  background: '#000',
                  borderColor: '#000',
                }}
                icon={<TikTokOutlined />}
              >
                {loading ? '正在跳转...' : '使用抖音账号登录'}
              </Button>

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
                    安全登录
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                    我们使用抖音官方授权，不会获取您的密码。
                    登录后可管理您的视频发布权限。
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
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

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  管理员可使用平台账号登录，进入系统配置与后台管理。
                </Text>
              </div>
            </>
          )}

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {loginMode === 'douyin' ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                需要后台管理入口？ <Link onClick={() => setLoginMode('admin')}>切换到管理员登录</Link>
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>
                需要抖音授权发布？ <Link onClick={() => setLoginMode('douyin')}>切换到抖音登录</Link>
              </Text>
            )}
          </div>

          {/* 分隔线 + 开发模式入口（仅开发环境显示） */}
          {import.meta.env.DEV && (
            <>
              <Divider style={{ margin: '32px 0' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>开发调试</Text>
              </Divider>

              {/* 开发模式入口 */}
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
        </div>

        {/* 底部版权 */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          &copy; 2024 ClawOperations. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
