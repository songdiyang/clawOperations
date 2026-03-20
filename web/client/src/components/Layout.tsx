import React, { useState } from 'react';
import { Layout, Menu, Typography, Dropdown, Avatar, Space, Button, Tag, Tooltip } from 'antd';
import {
  SettingOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  BellOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onMenuClick: (key: string) => void;
  isDevMode?: boolean;
  onExitDevMode?: () => void;
}

// 页面标题映射
const pageTitles: Record<string, string> = {
  ai: 'AI 创作',
  auth: '认证配置',
  publish: '视频发布',
  tasks: '任务管理',
  profile: '个人中心',
};

const AppLayout: React.FC<LayoutProps> = ({ children, currentPage, onMenuClick, isDevMode, onExitDevMode }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // 菜单项：开发模式下显示认证配置
  const menuItems = [
    {
      key: 'ai',
      icon: <RobotOutlined />,
      label: 'AI 创作',
    },
    // 开发模式下显示认证配置
    ...(isDevMode ? [{
      key: 'auth',
      icon: <SettingOutlined />,
      label: '认证配置',
    }] : []),
    {
      key: 'publish',
      icon: <VideoCameraOutlined />,
      label: '视频发布',
    },
    {
      key: 'tasks',
      icon: <UnorderedListOutlined />,
      label: '任务管理',
    },
  ];

  const userMenuItems = isDevMode ? [
    {
      key: 'exit-dev',
      icon: <LogoutOutlined />,
      label: '退出开发模式',
      onClick: onExitDevMode,
    },
  ] : [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => onMenuClick('profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ];

  const displayName = isDevMode ? '开发者' : (user?.douyin_nickname || user?.username || '用户');
  const avatarUrl = user?.douyin_avatar || user?.avatar;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 左侧：Logo + 折叠按钮 */}
        <Space size={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/logo.svg" 
              alt="ClawOperations" 
              style={{ width: 36, height: 36, borderRadius: 8 }}
            />
            <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
              ClawOperations
            </Text>
          </div>
          
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          
          {isDevMode && (
            <Tag color="orange" icon={<ExperimentOutlined />}>
              开发模式
            </Tag>
          )}
        </Space>

        {/* 右侧：功能按钮 + 用户信息 */}
        <Space size={8}>
          <Tooltip title="帮助文档">
            <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: '#6b7280' }} />
          </Tooltip>
          <Tooltip title="消息通知">
            <Button type="text" icon={<BellOutlined />} style={{ color: '#6b7280' }} />
          </Tooltip>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 8px' }} />
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button 
              type="text" 
              style={{ 
                height: 'auto', 
                padding: '6px 12px',
                borderRadius: 8,
              }}
            >
              <Space size={8}>
                <Avatar 
                  size={32}
                  src={avatarUrl}
                  icon={!avatarUrl && <UserOutlined />}
                  style={{ 
                    backgroundColor: avatarUrl ? 'transparent' : '#1677ff',
                  }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {isDevMode ? '调试账户' : '已登录'}
                  </div>
                </div>
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      {/* 主体区域 */}
      <Layout style={{ marginTop: 64 }}>
        {/* 侧边栏 */}
        <Sider
          width={220}
          collapsedWidth={80}
          collapsed={collapsed}
          style={{
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            background: '#fff',
            borderRight: '1px solid #e5e7eb',
            overflow: 'auto',
            zIndex: 99,
          }}
        >
          <div style={{ padding: '16px 0' }}>
            <Menu
              mode="inline"
              selectedKeys={[currentPage]}
              items={menuItems}
              onClick={({ key }) => onMenuClick(key)}
              style={{ 
                border: 'none',
                background: 'transparent',
              }}
            />
          </div>
          
          {/* 侧边栏底部 */}
          {!collapsed && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  background: '#f5f7fa',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  快捷帮助
                </div>
                <div>
                  AI 创作: 输入需求自动生成
                </div>
                <div>
                  视频发布: 上传视频到抖音
                </div>
              </div>
            </div>
          )}
        </Sider>

        {/* 内容区域 */}
        <Content
          style={{
            marginLeft: collapsed ? 80 : 220,
            minHeight: 'calc(100vh - 64px)',
            background: '#f5f7fa',
            padding: 24,
            transition: 'margin-left 0.2s ease',
          }}
        >
          {/* 页面头部 */}
          <div style={{ marginBottom: 24 }}>
            {/* 面包屑 */}
            <div style={{ marginBottom: 8 }}>
              <Space size={4} style={{ fontSize: 13, color: '#9ca3af' }}>
                <HomeOutlined />
                <span>/</span>
                <span style={{ color: '#6b7280' }}>{pageTitles[currentPage] || currentPage}</span>
              </Space>
            </div>
            {/* 页面标题 */}
            <h1 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 600, 
              color: '#1f2937',
            }}>
              {pageTitles[currentPage] || currentPage}
            </h1>
          </div>
          
          {/* 页面内容 */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              minHeight: 'calc(100vh - 200px)',
              border: '1px solid #e5e7eb',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
