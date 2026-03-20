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
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { publishApi, uploadApi } from '../api/client';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;
const ACCEPTED_FORMATS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];

const Publish: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [publishing, setPublishing] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [inputHashtag, setInputHashtag] = useState('');
  const [result, setResult] = useState<any>(null);

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
        setHashtags([]);
        setResult(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setCurrentStep(0);
        message.success('表单已重置');
      },
    });
  };

  const handlePublish = async (values: any) => {
    if (fileList.length === 0 && !values.videoUrl) {
      message.error('请上传视频文件或输入视频 URL');
      return;
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

    try {
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
        
        if (response.data.data.success) {
          message.success('视频发布成功！');
        } else {
          message.error(response.data.data.error || '发布失败');
        }
        setResult(response.data.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
      setResult({ success: false, error: error.response?.data?.error || '未知错误' });
    } finally {
      setPublishing(false);
    }
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
          items={[
            { title: '上传视频', icon: <CloudUploadOutlined /> },
            { title: '填写信息', icon: <FileTextOutlined /> },
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
            {/* 步骤 1: 上传视频 */}
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
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {uploadStatus === 'uploading' && '正在上传视频...'}
                    {uploadStatus === 'success' && '上传完成'}
                    {uploadStatus === 'error' && '上传失败，请重试'}
                  </Text>
                </div>
              )}

              {fileList.length > 0 && fileList[0].size && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: '#f5f7fa',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text>{fileList[0].name}</Text>
                  </Space>
                  <Text type="secondary">{formatFileSize(fileList[0].size)}</Text>
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
                    <Input placeholder="输入视频标题（最多 55 字符）" showCount maxLength={55} />
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
                      placeholder="输入视频描述（最多 300 字符）"
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
                      ? '视频上传中...'
                      : publishing
                        ? '发布中...'
                        : scheduleMode
                          ? '创建定时任务'
                          : '立即发布'}
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
                      {result.error && (
                        <Text type="danger">{result.error}</Text>
                      )}
                    </Space>
                  }
                  type={result.success || result.isScheduled ? 'success' : 'error'}
                  showIcon
                  closable
                  onClose={() => setResult(null)}
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
