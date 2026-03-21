/**
 * AI 创作页面
 * 整合完整的端到端创作流程
 */

import React, { useState, useCallback } from 'react';
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
  Tag,
  Spin,
  message,
  Radio,
  Image,
  Tooltip,
  Divider,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  CopyOutlined,
  CheckOutlined,
  SaveOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  WorkflowSteps,
  DraftManager,
  HistoryDrawer,
  TemplateSelector,
  NextActionGuide,
  QualityCheckResult,
} from '../components/ai-creator';
import { useCreationWorkflow } from '../hooks/useCreationWorkflow';
import { aiApi } from '../api/client';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 快捷模板 - 根据内容类型动态生成
const getQuickTemplates = (type: 'auto' | 'image' | 'video') => {
  const contentWord = type === 'image' ? '图片' : (type === 'video' ? '视频' : '内容');
  return [
    { label: '美食推广', value: `制作一个美食推广${contentWord}，突出产品特色和口感` },
    { label: '产品展示', value: `创作一个产品展示${contentWord}，展示产品功能和使用场景` },
    { label: '活动宣传', value: `制作一个活动宣传${contentWord}，突出活动亮点和优惠信息` },
    { label: '品牌故事', value: `创作一个品牌故事${contentWord}，展示品牌理念和发展历程` },
  ];
};

const AICreator: React.FC = () => {
  const [form] = Form.useForm();
  const [contentType, setContentType] = useState<'auto' | 'image' | 'video'>('auto');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // 抽屉状态
  const [draftDrawerVisible, setDraftDrawerVisible] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [templateDrawerVisible, setTemplateDrawerVisible] = useState(false);
  
  // 质量校验状态
  const [qualityCheckResult, setQualityCheckResult] = useState<any>(null);
  const [qualityChecking, setQualityChecking] = useState(false);

  // 使用工作流 Hook
  const {
    task,
    currentStep,
    isLoading,
    nextAction,
    startNew,
    resumeFromDraft,
    executeCurrentStep,
    executeStep,
    saveDraft,
    reset,
    canSaveDraft,
  } = useCreationWorkflow();

  // 复制到剪贴板
  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    message.success('已复制');
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // 开始新创作
  const handleStartNew = useCallback(async () => {
    const requirement = form.getFieldValue('requirement');
    if (!requirement?.trim()) {
      message.error('请输入创作需求');
      return;
    }
    await startNew(requirement, contentType === 'auto' ? undefined : contentType);
  }, [form, contentType, startNew]);

  // 从草稿恢复
  const handleResumeDraft = useCallback(async (draft: any) => {
    await resumeFromDraft(draft.id);
    form.setFieldValue('requirement', draft.requirement);
    if (draft.contentTypePreference) {
      setContentType(draft.contentTypePreference);
    }
  }, [resumeFromDraft, form]);

  // 从模板开始
  const handleUseTemplate = useCallback(async (template: any) => {
    form.setFieldValue('requirement', template.requirement);
    if (template.contentTypePreference) {
      setContentType(template.contentTypePreference);
    }
    message.success('模板已应用，点击"开始创作"继续');
  }, [form]);

  // 从历史创建模板
  const handleCreateTemplateFromHistory = useCallback((_item: any) => {
    setHistoryDrawerVisible(false);
    setTemplateDrawerVisible(true);
    // 模板创建逻辑由 TemplateSelector 处理
  }, []);

  // 重置
  const handleReset = useCallback(() => {
    form.resetFields();
    setContentType('auto');
    reset();
  }, [form, reset]);

  // 处理备选操作
  const handleAlternative = useCallback((alternative: string) => {
    if (alternative.includes('保存草稿')) {
      saveDraft();
    } else if (alternative.includes('重新分析') || alternative.includes('修改需求')) {
      // 回到第一步
      handleReset();
    } else if (alternative.includes('重新生成')) {
      // 重新执行上一步
      if (currentStep === 2) {
        executeStep('analyze');
      } else if (currentStep === 3) {
        executeStep('generate');
      }
    } else if (alternative.includes('保存为模板') || alternative.includes('存为模板')) {
      setTemplateDrawerVisible(true);
    }
  }, [saveDraft, handleReset, currentStep, executeStep]);

  // 渲染结果
  const result = task ? {
    success: task.status !== 'failed',
    analysis: task.analysis,
    content: task.content,
    copywriting: task.copywriting,
    error: task.error,
  } : null;

  // 质量校验
  const handleQualityCheck = useCallback(async () => {
    if (!result?.copywriting) {
      message.error('请先生成文案');
      return;
    }
    
    setQualityChecking(true);
    setQualityCheckResult(null);
    
    try {
      const response = await aiApi.qualityCheck({
        title: result.copywriting.title,
        description: result.copywriting.description,
        hashtags: result.copywriting.hashtags,
        contentType: result.analysis?.contentType,
        platform: 'douyin',
      });
      
      if (response.data.success) {
        setQualityCheckResult(response.data.data);
        if (response.data.data.passed) {
          message.success('内容质量校验通过');
        } else {
          message.warning(`发现 ${response.data.data.issues.length} 个问题需要优化`);
        }
      } else {
        message.error(response.data.error || '校验失败');
      }
    } catch (err: any) {
      message.error(err.message || '校验失败');
    } finally {
      setQualityChecking(false);
    }
  }, [result]);

  // 复制建议内容
  const handleCopySuggestion = useCallback((text: string) => {
    message.success(`已复制: ${text}`);
  }, []);

  return (
    <div>
      {/* 顶部工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => setDraftDrawerVisible(true)}
            >
              草稿箱
            </Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setHistoryDrawerVisible(true)}
            >
              历史记录
            </Button>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => setTemplateDrawerVisible(true)}
            >
              模板库
            </Button>
          </Space>
          {canSaveDraft && (
            <Button
              icon={<SaveOutlined />}
              onClick={saveDraft}
              loading={isLoading}
            >
              保存草稿
            </Button>
          )}
        </Space>
      </Card>

      {/* 步骤条 */}
      <WorkflowSteps
        currentStep={currentStep}
        status={task?.status || 'draft'}
        progress={task?.progress || 0}
        currentStepMessage={task?.currentStepMessage}
      />

      <Row gutter={24}>
        {/* 左侧：输入和操作区域 */}
        <Col xs={24} lg={14}>
          {/* 需求输入 */}
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: '#1677ff' }} />
                <span>创作需求</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form form={form} layout="vertical">
              {/* 快捷模板 - 根据内容类型动态生成 */}
              <Form.Item label="快捷模板" style={{ marginBottom: 16 }}>
                <Space wrap size={8}>
                  {getQuickTemplates(contentType).map((template, index) => (
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
                  disabled={isLoading}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Form.Item label="内容类型" style={{ marginBottom: 24 }}>
                <Radio.Group
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  disabled={isLoading}
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

              {/* 操作按钮 */}
              {!task && (
                <Space size={12}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<RobotOutlined />}
                    onClick={handleStartNew}
                    loading={isLoading}
                  >
                    开始创作
                  </Button>
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    重置
                  </Button>
                </Space>
              )}
            </Form>
          </Card>

          {/* 下一步建议 */}
          {task && nextAction && (
            <NextActionGuide
              suggestion={nextAction}
              onExecute={executeCurrentStep}
              onAlternative={handleAlternative}
              loading={isLoading}
              disabled={isLoading}
            />
          )}

          {/* 需求分析结果 */}
          {result?.analysis && (
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#1677ff' }} />
                  <span>需求分析</span>
                  <Tag color="success">已完成</Tag>
                </Space>
              }
              style={{ marginBottom: 24 }}
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
            {isLoading && (
              <Card style={{ marginBottom: 24, textAlign: 'center', padding: '48px 24px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 24, color: '#1f2937', fontWeight: 500 }}>
                  {task?.currentStepMessage || 'AI 正在处理中'}
                </div>
                <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                  预计需要 30-60 秒，请耐心等待
                </div>
              </Card>
            )}

            {/* 错误提示 */}
            {result && !result.success && result.error && (
              <Alert
                message="执行失败"
                description={result.error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
                action={
                  <Button size="small" onClick={() => executeCurrentStep()}>
                    重试
                  </Button>
                }
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
                    <Tag color="success">已完成</Tag>
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
                    <Tag color="success">已完成</Tag>
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
                
                <Divider style={{ margin: '16px 0' }} />
                
                {/* 质量校验按钮 */}
                <Button
                  type="default"
                  icon={<SafetyCertificateOutlined />}
                  onClick={handleQualityCheck}
                  loading={qualityChecking}
                  block
                >
                  内容质量校验
                </Button>
              </Card>
            )}
            
            {/* 质量校验结果 */}
            {qualityCheckResult && (
              <div style={{ marginBottom: 24 }}>
                <QualityCheckResult
                  result={qualityCheckResult}
                  loading={qualityChecking}
                  onRecheck={handleQualityCheck}
                  onCopySuggestion={handleCopySuggestion}
                />
              </div>
            )}

            {/* 操作按钮 */}
            {task?.status === 'completed' && (
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
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    size="large"
                    icon={<AppstoreOutlined />}
                    block
                    onClick={() => setTemplateDrawerVisible(true)}
                  >
                    保存为模板
                  </Button>
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    block
                    onClick={handleReset}
                  >
                    开始新创作
                  </Button>
                </Space>
              </Card>
            )}

            {/* 初始提示 */}
            {!isLoading && !task && (
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

      {/* 草稿抽屉 */}
      <DraftManager
        visible={draftDrawerVisible}
        onClose={() => setDraftDrawerVisible(false)}
        onResume={handleResumeDraft}
      />

      {/* 历史记录抽屉 */}
      <HistoryDrawer
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        onCreateTemplate={handleCreateTemplateFromHistory}
      />

      {/* 模板选择器 */}
      <TemplateSelector
        visible={templateDrawerVisible}
        onClose={() => setTemplateDrawerVisible(false)}
        onUseTemplate={handleUseTemplate}
        initialRequirement={form.getFieldValue('requirement')}
      />
    </div>
  );
};

export default AICreator;
