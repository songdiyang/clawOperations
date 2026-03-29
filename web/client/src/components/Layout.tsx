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
      {/* 顶部导航 - 紧凑版 */}
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 48,
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #ebeef2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 左侧：Logo + 折叠按钮 */}
        <Space size={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img 
              src="/logo.svg" 
              alt="ClawOperations" 
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
            <Text strong style={{ fontSize: 15, color: '#1f2937' }}>
              ClawOperations
            </Text>
          </div>
          
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 14, width: 32, height: 32 }}
          />
          
          {isDevMode && (
            <Tag color="orange" icon={<ExperimentOutlined />} style={{ fontSize: 11, padding: '0 6px', lineHeight: '20px' }}>
              开发模式
            </Tag>
          )}
        </Space>

        {/* 右侧：功能按钮 + 用户信息 */}
        <Space size={4}>
          <Tooltip title="帮助文档">
            <Button type="text" size="small" icon={<QuestionCircleOutlined />} style={{ color: '#6b7280' }} />
          </Tooltip>
          <Tooltip title="消息通知">
            <Button type="text" size="small" icon={<BellOutlined />} style={{ color: '#6b7280' }} />
          </Tooltip>
          
          <div style={{ width: 1, height: 20, background: '#ebeef2', margin: '0 6px' }} />
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button 
              type="text" 
              size="small"
              style={{ 
                height: 'auto', 
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              <Space size={6}>
                <Avatar 
                  size={26}
                  src={avatarUrl}
                  icon={!avatarUrl && <UserOutlined />}
                  style={{ 
                    backgroundColor: avatarUrl ? 'transparent' : '#1677ff',
                  }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {isDevMode ? '调试账户' : '已登录'}
                  </div>
                </div>
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      {/* 主体区域 */}
      <Layout style={{ marginTop: 48 }}>
        {/* 侧边栏 - 紧凑版 */}
        <Sider
          width={180}
          collapsedWidth={56}
          collapsed={collapsed}
          style={{
            position: 'fixed',
            left: 0,
            top: 48,
            bottom: 0,
            background: '#fff',
            borderRight: '1px solid #ebeef2',
            overflow: 'auto',
            zIndex: 99,
          }}
        >
          <div style={{ padding: '8px 0' }}>
            <Menu
              mode="inline"
              selectedKeys={[currentPage]}
              items={menuItems}
              onClick={({ key }) => onMenuClick(key)}
              style={{ 
                border: 'none',
                background: 'transparent',
                fontSize: 13,
              }}
            />
          </div>
          
          {/* 侧边栏底部 - 简化版 */}
          {!collapsed && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  background: '#f8f9fb',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2, fontSize: 12 }}>
                  快捷帮助
                </div>
                <div>AI 创作: 输入需求自动生成</div>
                <div>视频发布: 上传视频到抖音</div>
              </div>
            </div>
          )}
        </Sider>

        {/* 内容区域 - 紧凑版 */}
        <Content
          style={{
            marginLeft: collapsed ? 56 : 180,
            minHeight: 'calc(100vh - 48px)',
            background: '#f8f9fb',
            padding: 16,
            transition: 'margin-left 0.2s ease',
          }}
        >
          {/* 页面头部 - 简化版 */}
          <div style={{ marginBottom: 16 }}>
            {/* 面包屑 */}
            <div style={{ marginBottom: 4 }}>
              <Space size={4} style={{ fontSize: 12, color: '#9ca3af' }}>
                <HomeOutlined />
                <span>/</span>
                <span style={{ color: '#6b7280' }}>{pageTitles[currentPage] || currentPage}</span>
              </Space>
            </div>
            {/* 页面标题 */}
            <h1 style={{ 
              margin: 0, 
              fontSize: 18, 
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
              borderRadius: 8,
              padding: 16,
              minHeight: 'calc(100vh - 180px)',
              border: '1px solid #ebeef2',
            }}
          >
            {children}
          </div>
          
          {/* 页脚备案信息 */}
          <div
            style={{
              textAlign: 'center',
              padding: '16px 0 8px',
              fontSize: 12,
              color: '#9ca3af',
            }}
          >
            <a 
              href="http://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#9ca3af', textDecoration: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1677ff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              鄂ICP备2024068122号-3
            </a>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
