import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Divider,
  Typography,
  message,
  Descriptions,
  Tag,
} from 'antd';
import { authApi } from '../api/client';

const { Title, Text } = Typography;

const AuthConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    initialized: boolean;
    hasValidToken: boolean;
    tokenInfo: {
      accessToken: string;
      refreshToken: string;
      openId: string;
      expiresAt: number;
    } | null;
  } | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');

  // 获取当前状态
  const fetchStatus = async () => {
    try {
      const response = await authApi.getStatus();
      setStatus(response.data.data);
    } catch (error) {
      console.error('获取状态失败:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // 保存配置
  const handleSaveConfig = async (values: any) => {
    setLoading(true);
    try {
      await authApi.setConfig(values);
      message.success('配置已保存');
      fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取授权 URL
  const handleGetAuthUrl = async () => {
    try {
      const response = await authApi.getAuthUrl();
      const url = response.data.data.url;
      setAuthUrl(url);
      // 打开授权页面
      window.open(url, '_blank');
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取授权链接失败');
    }
  };

  // 处理授权回调
  const handleAuthCallback = async () => {
    const code = form.getFieldValue('authCode');
    if (!code) {
      message.error('请输入授权码');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.handleCallback(code);
      message.success('授权成功');
      form.setFieldsValue({
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
        openId: response.data.data.openId,
      });
      fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.error || '授权失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新 Token
  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const response = await authApi.refreshToken();
      message.success('Token 刷新成功');
      form.setFieldsValue({
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
      });
      fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.error || '刷新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>认证配置</Title>
      <Text type="secondary">
        配置抖音开放平台的认证信息，用于调用抖音 API
      </Text>

      <Divider />

      {/* 状态显示 */}
      {status && (
        <Card style={{ marginBottom: 24 }}>
          <Descriptions title="当前状态" bordered>
            <Descriptions.Item label="初始化状态">
              {status.initialized ? (
                <Tag color="success">已初始化</Tag>
              ) : (
                <Tag color="error">未初始化</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Token 状态">
              {status.hasValidToken ? (
                <Tag color="success">有效</Tag>
              ) : (
                <Tag color="warning">无效或过期</Tag>
              )}
            </Descriptions.Item>
            {status.tokenInfo && (
              <>
                <Descriptions.Item label="OpenID">
                  {status.tokenInfo.openId}
                </Descriptions.Item>
                <Descriptions.Item label="Token 过期时间">
                  {new Date(status.tokenInfo.expiresAt).toLocaleString()}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 配置表单 */}
      <Card title="应用配置" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
          autoComplete="off"
        >
          <Form.Item
            label="Client Key"
            name="clientKey"
            rules={[{ required: true, message: '请输入 Client Key' }]}
          >
            <Input placeholder="从抖音开放平台获取" />
          </Form.Item>

          <Form.Item
            label="Client Secret"
            name="clientSecret"
            rules={[{ required: true, message: '请输入 Client Secret' }]}
          >
            <Input.Password placeholder="从抖音开放平台获取" />
          </Form.Item>

          <Form.Item
            label="Redirect URI"
            name="redirectUri"
            rules={[{ required: true, message: '请输入 Redirect URI' }]}
          >
            <Input placeholder="https://your-domain.com/callback" />
          </Form.Item>

          <Divider />

          <Title level={5}>Token 配置（可选）</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            如果已有 Token，可直接填写，否则通过下方 OAuth 流程获取
          </Text>

          <Form.Item label="Access Token" name="accessToken">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>

          <Form.Item label="Refresh Token" name="refreshToken">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>

          <Form.Item label="Open ID" name="openId">
            <Input placeholder="可选" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* OAuth 授权 */}
      <Card title="OAuth 授权">
        <Space direction="vertical" size="middle" style={{ width: '100%', display: 'flex' }}>
          <Alert
            message="授权流程"
            description={
              <ol>
                <li>点击"获取授权链接"按钮</li>
                <li>在打开的页面中登录抖音并授权</li>
                <li>授权成功后，复制回调 URL 中的 code 参数</li>
                <li>将 code 粘贴到下方输入框，点击"完成授权"</li>
              </ol>
            }
            type="info"
            showIcon
          />

          <Button type="primary" onClick={handleGetAuthUrl}>
            获取授权链接
          </Button>

          {authUrl && (
            <Alert
              message="授权链接已生成"
              description={
                <Text copyable style={{ wordBreak: 'break-all' }}>
                  {authUrl}
                </Text>
              }
              type="success"
            />
          )}

          <Divider />

          <Form layout="vertical">
            <Form.Item label="授权码 (Code)">
              <Input
                placeholder="粘贴从回调 URL 获取的 code"
                onChange={(e) => form.setFieldsValue({ authCode: e.target.value })}
              />
            </Form.Item>

            <Space>
              <Button type="primary" onClick={handleAuthCallback} loading={loading}>
                完成授权
              </Button>
              <Button onClick={handleRefreshToken} loading={loading}>
                刷新 Token
              </Button>
            </Space>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default AuthConfig;
