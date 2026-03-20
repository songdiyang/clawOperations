import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  message,
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
  CheckCircleOutlined,
  TikTokOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../api/client';

const { Text } = Typography;

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEdit = () => {
    editForm.setFieldsValue({
      username: user?.username,
      email: user?.email,
      phone: user?.phone || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    editForm.resetFields();
  };

  const handleSave = async (values: { username: string; email: string; phone?: string }) => {
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
      message.error(error.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
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
      message.error(error.response?.data?.error || '修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const avatarUrl = user?.douyin_avatar || user?.avatar;
  const displayName = user?.douyin_nickname || user?.username || '用户';

  return (
    <div>
      <Row gutter={24}>
        {/* 左侧：用户卡片 + 基本信息 */}
        <Col xs={24} lg={14}>
          {/* 用户卡片 */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar
                size={80}
                src={avatarUrl}
                icon={!avatarUrl && <UserOutlined />}
                style={{
                  backgroundColor: avatarUrl ? 'transparent' : '#1677ff',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: 600, color: '#1f2937' }}>
                    {displayName}
                  </Text>
                  <Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>
                    {user?.role === 'admin' ? '管理员' : '用户'}
                  </Tag>
                  <Tag color={user?.is_active ? 'success' : 'error'}>
                    {user?.is_active ? '正常' : '已禁用'}
                  </Tag>
                </div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>
                  <Space split={<span style={{ color: '#d1d5db' }}>·</span>}>
                    {user?.email && <span>{user.email}</span>}
                    <span>注册于 {formatDate(user?.created_at)}</span>
                  </Space>
                </div>
                {user?.douyin_open_id && (
                  <div style={{ marginTop: 12 }}>
                    <Tag icon={<TikTokOutlined />} color="default">
                      已绑定抖音账号
                    </Tag>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 基本信息 */}
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: '#1677ff' }} />
                <span>基本信息</span>
              </Space>
            }
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
              <Row gutter={[24, 20]}>
                <Col xs={24} sm={12}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>用户名</div>
                  <div style={{ fontWeight: 500 }}>{user?.username || '-'}</div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>邮箱</div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MailOutlined style={{ color: '#9ca3af' }} />
                    {user?.email || '-'}
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>手机号</div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PhoneOutlined style={{ color: '#9ca3af' }} />
                    {user?.phone || '未设置'}
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>抖音昵称</div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TikTokOutlined style={{ color: '#9ca3af' }} />
                    {user?.douyin_nickname || '未绑定'}
                  </div>
                </Col>
              </Row>
            ) : (
              <Form form={editForm} layout="vertical" onFinish={handleSave}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, max: 20, message: '用户名长度为 3-20 位' },
                        { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
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
                  rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="可选" />
                </Form.Item>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                    保存
                  </Button>
                  <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                    取消
                  </Button>
                </div>
              </Form>
            )}
          </Card>
        </Col>

        {/* 右侧：安全设置 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <SafetyOutlined style={{ color: '#52c41a' }} />
                <span>安全设置</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            {/* 修改密码 */}
            <div
              style={{
                padding: '16px',
                background: '#f5f7fa',
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>登录密码</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    定期更换密码可以提高账户安全性
                  </div>
                </div>
                <Button icon={<LockOutlined />} onClick={() => setIsChangingPassword(true)}>
                  修改
                </Button>
              </div>
            </div>

            {/* 账号绑定 */}
            <div
              style={{
                padding: '16px',
                background: '#f5f7fa',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: '#000',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TikTokOutlined style={{ color: '#fff', fontSize: 20 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>抖音账号</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {user?.douyin_nickname || '未绑定'}
                    </div>
                  </div>
                </div>
                {user?.douyin_open_id ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已绑定
                  </Tag>
                ) : (
                  <Button type="primary" size="small">
                    绑定
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* 安全提示 */}
          <Card
            title="安全提示"
            size="small"
            style={{ background: '#fafafa', border: '1px dashed #e5e7eb' }}
          >
            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', lineHeight: 2 }}>
              <li>密码应包含字母和数字，至少 8 位</li>
              <li>不要在多个平台使用相同密码</li>
              <li>定期检查账户活动记录</li>
              <li>如发现异常请及时修改密码</li>
            </ul>
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
        width={400}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
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
              { pattern: /(?=.*[a-zA-Z])(?=.*[0-9])/, message: '密码必须包含字母和数字' },
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => { setIsChangingPassword(false); passwordForm.resetFields(); }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              确认修改
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
