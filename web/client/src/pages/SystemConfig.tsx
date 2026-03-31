import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Divider,
  Typography,
  Descriptions,
  Tag,
  Skeleton,
  Space,
  Tabs,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  RobotOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import apiClient from '../api/client';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/** AI 配置接口 */
interface AIConfig {
  deepseek_api_key: string | null;
  deepseek_base_url: string | null;
  doubao_api_key: string | null;
  doubao_base_url: string | null;
  doubao_endpoint_id_image: string | null;
  doubao_endpoint_id_video: string | null;
  updated_at: string | null;
  has_deepseek_key: boolean;
  has_doubao_key: boolean;
}

/** 抖音配置接口 */
interface DouyinConfig {
  client_key: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  has_client_key: boolean;
  has_client_secret: boolean;
  has_tokens: boolean;
  updated_at: string | null;
}

const SystemConfig: React.FC = () => {
  const [aiForm] = Form.useForm();
  const [douyinForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [douyinConfig, setDouyinConfig] = useState<DouyinConfig | null>(null);

  // 获取配置
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/system/config');
      if (response.data.success) {
        setAIConfig(response.data.data.ai);
        setDouyinConfig(response.data.data.douyin);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('需要管理员权限');
      } else {
        message.error('获取配置失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 保存 AI 配置
  const handleSaveAIConfig = async (values: any) => {
    setSaving(true);
    try {
      // 过滤掉空值
      const filteredValues: Record<string, string> = {};
      Object.keys(values).forEach((key) => {
        if (values[key] !== undefined && values[key] !== '') {
          filteredValues[key] = values[key];
        }
      });

      const response = await apiClient.put('/system/config/ai', filteredValues);
      if (response.data.success) {
        message.success('AI 配置保存成功');
        setAIConfig(response.data.data);
        aiForm.resetFields();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 保存抖音配置
  const handleSaveDouyinConfig = async (values: any) => {
    setSaving(true);
    try {
      const filteredValues: Record<string, string> = {};
      Object.keys(values).forEach((key) => {
        if (values[key] !== undefined && values[key] !== '') {
          filteredValues[key] = values[key];
        }
      });

      const response = await apiClient.put('/system/config/douyin', filteredValues);
      if (response.data.success) {
        message.success('抖音配置保存成功');
        setDouyinConfig(response.data.data);
        douyinForm.resetFields();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重新加载配置
  const handleReloadConfig = async () => {
    try {
      await apiClient.post('/system/config/reload');
      message.success('配置已重新加载到运行时');
    } catch (error) {
      message.error('重新加载失败');
    }
  };

  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: 8 }} />
        系统配置
      </Title>
      <Text type="secondary">管理 AI 服务和抖音应用配置，配置后会自动保存到数据库</Text>

      <Divider />

      <Tabs defaultActiveKey="ai">
        <TabPane
          tab={
            <span>
              <RobotOutlined />
              AI 服务配置
            </span>
          }
          key="ai"
        >
          <Card title="当前配置状态" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="DeepSeek API Key">
                {aiConfig?.has_deepseek_key ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已配置 ({aiConfig.deepseek_api_key})
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    未配置
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="DeepSeek Base URL">
                <Text>{aiConfig?.deepseek_base_url || 'https://api.deepseek.com (默认)'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="豆包 API Key">
                {aiConfig?.has_doubao_key ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已配置 ({aiConfig.doubao_api_key})
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    未配置
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="豆包 Base URL">
                <Text>{aiConfig?.doubao_base_url || 'https://ark.cn-beijing.volces.com/api/v3 (默认)'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="豆包图片端点 ID">
                <Text>{aiConfig?.doubao_endpoint_id_image || '未配置'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="豆包视频端点 ID">
                <Text>{aiConfig?.doubao_endpoint_id_video || '未配置'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间" span={2}>
                <Text type="secondary">
                  {aiConfig?.updated_at ? new Date(aiConfig.updated_at).toLocaleString() : '从未更新'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="更新 AI 配置">
            <Alert
              message="配置说明"
              description="留空的字段将保持原有配置不变。API Key 等敏感信息会脱敏显示。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={aiForm} layout="vertical" onFinish={handleSaveAIConfig}>
              <Divider>DeepSeek 配置（文案生成）</Divider>
              <Form.Item name="deepseek_api_key" label="DeepSeek API Key">
                <Input.Password placeholder="输入新的 API Key（留空保持不变）" />
              </Form.Item>
              <Form.Item name="deepseek_base_url" label="DeepSeek Base URL">
                <Input placeholder="默认: https://api.deepseek.com" />
              </Form.Item>

              <Divider>豆包 AI 配置（图片/视频生成）</Divider>
              <Form.Item name="doubao_api_key" label="豆包 API Key">
                <Input.Password placeholder="火山引擎方舟 API Key（留空保持不变）" />
              </Form.Item>
              <Form.Item name="doubao_base_url" label="豆包 Base URL">
                <Input placeholder="默认: https://ark.cn-beijing.volces.com/api/v3" />
              </Form.Item>
              <Form.Item name="doubao_endpoint_id_image" label="图片生成端点 ID">
                <Input placeholder="如: ep-m-20260313233436-ln7hv" />
              </Form.Item>
              <Form.Item name="doubao_endpoint_id_video" label="视频生成端点 ID">
                <Input placeholder="如: ep-m-20260312192448-847sl" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                    保存 AI 配置
                  </Button>
                  <Button onClick={handleReloadConfig} icon={<ReloadOutlined />}>
                    重新加载到运行时
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <VideoCameraOutlined />
              抖音应用配置
            </span>
          }
          key="douyin"
        >
          <Card title="当前配置状态" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Client Key">
                {douyinConfig?.has_client_key ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已配置 ({douyinConfig.client_key})
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    未配置
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Client Secret">
                {douyinConfig?.has_client_secret ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已配置 ({douyinConfig.client_secret})
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    未配置
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Redirect URI">
                <Text>{douyinConfig?.redirect_uri || '未配置'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="授权状态">
                {douyinConfig?.has_tokens ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已授权
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="warning">
                    未授权
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间" span={2}>
                <Text type="secondary">
                  {douyinConfig?.updated_at ? new Date(douyinConfig.updated_at).toLocaleString() : '从未更新'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="更新抖音配置">
            <Alert
              message="配置说明"
              description="留空的字段将保持原有配置不变。授权相关操作请前往「抖音授权」页面。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={douyinForm} layout="vertical" onFinish={handleSaveDouyinConfig}>
              <Form.Item name="client_key" label="Client Key">
                <Input placeholder="抖音开放平台 Client Key（留空保持不变）" />
              </Form.Item>
              <Form.Item name="client_secret" label="Client Secret">
                <Input.Password placeholder="抖音开放平台 Client Secret（留空保持不变）" />
              </Form.Item>
              <Form.Item name="redirect_uri" label="Redirect URI">
                <Input placeholder="OAuth 回调地址，如 https://qianxunfabu.cn/" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                    保存抖音配置
                  </Button>
                  <Button onClick={handleReloadConfig} icon={<ReloadOutlined />}>
                    重新加载到运行时
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SystemConfig;
