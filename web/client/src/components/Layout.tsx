import React from 'react';
import { Layout, Menu, Typography, Dropdown, Avatar, Space, Button } from 'antd';
import {
  SettingOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onMenuClick: (key: string) => void;
}

const menuItems = [
  {
    key: 'ai',
    icon: <RobotOutlined />,
    label: 'AI 创作',
  },
  {
    key: 'auth',
    icon: <SettingOutlined />,
    label: '认证配置',
  },
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

const AppLayout: React.FC<LayoutProps> = ({ children, currentPage, onMenuClick }) => {
  const { user, logout } = useAuth();

  const userMenuItems = [
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
      onClick: logout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      {/* 固定顶部导航 */}
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Title level={4} style={{ margin: 0 }}>
          ClawOperations - 抖音发布工具
        </Title>
        <Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
              <Space>
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: '#1890ff' }}
                />
                <Text>{user?.username || '用户'}</Text>
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      {/* 主体区域 */}
      <Layout style={{ marginTop: 64, width: '100%' }}>
        {/* 固定侧边栏 */}
        <Sider 
          width={200} 
          style={{ 
            background: '#fff',
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            zIndex: 99,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => onMenuClick(key)}
          />
        </Sider>

        {/* 内容区域 - 填满整个可用宽度 */}
        <Content
          style={{
            marginLeft: 200,
            width: 'calc(100% - 200px)',
            background: '#f0f2f5',
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          <div style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            minHeight: 'calc(100vh - 112px)',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
