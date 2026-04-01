import React, { useEffect, useState } from 'react';
import { Button, Typography, message, Spin, Divider } from 'antd';
import { 
  TikTokOutlined, 
  ExperimentOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { authApi, setStoredToken, setStoredUser } from '../api/client';
import AuthPageLayout from '../components/auth/AuthPageLayout';

const { Text } = Typography;

interface LoginProps {
  onDevModeEnter: () => void;
}

const Login: React.FC<LoginProps> = ({ onDevModeEnter }) => {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
    <AuthPageLayout
      title="欢迎回来"
      subtitle="使用抖音账号登录，开始创作之旅"
    >
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

export default Login;
