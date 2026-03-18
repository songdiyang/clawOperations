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
  Divider,
  Row,
  Col,
} from 'antd';
import { InboxOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { publishApi, uploadApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const Publish: React.FC = () => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [inputHashtag, setInputHashtag] = useState('');
  const [result, setResult] = useState<any>(null);

  // 处理文件上传
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const response = await uploadApi.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      
      message.success('视频上传成功');
      return response.data.data.videoId;
    } catch (error: any) {
      message.error(error.response?.data?.error || '上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // 添加 hashtag
  const handleAddHashtag = () => {
    if (!inputHashtag.trim()) return;
    if (hashtags.length >= 5) {
      message.warning('最多只能添加 5 个话题标签');
      return;
    }
    if (hashtags.includes(inputHashtag.trim())) {
      message.warning('该标签已存在');
      return;
    }
    setHashtags([...hashtags, inputHashtag.trim()]);
    setInputHashtag('');
  };

  // 删除 hashtag
  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  // 发布视频
  const handlePublish = async (values: any) => {
    if (fileList.length === 0 && !values.videoUrl) {
      message.error('请上传视频或输入视频 URL');
      return;
    }

    setPublishing(true);
    setResult(null);

    try {
      let videoPath = values.videoUrl;
      let isRemoteUrl = !!values.videoUrl;

      // 如果有上传的文件，先上传
      if (fileList.length > 0 && fileList[0].originFileObj) {
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
        // 定时发布
        const response = await publishApi.schedule({
          videoPath,
          publishTime: values.publishTime.toISOString(),
          options,
          isRemoteUrl,
        });
        message.success('定时任务已创建');
        setResult(response.data.data);
      } else {
        // 立即发布
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
      message.error(error.response?.data?.error || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <Title level={3}>视频发布</Title>
      <Text type="secondary">上传视频并发布到抖音，支持定时发布</Text>

      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handlePublish}
        autoComplete="off"
      >
        {/* 视频上传 */}
        <Card title="视频上传" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Dragger
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                beforeUpload={() => false}
                accept=".mp4,.mov,.avi"
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽视频文件到此处上传</p>
                <p className="ant-upload-hint">
                  支持 MP4、MOV、AVI 格式，文件大小不超过 4GB
                </p>
              </Dragger>
              
              {uploading && (
                <Progress percent={uploadProgress} status="active" style={{ marginTop: 16 }} />
              )}
            </Col>
            
            <Col span={12}>
              <Form.Item label="或输入视频 URL" name="videoUrl">
                <Input placeholder="https://example.com/video.mp4" />
              </Form.Item>
              <Text type="secondary">
                如果填写了 URL，将优先使用 URL 而不是上传的文件
              </Text>
            </Col>
          </Row>
        </Card>

        {/* 发布内容 */}
        <Card title="发布内容" style={{ marginBottom: 24 }}>
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { max: 55, message: '标题最多 55 个字符' },
            ]}
          >
            <Input placeholder="输入视频标题（最多 55 字符）" showCount maxLength={55} />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[
              { max: 300, message: '描述最多 300 个字符' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="输入视频描述（最多 300 字符）"
              showCount
              maxLength={300}
            />
          </Form.Item>

          <Form.Item label="话题标签 (最多 5 个)">
            <Space style={{ marginBottom: 8 }}>
              {hashtags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleRemoveHashtag(tag)}
                >
                  #{tag}
                </Tag>
              ))}
            </Space>
            <Space>
              <Input
                placeholder="输入标签"
                value={inputHashtag}
                onChange={(e) => setInputHashtag(e.target.value)}
                onPressEnter={handleAddHashtag}
                style={{ width: 150 }}
              />
              <Button icon={<PlusOutlined />} onClick={handleAddHashtag}>
                添加
              </Button>
            </Space>
          </Form.Item>

          <Form.Item label="@提及用户" name="atUsers">
            <Input placeholder="输入用户 OpenID，多个用逗号分隔" />
          </Form.Item>
        </Card>

        {/* 位置信息 */}
        <Card title="位置信息" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="POI ID" name="poiId">
                <Input placeholder="地理位置 POI ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="位置名称" name="poiName">
                <Input placeholder="如：武汉光谷" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 商业挂载 */}
        <Card title="商业挂载（可选）" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="小程序 ID" name="microAppId">
                <Input placeholder="小程序 ID" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="小程序标题" name="microAppTitle">
                <Input placeholder="小程序标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="小程序链接" name="microAppUrl">
                <Input placeholder="小程序链接" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="商品 ID" name="articleId">
            <Input placeholder="商品 ID（用于挂载商品链接）" />
          </Form.Item>
        </Card>

        {/* 发布设置 */}
        <Card title="发布设置" style={{ marginBottom: 24 }}>
          <Form.Item>
            <Space>
              <Switch
                checked={scheduleMode}
                onChange={setScheduleMode}
              />
              <Text>{scheduleMode ? '定时发布' : '立即发布'}</Text>
            </Space>
          </Form.Item>

          {scheduleMode && (
            <Form.Item
              label="发布时间"
              name="publishTime"
              rules={[{ required: true, message: '请选择发布时间' }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
        </Card>

        {/* 发布按钮 */}
        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={publishing || uploading}
            block
          >
            {scheduleMode ? '创建定时任务' : '立即发布'}
          </Button>
        </Form.Item>
      </Form>

      {/* 结果展示 */}
      {result && (
        <Alert
          message={result.success ? '发布成功' : '发布结果'}
          description={
            <Space direction="vertical">
              {result.videoId && <Text>视频 ID: {result.videoId}</Text>}
              {result.shareUrl && (
                <Text>
                  分享链接:{' '}
                  <a href={result.shareUrl} target="_blank" rel="noopener noreferrer">
                    {result.shareUrl}
                  </a>
                </Text>
              )}
              {result.taskId && <Text>任务 ID: {result.taskId}</Text>}
              {result.error && <Text type="danger">错误: {result.error}</Text>}
            </Space>
          }
          type={result.success ? 'success' : 'error'}
          showIcon
          style={{ marginTop: 24 }}
        />
      )}
    </div>
  );
};

export default Publish;
