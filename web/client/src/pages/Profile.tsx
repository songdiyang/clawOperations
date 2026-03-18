import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Descriptions,
  Tag,
  Row,
  Col,
  Avatar,
  Modal,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../api/client';

const { Title, Text, Paragraph } = Typography;

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 开始编辑
  const handleEdit = () => {
    editForm.setFieldsValue({
      username: user?.username,
      email: user?.email,
      phone: user?.phone || '',
    });
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    editForm.resetFields();
  };

  // 保存用户信息
  const handleSave = async (values: {
    username: string;
    email: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      const response = await userApi.updateProfile(values);
      if (response.data.success) {
        updateUser(response.data.data);
        message.success('保存成功');
        setIsEditing(false);
      } else {
        message.error(response.data.error || '保存失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: {
    oldPassword: string;
    newPassword: string;
  }) => {
    setPasswordLoading(true);
    try {
      const response = await userApi.changePassword(values);
      if (response.data.success) {
        message.success('密码修改成功');
        setIsChangingPassword(false);
        passwordForm.resetFields();
      } else {
        message.error(response.data.error || '修改失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '修改失败，请重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div style={{ width: '100%' }}>
      <Title level={3}>
        <UserOutlined style={{ marginRight: 8 }} />
        个人中心
      </Title>
      <Paragraph type="secondary">
        管理您的账户信息和安全设置
      </Paragraph>

      <Divider />

      <Row gutter={24}>
        {/* 左侧：用户信息 */}
        <Col xs={24} lg={14}>
          <Card
            title="基本信息"
            extra={
              !isEditing ? (
                <Button icon={<EditOutlined />} onClick={handleEdit}>
                  编辑
                </Button>
              ) : null
            }
            style={{ marginBottom: 24 }}
          >
            {!isEditing ? (
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="用户名">
                  <Space>
                    <Avatar
                      size="small"
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    {user?.username}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  <Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>
                    {user?.role === 'admin' ? '管理员' : '普通用户'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  <Space>
                    <MailOutlined />
                    {user?.email}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  <Space>
                    <PhoneOutlined />
                    {user?.phone || '-'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="账号状态">
                  <Tag color={user?.is_active ? 'success' : 'error'}>
                    {user?.is_active ? '正常' : '已禁用'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {formatDate(user?.created_at)}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Form
                form={editForm}
                layout="vertical"
                onFinish={handleSave}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, max: 20, message: '用户名长度为 3-20 位' },
                        {
                          pattern: /^[a-zA-Z0-9_]+$/,
                          message: '用户名只能包含字母、数字和下划线',
                        },
                      ]}
                    >
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name="phone"
                  label="手机号"
                  rules={[
                    {
                      pattern: /^1[3-9]\d{9}$/,
                      message: '请输入有效的手机号',
                    },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="可选" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SaveOutlined />}
                    >
                      保存
                    </Button>
                    <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}
          </Card>
        </Col>

        {/* 右侧：安全设置 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <SafetyOutlined />
                安全设置
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong>修改密码</Text>
              <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
                定期更换密码可以提高账户安全性
              </Paragraph>
              <Button
                icon={<LockOutlined />}
                onClick={() => setIsChangingPassword(true)}
              >
                修改密码
              </Button>
            </div>

            <Divider />

            <div>
              <Text strong>账户安全提示</Text>
              <ul style={{ paddingLeft: 20, marginTop: 8, color: '#666' }}>
                <li>密码应包含字母和数字，至少 8 位</li>
                <li>不要在多个平台使用相同密码</li>
                <li>定期检查账户活动记录</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={isChangingPassword}
        onCancel={() => {
          setIsChangingPassword(false);
          passwordForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少 8 位' },
              {
                pattern: /(?=.*[a-zA-Z])(?=.*[0-9])/,
                message: '密码必须包含字母和数字',
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="至少 8 位，包含字母和数字" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsChangingPassword(false);
                  passwordForm.resetFields();
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
              >
                确认修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
