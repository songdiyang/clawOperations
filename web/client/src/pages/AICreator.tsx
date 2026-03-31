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
  Progress,
  Collapse,
  Badge,
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
  RiseOutlined,
  StarOutlined,
  FireOutlined,
  AlertOutlined,
  BarChartOutlined,
  AimOutlined,
  HeartOutlined,
  NotificationOutlined,
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

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const DEFAULT_VIDEO_DURATION = 5;
const VIDEO_DURATION_OPTIONS = [5, 10, 15, 30, 60] as const;

// 内容切入点图标映射
const contentInsightIcons: Record<string, React.ReactNode> = {
  '痛点式': <AlertOutlined style={{ color: '#f5222d' }} />,
  '渴望式': <StarOutlined style={{ color: '#fa8c16' }} />,
  '好奇式': <BulbOutlined style={{ color: '#1677ff' }} />,
  '社交证明式': <HeartOutlined style={{ color: '#eb2f96' }} />,
};

// 评分颜色
 const getScoreColor = (score: number) => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#1677ff';
  if (score >= 40) return '#fa8c16';
  return '#f5222d';
};

// 表现等级映射
const engagementConfig = {
  high: { color: '#52c41a', text: '表现较好' },
  medium: { color: '#fa8c16', text: '表现稳定' },
  low: { color: '#f5222d', text: '仍可优化' },
};

// 快捷模板 - 面向常见抖音创作与发布场景
const getQuickTemplates = (type: 'auto' | 'image' | 'video') => {
  const w = type === 'image' ? '图片' : (type === 'video' ? '视频' : '内容');
  return [
    { label: '餐饮美食', value: `制作一个餐饮美食${w}，突出小龙虾麺辣鲜香的特色和口感` },
    { label: '限时活动', value: `制作限时活动${w}，突出套餐亮点、参与方式和截止时间` },
    { label: '探店打卡', value: `创作网红探店${w}，真实测评枯山小龙虾隐藏菜单揭秘` },
    { label: '新品发布', value: `制作新品首发${w}，全新口味惊喜揭晓，先到先得帕山小龙虾` },
    { label: '节日主题', value: `制作节日主题${w}，突出限定口味、节日氛围和适合分享的场景` },
    { label: '品牌故事', value: `创作品牌故事${w}，展示坑位山小龙虾工匠匹心精神和十年小龙虾心得` },
    { label: '用户反馈', value: `制作原汁鸿顾客来店好评${w}，展示真实顾客反馈与到店体验` },
    { label: '教程干货', value: `制作小龙虾处理教程${w}，3步学会最鲜小龙虾做法，收藏备用` },
    { label: '对比测评', value: `制作南昌鉲酱小龙虾 PK 武汉小龙虾${w}，真实常2家对比，不夸大` },
    { label: '幕后揭秘', value: `拍摄小龙虾封山制作全过程${w}，揭秘珍宝配方，品质看得见` },
    { label: '福利互动', value: `制作福利互动${w}，清楚说明参与方式、福利内容和开奖时间` },
    { label: '情感共鸣', value: `创作情感共鸣${w}，那个让你念念不忘的麺辣味道和兒时记忆` },
  ];
};

const AICreator: React.FC = () => {
  const [form] = Form.useForm();
  const [contentType, setContentType] = useState<'auto' | 'image' | 'video'>('auto');
  const [videoDuration, setVideoDuration] = useState<number>(DEFAULT_VIDEO_DURATION);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // 抽屉状态
  const [draftDrawerVisible, setDraftDrawerVisible] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [templateDrawerVisible, setTemplateDrawerVisible] = useState(false);
  
  // 内容表现评估状态
  const [qualityCheckResult, setQualityCheckResult] = useState<any>(null);
  const [qualityChecking, setQualityChecking] = useState(false);
  const [marketingEvaluation, setMarketingEvaluation] = useState<any>(null);
  const [marketingEvaluating, setMarketingEvaluating] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);

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
    updateVideoDuration,
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
    await startNew(
      requirement,
      contentType === 'auto' ? undefined : contentType,
      videoDuration
    );
  }, [form, contentType, startNew, videoDuration]);

  // 从草稿恢复
  const handleResumeDraft = useCallback(async (draft: any) => {
    await resumeFromDraft(draft.id);
    form.setFieldValue('requirement', draft.requirement);
    if (draft.contentTypePreference) {
      setContentType(draft.contentTypePreference);
    }
    if (draft.videoDuration) {
      setVideoDuration(draft.videoDuration);
      updateVideoDuration(draft.videoDuration);
    }
  }, [resumeFromDraft, form, updateVideoDuration]);

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
    setVideoDuration(DEFAULT_VIDEO_DURATION);
    reset();
  }, [form, reset]);

  const handleDraftDeleted = useCallback((draftId: string) => {
    if (task?.id !== draftId) {
      return;
    }

    handleReset();
    message.info('当前草稿已删除，页面内容已刷新');
  }, [task?.id, handleReset]);

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

  // 重新生成文案（当质量校验不通过时）
  const handleRegenerateCopywriting = useCallback(async () => {
    if (!task?.id) {
      message.error('任务不存在');
      return;
    }
    
    // 清除之前的校验结果
    setQualityCheckResult(null);
    setMarketingEvaluation(null);
    
    try {
      // 重新执行文案生成步骤
      await executeStep('copywriting');
      message.success('文案重新生成完成，请再次校验');
    } catch (err: any) {
      message.error(err.message || '重新生成失败');
    }
  }, [task?.id, executeStep]);

  // 内容表现评估
  const handleMarketingEvaluate = useCallback(async () => {
    if (!result?.copywriting) {
      message.error('请先生成文案');
      return;
    }

    setMarketingEvaluating(true);
    setMarketingEvaluation(null);

    try {
      const response = await aiApi.marketingEvaluate({
        title: result.copywriting.title,
        description: result.copywriting.description,
        hashtags: result.copywriting.hashtags,
        contentType: result.analysis?.contentType,
      });

      if (response.data.success) {
        setMarketingEvaluation(response.data.data);
        const score = response.data.data.score;
        if (score >= 75) {
          message.success(`内容评分：${score}分，整体表现较好`);
        } else if (score >= 50) {
          message.info(`内容评分：${score}分，可根据建议继续优化`);
        } else {
          message.warning(`内容评分：${score}分，建议根据提示调整文案`);
        }
      } else {
        message.error(response.data.error || '评估失败');
      }
    } catch (err: any) {
      message.error(err.message || '评估失败');
    } finally {
      setMarketingEvaluating(false);
    }
  }, [result]);

  // 生成内容开场钩子
  const handleGenerateHooks = useCallback(async () => {
    if (!result?.analysis) {
      message.error('请先完成需求分析');
      return;
    }

    setHooksLoading(true);
    try {
      const response = await aiApi.generateHooks({
        theme: result.analysis.theme,
        targetAudience: result.analysis.targetAudience,
        keyPoints: result.analysis.keyPoints,
      });

      if (response.data.success) {
        const hooks: string[] = response.data.data.hooks || [];
        message.success(`已生成 ${hooks.length} 个开场钩子`);
        // 将钩子添加到分析结果显示中（通过更新 task）
      } else {
        message.error(response.data.error || '钩子生成失败');
      }
    } catch (err: any) {
      message.error(err.message || '钩子生成失败');
    } finally {
      setHooksLoading(false);
    }
  }, [result]);

  // 切换备选标题
  const handleUseAlternativeTitle = useCallback((title: string) => {
    if (!result?.copywriting) return;
    navigator.clipboard.writeText(title);
    message.success('备选标题已复制到剪贴板');
  }, [result]);

  const handleRegenerateVideo = useCallback(async () => {
    if (!task?.analysis || task.analysis.contentType !== 'video') {
      message.error('当前没有可重新生成的视频内容');
      return;
    }

    try {
      await executeStep('generate');
      message.success('视频已重新生成');
    } catch (err: any) {
      message.error(err.message || '重新生成视频失败');
    }
  }, [task?.analysis, executeStep]);

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

              {contentType !== 'image' && (
                <Form.Item
                  label="视频时长"
                  extra={contentType === 'auto' ? '当内容类型最终识别为视频时生效' : '用于控制生成视频的目标时长'}
                  style={{ marginBottom: 24 }}
                >
                  <Radio.Group
                    value={videoDuration}
                    onChange={(e) => {
                      const duration = Number(e.target.value);
                      setVideoDuration(duration);
                      updateVideoDuration(duration);
                    }}
                    optionType="button"
                    buttonStyle="solid"
                    disabled={isLoading}
                  >
                    {VIDEO_DURATION_OPTIONS.map((duration) => (
                      <Radio.Button key={duration} value={duration}>
                        {duration}s
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>
              )}

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
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>内容重点</div>
                  <Space wrap>
                    {result.analysis.keyPoints?.map((point, index) => (
                      <Tag key={index}>{point}</Tag>
                    ))}
                  </Space>
                </Col>
              </Row>

              {/* 内容优化卡片 */}
              {(result.analysis as any).marketingAngle && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, fontWeight: 600 }}>
                    <RiseOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                    内容优化建议
                  </div>
                  <Row gutter={[16, 12]}>
                    {/* 内容切入点 */}
                    <Col span={24}>
                      <div style={{
                        padding: '10px 14px',
                        background: '#fff7e6',
                        borderRadius: 8,
                        border: '1px solid #ffd591',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}>
                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                          {contentInsightIcons[(result.analysis as any).marketingAngle?.split('（')[0]] || <AimOutlined style={{ color: '#fa8c16' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: '#8c6d00', marginBottom: 4 }}>内容切入点</div>
                          <Text style={{ fontSize: 13 }}>{(result.analysis as any).marketingAngle}</Text>
                        </div>
                      </div>
                    </Col>

                    {/* 表达关键词 */}
                    {(result.analysis as any).emotionalTriggers?.length > 0 && (
                      <Col span={24}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <FireOutlined style={{ marginRight: 4, color: '#f5222d' }} />
                          表达关键词
                        </div>
                        <Space wrap size={6}>
                          {(result.analysis as any).emotionalTriggers.map((trigger: string, i: number) => (
                            <Tag key={i} color="red" style={{ cursor: 'pointer' }}
                              onClick={() => copyToClipboard(trigger, `trigger-${i}`)}
                            >
                              {trigger}
                            </Tag>
                          ))}
                        </Space>
                      </Col>
                    )}

                    {/* 内容钩子 */}
                    {(result.analysis as any).contentHooks?.length > 0 && (
                      <Col span={24}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <NotificationOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                          开场钩子建议（点击复制）
                        </div>
                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                          {(result.analysis as any).contentHooks.map((hook: string, i: number) => (
                            <div key={i}
                              style={{
                                padding: '8px 12px',
                                background: '#f0f5ff',
                                borderRadius: 6,
                                border: '1px solid #adc6ff',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onClick={() => copyToClipboard(hook, `hook-${i}`)}
                            >
                              <Text style={{ fontSize: 13, flex: 1 }}>{hook}</Text>
                              <CopyOutlined style={{ color: '#1677ff', marginLeft: 8, flexShrink: 0 }} />
                            </div>
                          ))}
                        </Space>
                      </Col>
                    )}

                    {/* 平台优化建议 */}
                    {(result.analysis as any).platformTips?.length > 0 && (
                      <Col span={24}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <BarChartOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                          发布优化建议
                        </div>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                          {(result.analysis as any).platformTips.map((tip: string, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ color: '#52c41a', fontWeight: 700, flexShrink: 0 }}>·</span>
                              <Text style={{ fontSize: 12, color: '#374151' }}>{tip}</Text>
                            </div>
                          ))}
                        </Space>
                      </Col>
                    )}

                    {/* 用户关注点 */}
                    {(result.analysis as any).audiencePainPoints?.length > 0 && (
                      <Col span={24}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <AlertOutlined style={{ marginRight: 4, color: '#f5222d' }} />
                          用户关注点
                        </div>
                        <Space wrap size={6}>
                          {(result.analysis as any).audiencePainPoints.map((pain: string, i: number) => (
                            <Tag key={i} color="orange">{pain}</Tag>
                          ))}
                        </Space>
                      </Col>
                    )}
                    
                    {/* 生成钩子按钮 */}
                    <Col span={24}>
                      <Button
                        size="small"
                        icon={<NotificationOutlined />}
                        onClick={handleGenerateHooks}
                        loading={hooksLoading}
                        type="dashed"
                      >
                        重新生成开场钩子
                      </Button>
                    </Col>
                  </Row>
                </>
              )}
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
                extra={result.content.type === 'video' ? (
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleRegenerateVideo}
                    loading={isLoading && task?.status === 'generating'}
                    disabled={isLoading}
                  >
                    重新生成视频
                  </Button>
                ) : undefined}
                style={{ marginBottom: 24 }}
              >
                {result.content.type === 'image' && result.content.previewUrl ? (
                  <Image
                    src={result.content.previewUrl}
                    alt="生成的图片"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                ) : result.content.type === 'video' && result.content.previewUrl ? (
                  <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <video
                      src={result.content.previewUrl}
                      controls
                      style={{ width: '100%', display: 'block', borderRadius: 8 }}
                      poster=""
                    >
                      您的浏览器不支持视频播放
                    </video>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                      {result.content.localPath}
                    </div>
                  </div>
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

                {/* 发布辅助信息：行动号召 + 备选标题 */}
                {((result.copywriting as any).callToAction || (result.copywriting as any).alternativeTitles?.length > 0) && (
                  <>
                    <Divider style={{ margin: '14px 0' }} />

                    {/* 行动号召语 */}
                    {(result.copywriting as any).callToAction && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <SendOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                          行动号召语
                        </div>
                        <div style={{
                          padding: '8px 12px',
                          background: 'linear-gradient(135deg, #e6f4ff, #f0f5ff)',
                          borderRadius: 6,
                          border: '1px solid #91caff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                            {(result.copywriting as any).callToAction}
                          </Text>
                          <Tooltip title="复制">
                            <Button type="text" size="small"
                              icon={<CopyOutlined style={{ color: '#1677ff' }} />}
                              onClick={() => copyToClipboard((result.copywriting as any).callToAction, 'cta')}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    )}

                    {/* 备选标题 */}
                    {(result.copywriting as any).alternativeTitles?.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                          <EditOutlined style={{ marginRight: 4 }} />
                          备选标题（点击复制）
                        </div>
                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                          {(result.copywriting as any).alternativeTitles.map((t: string, i: number) => (
                            <div key={i}
                              style={{
                                padding: '8px 12px',
                                background: '#fafafa',
                                borderRadius: 6,
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onClick={() => handleUseAlternativeTitle(t)}
                            >
                              <Text style={{ fontSize: 13, flex: 1 }}>{t}</Text>
                              <CopyOutlined style={{ color: '#9ca3af', marginLeft: 8, flexShrink: 0 }} />
                            </div>
                          ))}
                        </Space>
                      </div>
                    )}

                    {/* 内容评分（AI自评） */}
                    {(result.copywriting as any).marketingScore != null && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                          <BarChartOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                          AI 内容评分
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Progress
                            type="circle"
                            size={56}
                            percent={(result.copywriting as any).marketingScore}
                            strokeColor={getScoreColor((result.copywriting as any).marketingScore)}
                            format={val => <span style={{ fontSize: 13, fontWeight: 600 }}>{val}</span>}
                          />
                          <div style={{ flex: 1 }}>
                            {(result.copywriting as any).improvementSuggestions?.map((s: string, i: number) => (
                              <div key={i} style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', gap: 4 }}>
                                <span style={{ color: '#1677ff', flexShrink: 0 }}>{i + 1}.</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <Divider style={{ margin: '16px 0' }} />
                
                {/* 质量校验和表现评估按钮 */}
                <Space style={{ width: '100%' }} direction="vertical" size={8}>
                  <Button
                    type="default"
                    icon={<SafetyCertificateOutlined />}
                    onClick={handleQualityCheck}
                    loading={qualityChecking}
                    block
                  >
                    内容质量校验
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    icon={<RiseOutlined />}
                    onClick={handleMarketingEvaluate}
                    loading={marketingEvaluating}
                    block
                  >
                    评估内容表现
                  </Button>
                </Space>
              </Card>
            )}
            
            {/* 质量校验结果 */}
            {qualityCheckResult && (
              <div style={{ marginBottom: 24 }}>
                <QualityCheckResult
                  result={qualityCheckResult}
                  loading={qualityChecking || isLoading}
                  onRecheck={handleQualityCheck}
                  onRegenerateCopywriting={handleRegenerateCopywriting}
                  onCopySuggestion={handleCopySuggestion}
                />
              </div>
            )}

            {/* 内容表现评估结果 */}
            {marketingEvaluation && (
              <Card
                title={
                  <Space>
                    <RiseOutlined style={{ color: '#1677ff' }} />
                    <span>内容表现评估</span>
                    <Badge
                      count={`${marketingEvaluation.score}分`}
                      style={{
                        backgroundColor: getScoreColor(marketingEvaluation.score),
                        fontSize: 12,
                      }}
                    />
                  </Space>
                }
                style={{ marginBottom: 24 }}
                extra={
                  <Tag color={engagementConfig[marketingEvaluation.predictedEngagement as keyof typeof engagementConfig]?.color}>
                    {engagementConfig[marketingEvaluation.predictedEngagement as keyof typeof engagementConfig]?.text}
                  </Tag>
                }
              >
                {/* 各维度评分 */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {[
                  { label: '标题吸引力', value: marketingEvaluation.dimensions.titleAttractiveness },
                    { label: '内容表达', value: marketingEvaluation.dimensions.emotionalResonance },
                    { label: '行动提示', value: marketingEvaluation.dimensions.callToActionStrength },
                    { label: '话题质量', value: marketingEvaluation.dimensions.hashtagQuality },
                  ].map(({ label, value }) => (
                    <Col span={12} key={label}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
                      <Progress
                        percent={value}
                        size="small"
                        strokeColor={getScoreColor(value)}
                        format={val => <span style={{ fontSize: 11 }}>{val}</span>}
                      />
                    </Col>
                  ))}
                </Row>

                {/* 建议发布时间 */}
                <div style={{
                  padding: '8px 12px',
                  background: '#f6ffed',
                  borderRadius: 6,
                  border: '1px solid #b7eb8f',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <ClockCircleOutlined style={{ color: '#52c41a', flexShrink: 0 }} />
                  <Text style={{ fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>建议发布时间：</span>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{marketingEvaluation.bestPublishTime}</span>
                  </Text>
                </div>

                {/* 内容钩子建议 */}
                {marketingEvaluation.contentHooks?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                      <NotificationOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                      开场钩子建议
                    </div>
                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                      {marketingEvaluation.contentHooks.map((hook: string, i: number) => (
                        <div key={i}
                          style={{
                            padding: '8px 12px',
                            background: '#f0f5ff',
                            borderRadius: 6,
                            border: '1px solid #adc6ff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onClick={() => copyToClipboard(hook, `eval-hook-${i}`)}
                        >
                          <Text style={{ fontSize: 12, flex: 1 }}>{hook}</Text>
                          <CopyOutlined style={{ color: '#1677ff', marginLeft: 8, flexShrink: 0, fontSize: 12 }} />
                        </div>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 改进建议 */}
                {marketingEvaluation.suggestions?.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      <StarOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                      改进建议
                    </div>
                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                      {marketingEvaluation.suggestions.map((s: string, i: number) => (
                        <Alert
                          key={i}
                          message={s}
                          type="info"
                          showIcon={false}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        />
                      ))}
                    </Space>
                  </>
                )}

                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleMarketingEvaluate}
                  loading={marketingEvaluating}
                  style={{ marginTop: 12 }}
                >
                  重新评估表现
                </Button>
              </Card>
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
        onDelete={handleDraftDeleted}
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
