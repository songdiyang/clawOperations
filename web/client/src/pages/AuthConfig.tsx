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
  Skeleton,
  Tooltip,
  Steps,
  Row,
  Col,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  LinkOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { authApi } from '../api/client';

const { Title, Text, Paragraph } = Typography;

interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresAt: number;
}

interface AuthStatus {
  initialized: boolean;
  hasValidToken: boolean;
  tokenInfo: TokenInfo | null;
}

const AuthConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [authCodeForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authUrlLoading, setAuthUrlLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 获取当前状态
  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await authApi.getStatus();
      setStatus(response.data.data);
    } catch (error) {
      console.error('获取状态失败:', error);
      message.error('获取认证状态失败，请检查后端服务是否正常运行');
    } finally {
      setStatusLoading(false);
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
      await fetchStatus();
      setCurrentStep(1);
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败，请检查配置信息');
    } finally {
      setLoading(false);
    }
  };

  // 获取授权 URL
  const handleGetAuthUrl = async () => {
    if (!status?.initialized) {
      message.warning('请先保存应用配置');
      return;
    }
    
    setAuthUrlLoading(true);
    try {
      const response = await authApi.getAuthUrl();
      const url = response.data.data.url;
      setAuthUrl(url);
      setCurrentStep(2);
      window.open(url, '_blank');
      message.info('已在新窗口打开授权页面');
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取授权链接失败，请确保已正确配置应用信息');
    } finally {
      setAuthUrlLoading(false);
    }
  };

  // 处理授权回调
  const handleAuthCallback = async (values: { authCode: string }) => {
    if (!values.authCode?.trim()) {
      message.error('请输入授权码');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.handleCallback(values.authCode.trim());
      message.success('授权成功！Token 已获取');
      form.setFieldsValue({
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
        openId: response.data.data.openId,
      });
      authCodeForm.resetFields();
      setAuthUrl('');
      setCurrentStep(3);
      await fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.error || '授权失败，请检查授权码是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 刷新 Token
  const handleRefreshToken = async () => {
    if (!status?.hasValidToken) {
      message.warning('当前没有有效的 Token，请先完成授权');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.refreshToken();
      message.success('Token 刷新成功');
      form.setFieldsValue({
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
      });
      await fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.error || '刷新失败，Token 可能已过期，请重新授权');
    } finally {
      setLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label}已复制到剪贴板`);
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 格式化过期时间
  const formatExpiresAt = (timestamp: number) => {
    const now = Date.now();
    const expiresAt = new Date(timestamp);
    const diff = timestamp - now;
    
    if (diff < 0) {
      return <Text type="danger">已过期</Text>;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return (
      <Space>
        <Text>{expiresAt.toLocaleString()}</Text>
        <Tag color={hours < 1 ? 'red' : hours < 24 ? 'orange' : 'green'}>
          剩余 {hours > 0 ? `${hours}小时` : ''}{minutes}分钟
        </Tag>
      </Space>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <Title level={3}>
        <SafetyOutlined style={{ marginRight: 8 }} />
        认证配置
      </Title>
      <Paragraph type="secondary">
        配置抖音开放平台的认证信息，完成 OAuth 授权后即可调用抖音 API 发布视频
      </Paragraph>

      {/* 授权流程步骤 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          items={[
            { title: '配置应用', description: '填写 Client Key 等信息' },
            { title: '获取授权', description: '获取 OAuth 授权链接' },
            { title: '输入授权码', description: '完成用户授权' },
            { title: '完成', description: '开始使用' },
          ]}
        />
      </Card>

      <Row gutter={24}>
        {/* 左侧：状态和配置 */}
        <Col xs={24} lg={14} xxl={16}>
          {/* 状态显示 */}
          <Card 
            title="当前状态" 
            style={{ marginBottom: 24 }}
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchStatus}
                loading={statusLoading}
                size="small"
              >
                刷新
              </Button>
            }
          >
            {statusLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : status ? (
              <Descriptions 
                bordered 
                column={{ xs: 1, sm: 2, md: 2 }}
                size="small"
              >
                <Descriptions.Item label="初始化状态">
                  {status.initialized ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">已初始化</Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="error">未初始化</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Token 状态">
                  {status.hasValidToken ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">有效</Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="warning">无效或过期</Tag>
                  )}
                </Descriptions.Item>
                {status.tokenInfo && (
                  <>
                    <Descriptions.Item label="OpenID">
                      <Space>
                        <Text code style={{ fontSize: 12 }}>
                          {status.tokenInfo.openId.substring(0, 20)}...
                        </Text>
                        <Tooltip title="复制完整 OpenID">
                          <Button 
                            type="link" 
                            size="small" 
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(status.tokenInfo!.openId, 'OpenID')}
                          />
                        </Tooltip>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Token 过期时间">
                      {formatExpiresAt(status.tokenInfo.expiresAt)}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            ) : (
              <Alert message="无法获取状态信息" type="error" />
            )}
          </Card>

          {/* 配置表单 */}
          <Card title="应用配置" style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveConfig}
              autoComplete="off"
              requiredMark="optional"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Client Key"
                    name="clientKey"
                    rules={[
                      { required: true, message: '请输入 Client Key' },
                      { min: 10, message: 'Client Key 长度不正确' },
                    ]}
                    tooltip="从抖音开放平台控制台获取"
                  >
                    <Input placeholder="从抖音开放平台获取" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Client Secret"
                    name="clientSecret"
                    rules={[
                      { required: true, message: '请输入 Client Secret' },
                      { min: 10, message: 'Client Secret 长度不正确' },
                    ]}
                    tooltip="应用密钥，请妥善保管"
                  >
                    <Input.Password placeholder="从抖音开放平台获取" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Redirect URI"
                name="redirectUri"
                rules={[
                  { required: true, message: '请输入 Redirect URI' },
                  { 
                    pattern: /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+(?:[\/\w.-]*)*\/?$/,
                    message: '请输入有效的 URL 地址' 
                  },
                ]}
                tooltip="OAuth 回调地址，需在抖音开放平台配置"
              >
                <Input placeholder="https://your-domain.com" />
              </Form.Item>

              <Divider>Token 配置（可选）</Divider>
              
              <Alert
                message="如果已有 Token，可直接填写下方字段；否则请通过右侧 OAuth 流程获取"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item label="Access Token" name="accessToken">
                <Input.TextArea 
                  rows={2} 
                  placeholder="可选 - 已有的 Access Token" 
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Refresh Token" name="refreshToken">
                    <Input.TextArea 
                      rows={2} 
                      placeholder="可选" 
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Open ID" name="openId">
                    <Input placeholder="可选" style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存配置
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 右侧：OAuth 授权 */}
        <Col xs={24} lg={10} xxl={8}>
          <Card title="OAuth 授权" style={{ marginBottom: 24, position: 'sticky', top: 88 }}>
            <Alert
              message="授权流程说明"
              description={
                <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>确保已保存应用配置</li>
                  <li>点击"获取授权链接"按钮</li>
                  <li>在抖音页面中登录并授权</li>
                  <li>复制回调 URL 中的 <Text code>code</Text> 参数</li>
                  <li>粘贴到下方，点击"完成授权"</li>
                </ol>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<LinkOutlined />}
                onClick={handleGetAuthUrl}
                loading={authUrlLoading}
                disabled={!status?.initialized}
                block
              >
                获取授权链接
              </Button>

              {!status?.initialized && (
                <Text type="warning">请先保存左侧应用配置</Text>
              )}

              {authUrl && (
                <Alert
                  message="授权链接已生成"
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text 
                        copyable={{ tooltips: ['复制链接', '已复制'] }}
                        style={{ wordBreak: 'break-all', fontSize: 12, fontFamily: 'monospace' }}
                      >
                        {authUrl}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        如未自动打开，请手动复制链接到浏览器
                      </Text>
                    </Space>
                  }
                  type="success"
                  showIcon
                />
              )}

              <Divider style={{ margin: '16px 0' }} />

              <Form 
                form={authCodeForm}
                layout="vertical" 
                onFinish={handleAuthCallback}
              >
                <Form.Item 
                  label="授权码 (Code)" 
                  name="authCode"
                  rules={[{ required: true, message: '请输入授权码' }]}
                  extra="从回调 URL 的 code 参数获取"
                >
                  <Input
                    placeholder="粘贴 code 参数值"
                    style={{ fontFamily: 'monospace' }}
                    allowClear
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%' }} direction="vertical">
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      loading={loading}
                      disabled={!status?.initialized}
                      block
                    >
                      完成授权
                    </Button>
                    <Tooltip title={!status?.hasValidToken ? '当前没有有效的 Token' : ''}>
                      <Button 
                        icon={<ReloadOutlined />}
                        onClick={handleRefreshToken} 
                        loading={loading}
                        disabled={!status?.hasValidToken}
                        block
                      >
                        刷新 Token
                      </Button>
                    </Tooltip>
                  </Space>
                </Form.Item>
              </Form>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AuthConfig;
