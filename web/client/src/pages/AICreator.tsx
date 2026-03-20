import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Steps,
  Tag,
  Spin,
  message,
  Radio,
  Image,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { aiApi } from '../api/client';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 快捷模板
const QUICK_TEMPLATES = [
  { label: '美食推广', value: '制作一个美食推广视频，突出产品特色和口感' },
  { label: '产品展示', value: '创作一个产品展示视频，展示产品功能和使用场景' },
  { label: '活动宣传', value: '制作一个活动宣传视频，突出活动亮点和优惠信息' },
  { label: '品牌故事', value: '创作一个品牌故事视频，展示品牌理念和发展历程' },
];

// 创作阶段定义
const CREATION_STEPS = [
  { title: '输入需求', icon: <BulbOutlined /> },
  { title: '智能分析', icon: <RobotOutlined /> },
  { title: '内容生成', icon: <VideoCameraOutlined /> },
  { title: '文案生成', icon: <FileTextOutlined /> },
  { title: '完成', icon: <CheckOutlined /> },
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    message.success('已复制');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreate = async (values: { requirement: string }) => {
    if (!values.requirement?.trim()) {
      message.error('请输入创作需求');
      return;
    }

    setLoading(true);
    setResult(null);
    setStepStatus('process');

    try {
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
      message.loading({ content: '正在生成内容...', key: 'creation' });

      setCurrentStep(2);
      const generateResponse = await aiApi.generate(analysis);

      if (!generateResponse.data.success) {
        throw new Error(generateResponse.data.error || '内容生成失败');
      }

      const content = generateResponse.data.data;
      message.loading({ content: '正在生成文案...', key: 'creation' });

      setCurrentStep(3);
      const copywritingResponse = await aiApi.getCopywriting(analysis);

      if (!copywritingResponse.data.success) {
        throw new Error(copywritingResponse.data.error || '文案生成失败');
      }

      const copywriting = copywritingResponse.data.data;

      setCurrentStep(4);
      setStepStatus('finish');

      setResult({ success: true, analysis, content, copywriting });
      message.success({ content: 'AI 创作完成！', key: 'creation' });
    } catch (error: any) {
      setStepStatus('error');
      setResult({ success: false, error: error.message || 'AI 创作失败' });
      message.error({ content: error.message || 'AI 创作失败', key: 'creation' });
    } finally {
      setLoading(false);
    }
  };

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

      const response = await aiApi.create(requirement, { contentTypePreference: contentType });

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
      setStepStatus('error');
      setResult({ success: false, error: error.message || 'AI 创作失败' });
      message.error({ content: error.message || 'AI 创作失败', key: 'creation' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setResult(null);
    setCurrentStep(0);
    setStepStatus('wait');
    setContentType('auto');
  };

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'finish';
    if (index === currentStep) return stepStatus;
    return 'wait';
  };

  return (
    <div>
      {/* 步骤条 */}
      <div
        style={{
          background: '#fafafa',
          borderRadius: 12,
          padding: '24px 32px',
          marginBottom: 24,
        }}
      >
        <Steps
          current={currentStep}
          items={CREATION_STEPS.map((step, index) => ({
            title: step.title,
            status: getStepStatus(index),
            icon: loading && index === currentStep ? <LoadingOutlined /> : step.icon,
          }))}
        />
      </div>

      <Row gutter={24}>
        {/* 左侧：输入区域 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: '#1677ff' }} />
                <span>创作需求</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form form={form} layout="vertical" onFinish={handleCreate}>
              {/* 快捷模板 */}
              <Form.Item label="快捷模板" style={{ marginBottom: 16 }}>
                <Space wrap size={8}>
                  {QUICK_TEMPLATES.map((template, index) => (
                    <Tag
                      key={index}
                      style={{
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                      }}
                      onClick={() => form.setFieldValue('requirement', template.value)}
                    >
                      {template.label}
                    </Tag>
                  ))}
                </Space>
              </Form.Item>

              <Form.Item
                name="requirement"
                label="需求描述"
                rules={[{ required: true, message: '请输入创作需求' }]}
              >
                <TextArea
                  rows={5}
                  placeholder="请描述您想要创作的内容，例如：&#10;&#10;• 制作一个关于小龙虾美食的短视频，突出麻辣鲜香的特点&#10;• 创作一张夏日清凉饮品的宣传图，风格时尚年轻"
                  disabled={loading}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Form.Item label="内容类型" style={{ marginBottom: 24 }}>
                <Radio.Group
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  disabled={loading}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="auto">
                    <ThunderboltOutlined /> 自动
                  </Radio.Button>
                  <Radio.Button value="image">
                    <PictureOutlined /> 图片
                  </Radio.Button>
                  <Radio.Button value="video">
                    <VideoCameraOutlined /> 视频
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Space size={12}>
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
            </Form>
          </Card>

          {/* 需求分析结果 */}
          {result?.analysis && (
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#1677ff' }} />
                  <span>需求分析</span>
                </Space>
              }
            >
              <Row gutter={[24, 16]}>
                <Col xs={12} sm={6}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>内容类型</div>
                  <Tag color={result.analysis.contentType === 'video' ? 'blue' : 'green'}>
                    {result.analysis.contentType === 'video' ? '视频' : '图片'}
                  </Tag>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>风格</div>
                  <Text>{result.analysis.style}</Text>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>主题</div>
                  <Text>{result.analysis.theme}</Text>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>目标受众</div>
                  <Text>{result.analysis.targetAudience}</Text>
                </Col>
                <Col span={24}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>关键卖点</div>
                  <Space wrap>
                    {result.analysis.keyPoints?.map((point, index) => (
                      <Tag key={index}>{point}</Tag>
                    ))}
                  </Space>
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* 右侧：预览区域 */}
        <Col xs={24} lg={10}>
          <div style={{ position: 'sticky', top: 88 }}>
            {/* 加载状态 */}
            {loading && (
              <Card style={{ marginBottom: 24, textAlign: 'center', padding: '48px 24px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 24, color: '#1f2937', fontWeight: 500 }}>
                  AI 正在创作中
                </div>
                <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                  预计需要 30-60 秒，请耐心等待
                </div>
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

            {/* 生成的内容 */}
            {result?.content && (
              <Card
                title={
                  <Space>
                    {result.content.type === 'video' ? (
                      <VideoCameraOutlined style={{ color: '#1677ff' }} />
                    ) : (
                      <PictureOutlined style={{ color: '#1677ff' }} />
                    )}
                    <span>生成的{result.content.type === 'video' ? '视频' : '图片'}</span>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                {result.content.type === 'image' && result.content.previewUrl ? (
                  <Image
                    src={result.content.previewUrl}
                    alt="生成的图片"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                ) : (
                  <div
                    style={{
                      background: '#fafafa',
                      borderRadius: 8,
                      padding: 32,
                      textAlign: 'center',
                      border: '1px dashed #e5e7eb',
                    }}
                  >
                    <VideoCameraOutlined style={{ fontSize: 40, color: '#9ca3af' }} />
                    <div style={{ marginTop: 12, color: '#1f2937', fontWeight: 500 }}>
                      视频已生成
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      {result.content.localPath}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* 生成的文案 */}
            {result?.copywriting && (
              <Card
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    <span>生成的文案</span>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>标题</Text>
                    <Tooltip title="复制">
                      <Button
                        type="text"
                        size="small"
                        icon={copiedField === 'title' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                        onClick={() => copyToClipboard(result.copywriting!.title, 'title')}
                      />
                    </Tooltip>
                  </div>
                  <Text strong>{result.copywriting.title}</Text>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>描述</Text>
                    <Tooltip title="复制">
                      <Button
                        type="text"
                        size="small"
                        icon={copiedField === 'desc' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                        onClick={() => copyToClipboard(result.copywriting!.description, 'desc')}
                      />
                    </Tooltip>
                  </div>
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {result.copywriting.description}
                  </Paragraph>
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    话题标签
                  </Text>
                  <Space wrap>
                    {result.copywriting.hashtags?.map((tag, index) => (
                      <Tag key={index} color="blue">#{tag}</Tag>
                    ))}
                  </Space>
                </div>
              </Card>
            )}

            {/* 操作按钮 */}
            {result?.success && (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
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
              <Card>
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      background: '#fafafa',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <RobotOutlined style={{ fontSize: 28, color: '#9ca3af' }} />
                  </div>
                  <div style={{ color: '#1f2937', fontWeight: 500, marginBottom: 4 }}>
                    等待创作
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    输入需求后，AI 将为您生成内容和文案
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AICreator;
