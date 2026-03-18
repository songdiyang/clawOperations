import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Alert,
  Steps,
  Tag,
  Spin,
  message,
  Radio,
  Collapse,
  Image,
  Descriptions,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { aiApi } from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 创作阶段定义
const CREATION_STEPS = [
  { title: '输入需求', description: '描述您想要创作的内容' },
  { title: '需求分析', description: 'AI 分析并理解您的需求' },
  { title: '内容生成', description: '生成图片或视频' },
  { title: '文案生成', description: '生成推广文案' },
  { title: '完成', description: '预览并发布' },
];

interface CreationResult {
  success: boolean;
  taskId?: string;
  analysis?: {
    contentType: 'image' | 'video';
    theme: string;
    style: string;
    targetAudience: string;
    keyPoints: string[];
  };
  content?: {
    type: 'image' | 'video';
    localPath: string;
    previewUrl?: string;
  };
  copywriting?: {
    title: string;
    description: string;
    hashtags: string[];
  };
  error?: string;
}

const AICreator: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<'process' | 'wait' | 'finish' | 'error'>('wait');
  const [result, setResult] = useState<CreationResult | null>(null);
  const [contentType, setContentType] = useState<'auto' | 'image' | 'video'>('auto');

  // 处理创作
  const handleCreate = async (values: { requirement: string }) => {
    if (!values.requirement?.trim()) {
      message.error('请输入创作需求');
      return;
    }

    setLoading(true);
    setResult(null);
    setStepStatus('process');

    try {
      // 步骤 1: 需求分析
      setCurrentStep(1);
      message.loading({ content: '正在分析需求...', key: 'creation' });

      const analyzeResponse = await aiApi.analyze(
        values.requirement,
        contentType === 'auto' ? undefined : contentType
      );

      if (!analyzeResponse.data.success) {
        throw new Error(analyzeResponse.data.error || '需求分析失败');
      }

      const analysis = analyzeResponse.data.data;
      message.loading({ content: '需求分析完成，正在生成内容...', key: 'creation' });

      // 步骤 2: 内容生成
      setCurrentStep(2);
      const generateResponse = await aiApi.generate(analysis);

      if (!generateResponse.data.success) {
        throw new Error(generateResponse.data.error || '内容生成失败');
      }

      const content = generateResponse.data.data;
      message.loading({ content: '内容生成完成，正在生成文案...', key: 'creation' });

      // 步骤 3: 文案生成
      setCurrentStep(3);
      const copywritingResponse = await aiApi.getCopywriting(analysis);

      if (!copywritingResponse.data.success) {
        throw new Error(copywritingResponse.data.error || '文案生成失败');
      }

      const copywriting = copywritingResponse.data.data;

      // 完成
      setCurrentStep(4);
      setStepStatus('finish');

      setResult({
        success: true,
        analysis,
        content,
        copywriting,
      });

      message.success({ content: 'AI 创作完成！', key: 'creation' });
    } catch (error: any) {
      console.error('AI 创作失败:', error);
      setStepStatus('error');
      setResult({
        success: false,
        error: error.message || 'AI 创作失败',
      });
      message.error({ content: error.message || 'AI 创作失败', key: 'creation' });
    } finally {
      setLoading(false);
    }
  };

  // 一键创作
  const handleQuickCreate = async () => {
    const requirement = form.getFieldValue('requirement');
    if (!requirement?.trim()) {
      message.error('请输入创作需求');
      return;
    }

    setLoading(true);
    setResult(null);
    setStepStatus('process');
    setCurrentStep(1);

    try {
      message.loading({ content: '正在进行 AI 创作...', key: 'creation' });

      const response = await aiApi.create(requirement, {
        contentTypePreference: contentType,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'AI 创作失败');
      }

      const data = response.data.data;
      setCurrentStep(4);
      setStepStatus('finish');

      setResult({
        success: true,
        taskId: data.taskId,
        analysis: data.analysis,
        content: data.content,
        copywriting: data.copywriting,
      });

      message.success({ content: 'AI 创作完成！', key: 'creation' });
    } catch (error: any) {
      console.error('AI 创作失败:', error);
      setStepStatus('error');
      setResult({
        success: false,
        error: error.message || 'AI 创作失败',
      });
      message.error({ content: error.message || 'AI 创作失败', key: 'creation' });
    } finally {
      setLoading(false);
    }
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setResult(null);
    setCurrentStep(0);
    setStepStatus('wait');
    setContentType('auto');
  };

  // 获取步骤状态
  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'finish';
    if (index === currentStep) return stepStatus;
    return 'wait';
  };

  return (
    <div style={{ width: '100%' }}>
      <Title level={3}>
        <RobotOutlined style={{ marginRight: 8 }} />
        AI 智能创作
      </Title>
      <Paragraph type="secondary">
        输入您的创作需求，AI 将自动分析需求、生成内容和推广文案，一键完成抖音视频创作
      </Paragraph>

      {/* 创作进度 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          items={CREATION_STEPS.map((step, index) => ({
            ...step,
            status: getStepStatus(index),
            icon: loading && index === currentStep ? <LoadingOutlined /> : undefined,
          }))}
        />
      </Card>

      <Row gutter={24}>
        {/* 左侧：输入区域 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <EditOutlined />
                创作需求
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form form={form} layout="vertical" onFinish={handleCreate}>
              <Form.Item
                name="requirement"
                rules={[{ required: true, message: '请输入创作需求' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="请描述您想要创作的内容，例如：&#10;&#10;• 制作一个关于小龙虾美食的短视频，突出麻辣鲜香的特点&#10;• 创作一张夏日清凉饮品的宣传图，风格时尚年轻&#10;• 拍摄一个户外露营的 Vlog 风格视频，展示大自然的美景"
                  disabled={loading}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Form.Item label="内容类型偏好">
                <Radio.Group
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  disabled={loading}
                >
                  <Radio.Button value="auto">
                    <ThunderboltOutlined /> 自动选择
                  </Radio.Button>
                  <Radio.Button value="image">
                    <PictureOutlined /> 图片
                  </Radio.Button>
                  <Radio.Button value="video">
                    <VideoCameraOutlined /> 视频
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    icon={<RobotOutlined />}
                    onClick={handleQuickCreate}
                    loading={loading}
                  >
                    一键创作
                  </Button>
                  <Button
                    size="large"
                    htmlType="submit"
                    icon={<ThunderboltOutlined />}
                    loading={loading}
                  >
                    分步创作
                  </Button>
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    disabled={loading}
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            <Divider />

            <Collapse
              items={[
                {
                  key: 'tips',
                  label: '创作技巧',
                  children: (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>描述越详细，生成效果越好</li>
                      <li>可以指定风格、色调、目标受众等</li>
                      <li>包含产品卖点和核心信息</li>
                      <li>视频适合动态展示，图片适合静态宣传</li>
                    </ul>
                  ),
                },
              ]}
              ghost
            />
          </Card>

          {/* 需求分析结果 */}
          {result?.analysis && (
            <Card 
              title={
                <Space>
                  <FileTextOutlined />
                  需求分析结果
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="内容类型">
                  <Tag color={result.analysis.contentType === 'video' ? 'blue' : 'green'}>
                    {result.analysis.contentType === 'video' ? '视频' : '图片'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="主题">
                  {result.analysis.theme}
                </Descriptions.Item>
                <Descriptions.Item label="风格">
                  {result.analysis.style}
                </Descriptions.Item>
                <Descriptions.Item label="目标受众">
                  {result.analysis.targetAudience}
                </Descriptions.Item>
                <Descriptions.Item label="关键卖点" span={2}>
                  <Space wrap>
                    {result.analysis.keyPoints?.map((point, index) => (
                      <Tag key={index}>{point}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Col>

        {/* 右侧：结果预览 */}
        <Col xs={24} lg={10}>
          <div style={{ position: 'sticky', top: 88 }}>
            {/* 加载状态 */}
            {loading && (
              <Card style={{ marginBottom: 24, textAlign: 'center' }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
                  AI 正在努力创作中，请稍候...
                </Paragraph>
              </Card>
            )}

            {/* 错误提示 */}
            {result && !result.success && (
              <Alert
                message="创作失败"
                description={result.error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {/* 生成的内容预览 */}
            {result?.content && (
              <Card 
                title={
                  <Space>
                    {result.content.type === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                    生成的{result.content.type === 'video' ? '视频' : '图片'}
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                {result.content.type === 'image' && result.content.previewUrl && (
                  <Image
                    src={result.content.previewUrl}
                    alt="生成的图片"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                )}
                {result.content.type === 'video' && (
                  <div style={{ 
                    background: '#f5f5f5', 
                    borderRadius: 8, 
                    padding: 24, 
                    textAlign: 'center' 
                  }}>
                    <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
                      视频已生成
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {result.content.localPath}
                    </Text>
                  </div>
                )}
              </Card>
            )}

            {/* 生成的文案 */}
            {result?.copywriting && (
              <Card 
                title={
                  <Space>
                    <FileTextOutlined />
                    生成的文案
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="标题">
                    <Text strong copyable>{result.copywriting.title}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="描述">
                    <Paragraph 
                      copyable 
                      style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                    >
                      {result.copywriting.description}
                    </Paragraph>
                  </Descriptions.Item>
                  <Descriptions.Item label="话题标签">
                    <Space wrap>
                      {result.copywriting.hashtags?.map((tag, index) => (
                        <Tag key={index} color="blue">#{tag}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* 操作按钮 */}
            {result?.success && (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    block
                    onClick={() => message.info('即将跳转到发布页面...')}
                  >
                    发布到抖音
                  </Button>
                  <Button
                    size="large"
                    icon={<ClockCircleOutlined />}
                    block
                    onClick={() => message.info('即将设置定时发布...')}
                  >
                    定时发布
                  </Button>
                </Space>
              </Card>
            )}

            {/* 初始提示 */}
            {!loading && !result && (
              <Card style={{ textAlign: 'center' }}>
                <RobotOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
                  输入创作需求后，AI 将为您生成内容
                </Paragraph>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AICreator;
