import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Space,
  Tag,
  Switch,
  DatePicker,
  Progress,
  Alert,
  Typography,
  Row,
  Col,
  Modal,
  Steps,
  Segmented,
  notification,
} from 'antd';
import {
  InboxOutlined,
  PlusOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  VideoCameraOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { publishApi, uploadApi } from '../api/client';
import dayjs from 'dayjs';
import ImageTextEditor from '../components/publish/ImageTextEditor';
import PublishErrorDisplay, {
  PublishResultExtended,
  PublishStep,
  PublishErrorType,
} from '../components/publish/PublishErrorDisplay';
import { ImageItem, PublishType } from '../../../../src/models/types';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;
const ACCEPTED_FORMATS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];

const Publish: React.FC = () => {
  const [form] = Form.useForm();
  const [publishType, setPublishType] = useState<PublishType>('video');
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [publishing, setPublishing] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [inputHashtag, setInputHashtag] = useState('');
  const [result, setResult] = useState<any>(null);
  
  // 重试相关状态
  const [lastPublishResult, setLastPublishResult] = useState<PublishResultExtended | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lastPublishParams, setLastPublishParams] = useState<{
    videoPath: string;
    options: any;
    isRemoteUrl: boolean;
  } | null>(null);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`文件大小不能超过 4GB`);
      return Upload.LIST_IGNORE;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(ext)) {
      message.error(`不支持的文件格式: ${ext}`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleUpload = async (file: File): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    
    try {
      const response = await uploadApi.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadStatus('success');
      message.success('视频上传成功');
      return response.data.data.videoId;
    } catch (error: any) {
      setUploadStatus('error');
      message.error(error.response?.data?.error || '上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddHashtag = () => {
    const tag = inputHashtag.trim().replace(/^#/, '');
    if (!tag) return;
    if (hashtags.length >= 5) {
      message.warning('最多只能添加 5 个话题标签');
      return;
    }
    if (hashtags.includes(tag)) {
      message.warning('该标签已存在');
      return;
    }
    if (tag.length > 20) {
      message.warning('标签长度不能超过 20 个字符');
      return;
    }
    setHashtags([...hashtags, tag]);
    setInputHashtag('');
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要清空所有填写的内容吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        form.resetFields();
        setFileList([]);
        setImageItems([]);
        setHashtags([]);
        setResult(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setCurrentStep(0);
        message.success('表单已重置');
      },
    });
  };

  // 清除视频文件并重置上传状态
  const handleClearVideo = () => {
    setFileList([]);
    setUploadProgress(0);
    setUploadStatus('idle');
    message.info('已清除视频，可重新选择文件');
  };

  // 重试上传
  const handleRetryUpload = async () => {
    if (fileList.length > 0 && fileList[0].originFileObj) {
      await handleUpload(fileList[0].originFileObj);
    }
  };

  const handlePublish = async (values: any) => {
    // 图文发布验证
    if (publishType === 'image-text') {
      if (imageItems.length === 0) {
        message.error('请至少上传一张图片');
        return;
      }
      // 检查所有图片是否上传成功
      const failedImages = imageItems.filter(img => img.uploadStatus === 'error');
      if (failedImages.length > 0) {
        message.error('有图片上传失败，请删除后重试');
        return;
      }
      const uploadingImages = imageItems.filter(img => img.uploadStatus === 'uploading');
      if (uploadingImages.length > 0) {
        message.error('请等待所有图片上传完成');
        return;
      }
    } else {
      // 视频发布验证
      if (fileList.length === 0 && !values.videoUrl) {
        message.error('请上传视频文件或输入视频 URL');
        return;
      }
    }

    if (scheduleMode && values.publishTime) {
      const publishTime = values.publishTime.valueOf();
      const now = Date.now();
      const minTime = now + 10 * 60 * 1000;
      if (publishTime < minTime) {
        message.error('定时发布时间至少需要在 10 分钟后');
        return;
      }
    }

    setPublishing(true);
    setResult(null);
    setLastPublishResult(null);

    try {
      const options = {
        title: values.title,
        description: values.description,
        hashtags: hashtags,
        atUsers: values.atUsers?.split(',').map((s: string) => s.trim()).filter(Boolean),
        poiId: values.poiId,
        poiName: values.poiName,
        microAppId: values.microAppId,
        microAppTitle: values.microAppTitle,
        microAppUrl: values.microAppUrl,
        articleId: values.articleId,
      };

      if (publishType === 'image-text') {
        // 图文发布
        const publishImages = imageItems.map(img => ({
          id: img.id,
          url: img.url,
          uploadedUrl: img.uploadedUrl,
          title: img.title,
          description: img.description,
          textStyle: img.textStyle,
          order: img.order,
        }));

        if (scheduleMode && values.publishTime) {
          const response = await publishApi.scheduleImageText({
            images: publishImages,
            publishTime: values.publishTime.toISOString(),
            options,
          });
          message.success('图文定时任务创建成功！');
          setResult({ ...response.data.data, isScheduled: true, isImageText: true });
        } else {
          const response = await publishApi.publishImageText({
            images: publishImages,
            options,
          });
          
          if (response.data.data.success) {
            message.success('图文发布成功！');
          } else {
            message.error(response.data.data.error || '图文发布失败');
          }
          setResult({ ...response.data.data, isImageText: true });
        }
      } else {
        // 视频发布
        let videoPath = values.videoUrl;
        let isRemoteUrl = !!values.videoUrl;

        if (fileList.length > 0 && fileList[0].originFileObj && !values.videoUrl) {
          const videoId = await handleUpload(fileList[0].originFileObj);
          if (!videoId) {
            setPublishing(false);
            return;
          }
          videoPath = videoId;
          isRemoteUrl = false;
        }

        // 保存发布参数用于重试
        setLastPublishParams({
          videoPath,
          options,
          isRemoteUrl,
        });

        if (scheduleMode && values.publishTime) {
          const response = await publishApi.schedule({
            videoPath,
            publishTime: values.publishTime.toISOString(),
            options,
            isRemoteUrl,
          });
          message.success('定时任务创建成功！');
          setResult({ ...response.data.data, isScheduled: true });
        } else {
          const response = await publishApi.publish({
            videoPath,
            options,
            isRemoteUrl,
          });
          
          const publishResult = response.data.data as PublishResultExtended;
          
          if (publishResult.success) {
            message.success('视频发布成功！');
            setLastPublishResult(null);
          } else {
            // 发布失败，保存扩展结果用于重试
            setLastPublishResult({
              ...publishResult,
              originalParams: { videoPath, options, isRemoteUrl },
            });
            
            // 显示错误通知
            notification.error({
              message: '发布失败',
              description: publishResult.friendlyMessage || publishResult.error || '发布过程中发生错误',
              duration: 0, // 不自动关闭
            });
          }
          setResult(publishResult);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '操作失败';
      message.error(errorMessage);
      
      const failedResult: PublishResultExtended = {
        success: false,
        error: errorMessage,
        errorType: PublishErrorType.UNKNOWN,
        retryable: true,
        originalParams: lastPublishParams || undefined,
      };
      
      setResult(failedResult);
      setLastPublishResult(failedResult);
      
      notification.error({
        message: '发布失败',
        description: errorMessage,
        duration: 0,
      });
    } finally {
      setPublishing(false);
    }
  };

  // 重试发布
  const handleRetry = async (fromStep?: PublishStep) => {
    if (!lastPublishResult || !lastPublishParams) {
      message.error('没有可重试的发布任务');
      return;
    }

    setRetrying(true);
    
    try {
      const response = await publishApi.retry({
        originalParams: lastPublishParams,
        fromStep,
        uploadedVideoId: lastPublishResult.uploadedVideoId,
      });

      const retryResult = response.data.data as PublishResultExtended;

      if (retryResult.success) {
        message.success('重试成功！');
        setLastPublishResult(null);
        notification.success({
          message: '发布成功',
          description: '视频已成功发布到抖音',
        });
      } else {
        setLastPublishResult({
          ...retryResult,
          originalParams: lastPublishParams,
        });
        
        notification.error({
          message: '重试失败',
          description: retryResult.friendlyMessage || retryResult.error || '重试过程中发生错误',
          duration: 0,
        });
      }

      setResult(retryResult);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '重试失败';
      message.error(errorMessage);
      
      notification.error({
        message: '重试失败',
        description: errorMessage,
        duration: 0,
      });
    } finally {
      setRetrying(false);
    }
  };

  // 重新授权（Token过期时）
  const handleReauthorize = () => {
    // 跳转到授权配置页面
    window.location.href = '/auth-config';
  };

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getProgressStatus = () => {
    if (uploadStatus === 'error') return 'exception';
    if (uploadStatus === 'success') return 'success';
    return 'active';
  };

  return (
    <div>
      {/* 发布类型切换 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ fontSize: 16, marginRight: 16 }}>发布类型</Text>
            <Segmented
              value={publishType}
              onChange={(value) => {
                setPublishType(value as PublishType);
                setCurrentStep(0);
                setResult(null);
              }}
              options={[
                {
                  label: (
                    <Space>
                      <VideoCameraOutlined />
                      <span>视频发布</span>
                    </Space>
                  ),
                  value: 'video',
                },
                {
                  label: (
                    <Space>
                      <PictureOutlined />
                      <span>图文发布</span>
                    </Space>
                  ),
                  value: 'image-text',
                },
              ]}
            />
          </div>
          <Text type="secondary">
            {publishType === 'video' ? '发布视频内容到抖音' : '发布图文内容到抖音'}
          </Text>
        </div>
      </Card>

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
          items={publishType === 'video' ? [
            { title: '上传视频', icon: <CloudUploadOutlined /> },
            { title: '填写信息', icon: <FileTextOutlined /> },
            { title: '发布设置', icon: <ClockCircleOutlined /> },
          ] : [
            { title: '上传图片', icon: <PictureOutlined /> },
            { title: '编辑内容', icon: <FileTextOutlined /> },
            { title: '发布设置', icon: <ClockCircleOutlined /> },
          ]}
          onChange={setCurrentStep}
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handlePublish}
        autoComplete="off"
        requiredMark={false}
      >
        <Row gutter={24}>
          {/* 左侧内容区 */}
          <Col xs={24} lg={16}>
            {/* 视频上传 - 仅视频模式显示 */}
            {publishType === 'video' && (
            <Card
              title={
                <Space>
                  <CloudUploadOutlined style={{ color: '#1677ff' }} />
                  <span>上传视频</span>
                </Space>
              }
              style={{ marginBottom: 24, display: currentStep >= 0 ? 'block' : 'none' }}
            >
              <Dragger
                fileList={fileList}
                onChange={({ fileList }) => {
                  setFileList(fileList);
                  if (fileList.length > 0) setCurrentStep(1);
                  if (fileList.length === 0) {
                    setUploadStatus('idle');
                    setUploadProgress(0);
                  }
                }}
                beforeUpload={beforeUpload}
                accept={ACCEPTED_FORMATS.join(',')}
                maxCount={1}
                onRemove={() => {
                  setUploadStatus('idle');
                  setUploadProgress(0);
                }}
                style={{ padding: '24px 0' }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#1677ff', fontSize: 48 }} />
                </p>
                <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  点击或拖拽视频文件到此处
                </p>
                <p style={{ color: '#6b7280', fontSize: 13 }}>
                  支持 MP4、MOV、AVI、WebM、MKV 格式，最大 4GB
                </p>
              </Dragger>

              {(uploading || uploadStatus !== 'idle') && (
                <div style={{ marginTop: 16 }}>
                  <Progress percent={uploadProgress} status={getProgressStatus()} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {uploadStatus === 'uploading' && '正在上传视频...'}
                      {uploadStatus === 'success' && '上传完成'}
                      {uploadStatus === 'error' && '上传失败'}
                    </Text>
                    {uploadStatus === 'error' && (
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={handleRetryUpload}
                        >
                          重试
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={handleClearVideo}
                        >
                          删除重选
                        </Button>
                      </Space>
                    )}
                  </div>
                </div>
              )}

              {/* 上传失败时的明显提示 */}
              {uploadStatus === 'error' && (
                <Alert
                  message="视频上传失败"
                  description="请检查网络连接或文件格式后重试，也可以删除当前文件重新选择。"
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  style={{ marginTop: 16 }}
                  action={
                    <Space direction="vertical" size="small">
                      <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={handleRetryUpload}>
                        重新上传
                      </Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={handleClearVideo}>
                        删除文件
                      </Button>
                    </Space>
                  }
                />
              )}

              {fileList.length > 0 && fileList[0].size && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: uploadStatus === 'error' ? '#fff2f0' : uploadStatus === 'success' ? '#f6ffed' : '#f5f7fa',
                    borderRadius: 8,
                    border: uploadStatus === 'error' ? '1px solid #ffccc7' : uploadStatus === 'success' ? '1px solid #b7eb8f' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space>
                    {uploadStatus === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    {uploadStatus === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    {uploadStatus !== 'success' && uploadStatus !== 'error' && <CheckCircleOutlined style={{ color: '#1677ff' }} />}
                    <div>
                      <Text style={{ display: 'block' }}>{fileList[0].name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{formatFileSize(fileList[0].size)}</Text>
                    </div>
                  </Space>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleClearVideo}
                    disabled={uploading}
                    title="删除视频，重新选择"
                  >
                    删除
                  </Button>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <Form.Item
                  label="或输入视频 URL"
                  name="videoUrl"
                  rules={[{ type: 'url', message: '请输入有效的 URL 地址' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="https://example.com/video.mp4" allowClear />
                </Form.Item>
              </div>
            </Card>
            )}

            {/* 图文编辑 - 仅图文模式显示 */}
            {publishType === 'image-text' && (
            <Card
              title={
                <Space>
                  <PictureOutlined style={{ color: '#1677ff' }} />
                  <span>图片编辑</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <ImageTextEditor
                value={imageItems}
                onChange={(items) => {
                  setImageItems(items);
                  if (items.length > 0 && currentStep === 0) {
                    setCurrentStep(1);
                  }
                }}
                maxCount={9}
              />
            </Card>
            )}

            {/* 步骤 2: 填写信息 */}
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#52c41a' }} />
                  <span>发布内容</span>
                </Space>
              }
              style={{ marginBottom: 24, display: currentStep >= 1 ? 'block' : 'none' }}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[{ max: 55, message: '标题最多 55 个字符' }]}
                  >
                    <Input placeholder={publishType === 'video' ? '输入视频标题（最多 55 字符）' : '输入图文标题（最多 55 字符）'} showCount maxLength={55} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="描述"
                    name="description"
                    rules={[{ max: 300, message: '描述最多 300 个字符' }]}
                  >
                    <TextArea
                      rows={3}
                      placeholder={publishType === 'video' ? '输入视频描述（最多 300 字符）' : '输入图文描述（最多 300 字符）'}
                      showCount
                      maxLength={300}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="话题标签">
                    {hashtags.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <Space wrap>
                          {hashtags.map((tag) => (
                            <Tag
                              key={tag}
                              closable
                              onClose={() => handleRemoveHashtag(tag)}
                              color="blue"
                            >
                              #{tag}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    <Space.Compact style={{ width: '100%', maxWidth: 300 }}>
                      <Input
                        placeholder="输入标签名称"
                        value={inputHashtag}
                        onChange={(e) => setInputHashtag(e.target.value)}
                        onPressEnter={(e) => { e.preventDefault(); handleAddHashtag(); }}
                        maxLength={20}
                        disabled={hashtags.length >= 5}
                      />
                      <Button
                        icon={<PlusOutlined />}
                        onClick={handleAddHashtag}
                        disabled={hashtags.length >= 5 || !inputHashtag.trim()}
                      >
                        添加
                      </Button>
                    </Space.Compact>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      最多 5 个标签，已添加 {hashtags.length} 个
                    </div>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="@提及用户" name="atUsers">
                    <Input placeholder="输入用户 OpenID，多个用逗号分隔" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 高级选项 */}
            <Card
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: '#faad14' }} />
                  <span>高级选项</span>
                  <Tag>可选</Tag>
                </Space>
              }
              style={{ marginBottom: 24, display: currentStep >= 1 ? 'block' : 'none' }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="位置名称" name="poiName">
                    <Input placeholder="如：武汉光谷" prefix={<EnvironmentOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="POI ID" name="poiId">
                    <Input placeholder="抖音地点 ID" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="小程序 ID" name="microAppId">
                    <Input placeholder="小程序 ID" prefix={<LinkOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="小程序标题" name="microAppTitle">
                    <Input placeholder="小程序标题" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="小程序链接" name="microAppUrl" style={{ marginBottom: 0 }}>
                    <Input placeholder="小程序链接" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 右侧：发布设置 */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 88 }}>
              <Card
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: '#1677ff' }} />
                    <span>发布设置</span>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: scheduleMode ? '#e6f4ff' : '#f5f7fa',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    onClick={() => setScheduleMode(!scheduleMode)}
                  >
                    <Space>
                      {scheduleMode ? <ClockCircleOutlined /> : <SendOutlined />}
                      <Text strong>{scheduleMode ? '定时发布' : '立即发布'}</Text>
                    </Space>
                    <Switch
                      checked={scheduleMode}
                      onChange={setScheduleMode}
                      size="small"
                    />
                  </div>
                </div>

                {scheduleMode && (
                  <Form.Item
                    label="发布时间"
                    name="publishTime"
                    rules={[{ required: true, message: '请选择发布时间' }]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD HH:mm"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                      style={{ width: '100%' }}
                      placeholder="选择发布时间"
                    />
                  </Form.Item>
                )}

                <Form.Item label="商品 ID" name="articleId" style={{ marginBottom: 0 }}>
                  <Input placeholder="用于挂载商品链接" />
                </Form.Item>
              </Card>

              {/* 操作按钮 */}
              <Card style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={publishing || uploading}
                    icon={scheduleMode ? <ClockCircleOutlined /> : <SendOutlined />}
                    disabled={uploading}
                    block
                  >
                    {uploading
                      ? (publishType === 'video' ? '视频上传中...' : '图片上传中...')
                      : publishing
                        ? '发布中...'
                        : scheduleMode
                          ? '创建定时任务'
                          : (publishType === 'video' ? '立即发布视频' : '立即发布图文')}
                  </Button>
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    disabled={publishing || uploading}
                    block
                  >
                    重置表单
                  </Button>
                </Space>
              </Card>

              {/* 结果展示 */}
              {/* 发布失败时显示错误详情和重试选项 */}
              {lastPublishResult && !lastPublishResult.success && (
                <PublishErrorDisplay
                  result={lastPublishResult}
                  onRetry={handleRetry}
                  onReauthorize={handleReauthorize}
                  retrying={retrying}
                />
              )}
              
              {result && (
                <Alert
                  message={
                    <Space>
                      {result.success || result.isScheduled ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      {result.isScheduled
                        ? '定时任务创建成功'
                        : result.success
                          ? '发布成功'
                          : '发布失败'}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                      {result.videoId && (
                        <div>
                          <Text type="secondary">视频 ID: </Text>
                          <Text code copyable={{ text: result.videoId }}>
                            {result.videoId}
                          </Text>
                        </div>
                      )}
                      {result.shareUrl && (
                        <div>
                          <Text type="secondary">分享链接: </Text>
                          <a href={result.shareUrl} target="_blank" rel="noopener noreferrer">
                            打开
                          </a>
                        </div>
                      )}
                      {result.taskId && (
                        <div>
                          <Text type="secondary">任务 ID: </Text>
                          <Text code copyable={{ text: result.taskId }}>
                            {result.taskId}
                          </Text>
                        </div>
                      )}
                      {result.error && !lastPublishResult && (
                        <Text type="danger">{result.error}</Text>
                      )}
                      {/* 已上传视频ID提示 */}
                      {result.uploadedVideoId && !result.success && (
                        <div>
                          <Text type="secondary">已上传视频ID: </Text>
                          <Text code copyable={{ text: result.uploadedVideoId }}>
                            {result.uploadedVideoId}
                          </Text>
                          <Text type="success" style={{ marginLeft: 8 }}>
                            (可跳过上传步骤重试)
                          </Text>
                        </div>
                      )}
                      {/* 重试信息 */}
                      {result.retryCount !== undefined && result.retryCount > 0 && (
                        <div>
                          <Text type="secondary">已重试: </Text>
                          <Text>{result.retryCount} 次</Text>
                        </div>
                      )}
                    </Space>
                  }
                  type={result.success || result.isScheduled ? 'success' : 'error'}
                  showIcon
                  closable
                  onClose={() => {
                    setResult(null);
                    if (!result.success) {
                      setLastPublishResult(null);
                    }
                  }}
                  style={{ borderRadius: 12 }}
                />
              )}
            </div>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default Publish;
