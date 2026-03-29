/**
 * 模板选择器组件
 * 展示和管理创作模板
 */

import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  Card, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Empty, 
  Popconfirm,
  message,
  Spin,
  Input,
  Modal,
  Form,
  Select,
  Upload,
  Image,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  TagOutlined,
  FireOutlined,
  PictureOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { aiApi } from '../../api/client';

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface Template {
  id: string;
  name: string;
  description?: string;
  requirement: string;
  contentTypePreference?: 'image' | 'video' | 'auto';
  tags: string[];
  usageCount: number;
  updatedAt: string;
  referenceImageUrl?: string;  // 参考图 URL
}

interface TemplateSelectorProps {
  visible: boolean;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
  initialRequirement?: string;  // 用于创建新模板
}

// 内容类型标签颜色
const CONTENT_TYPE_COLORS: Record<string, string> = {
  image: 'blue',
  video: 'purple',
  auto: 'default',
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  visible,
  onClose,
  onUseTemplate,
  initialRequirement,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [referenceImageFile, setReferenceImageFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 加载模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await aiApi.getTemplates();
      if (response.data.success) {
        setTemplates(response.data.data);
        setFilteredTemplates(response.data.data);
      }
    } catch (error: any) {
      message.error('加载模板失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  // 搜索过滤
  useEffect(() => {
    if (!searchText) {
      setFilteredTemplates(templates);
    } else {
      const lower = searchText.toLowerCase();
      setFilteredTemplates(
        templates.filter(t => 
          t.name.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower) ||
          t.requirement.toLowerCase().includes(lower) ||
          t.tags.some(tag => tag.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchText, templates]);

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      const response = await aiApi.deleteTemplate(id);
      if (response.data.success) {
        message.success('模板已删除');
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 使用模板
  const handleUse = async (template: Template) => {
    try {
      await aiApi.useTemplate(template.id);
      onUseTemplate(template);
      onClose();
    } catch (error: any) {
      message.error('使用模板失败: ' + (error.message || '未知错误'));
    }
  };

  // 创建模板
  const handleCreate = async (values: any) => {
    try {
      // 如果有参考图，先上传图片
      let referenceImageUrl: string | undefined;
      if (referenceImageFile?.originFileObj) {
        const formData = new FormData();
        formData.append('file', referenceImageFile.originFileObj);
        const uploadResponse = await aiApi.uploadReferenceImage(formData);
        if (uploadResponse.data.success) {
          referenceImageUrl = uploadResponse.data.data.url;
        }
      }

      const response = await aiApi.createTemplate({
        name: values.name,
        description: values.description,
        requirement: values.requirement,
        contentTypePreference: values.contentTypePreference,
        tags: values.tags || [],
        referenceImageUrl,
      });
      
      if (response.data.success) {
        message.success('模板创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        setReferenceImageFile(null);
        setPreviewUrl('');
        loadTemplates();
      }
    } catch (error: any) {
      message.error('创建失败: ' + (error.message || '未知错误'));
    }
  };

  // 打开创建模板弹窗
  const openCreateModal = () => {
    form.setFieldsValue({
      requirement: initialRequirement || '',
      contentTypePreference: 'auto',
      tags: [],
    });
    setReferenceImageFile(null);
    setPreviewUrl('');
    setCreateModalVisible(true);
  };

  // 参考图上传配置
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过 5MB');
        return false;
      }
      // 生成预览 URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setReferenceImageFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        originFileObj: file,
      } as UploadFile);
      return false; // 阻止自动上传
    },
    showUploadList: false,
    accept: 'image/*',
  };

  // 移除参考图
  const handleRemoveReferenceImage = () => {
    setReferenceImageFile(null);
    setPreviewUrl('');
  };

  return (
    <>
      <Drawer
        title={
          <Space>
            <AppstoreOutlined />
            <span>创作模板</span>
            <Tag color="blue">{templates.length}</Tag>
          </Space>
        }
        placement="right"
        width={450}
        open={visible}
        onClose={onClose}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            新建模板
          </Button>
        }
      >
        {/* 搜索框 */}
        <Search
          placeholder="搜索模板名称、描述或标签"
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        <Spin spinning={loading}>
          {filteredTemplates.length === 0 ? (
            <Empty 
              description={searchText ? '未找到匹配的模板' : '暂无模板'} 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {!searchText && (
                <Button type="primary" onClick={openCreateModal}>
                  创建第一个模板
                </Button>
              )}
            </Empty>
          ) : (
            <List
              dataSource={filteredTemplates}
              renderItem={(template) => (
                <Card
                  size="small"
                  style={{ marginBottom: 12 }}
                  hoverable
                >
                  {/* 标题和使用次数 */}
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong>{template.name}</Text>
                    <Space size="small">
                      <FireOutlined style={{ color: '#ff4d4f' }} />
                      <Text type="secondary">{template.usageCount}</Text>
                    </Space>
                  </Space>
                  
                  {/* 描述 */}
                  {template.description && (
                    <Paragraph
                      ellipsis={{ rows: 1 }}
                      type="secondary"
                      style={{ marginBottom: 8, fontSize: 12 }}
                    >
                      {template.description}
                    </Paragraph>
                  )}
                  
                  {/* 需求预览 */}
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 8, fontSize: 13 }}
                  >
                    {template.requirement}
                  </Paragraph>
                  
                  {/* 标签 */}
                  <Space size="small" wrap style={{ marginBottom: 8 }}>
                    {template.contentTypePreference && template.contentTypePreference !== 'auto' && (
                      <Tag color={CONTENT_TYPE_COLORS[template.contentTypePreference]}>
                        {template.contentTypePreference === 'image' ? '图片' : '视频'}
                      </Tag>
                    )}
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <Tag key={idx} icon={<TagOutlined />}>{tag}</Tag>
                    ))}
                    {template.tags.length > 3 && (
                      <Tag>+{template.tags.length - 3}</Tag>
                    )}
                  </Space>
                  
                  {/* 操作按钮 */}
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Popconfirm
                      title="确定删除这个模板吗？"
                      onConfirm={() => handleDelete(template.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleUse(template)}
                    >
                      使用模板
                    </Button>
                  </Space>
                </Card>
              )}
            />
          )}
        </Spin>
      </Drawer>

      {/* 创建模板弹窗 */}
      <Modal
        title="创建新模板"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如：美食推广模板" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="模板描述"
          >
            <Input.TextArea 
              placeholder="简要描述模板的用途" 
              rows={2}
            />
          </Form.Item>
          
          <Form.Item
            name="requirement"
            label="需求描述"
            rules={[{ required: true, message: '请输入需求描述' }]}
          >
            <Input.TextArea 
              placeholder="输入创作需求" 
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            name="contentTypePreference"
            label="内容类型偏好"
          >
            <Select>
              <Select.Option value="auto">自动识别</Select.Option>
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="video">视频</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签并按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          {/* 参考图上传 */}
          <Form.Item
            label="参考图"
            extra="上传参考图，AI 将根据此图生成相似风格的内容"
          >
            {previewUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Image
                  src={previewUrl}
                  alt="参考图预览"
                  style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8 }}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={handleRemoveReferenceImage}
                  style={{ 
                    position: 'absolute', 
                    top: -8, 
                    right: -8, 
                    background: '#fff',
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
            ) : (
              <Upload {...uploadProps}>
                <Button icon={<PictureOutlined />}>上传参考图</Button>
              </Upload>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TemplateSelector;
