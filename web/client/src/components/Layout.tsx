import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  SettingOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onMenuClick: (key: string) => void;
}

const menuItems = [
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
  return (
    <Layout style={{ minHeight: '100vh' }}>
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
      }}>
        <Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
          🦞 ClawOperations - 抖音发布工具
        </Title>
      </Header>

      {/* 主体区域 */}
      <Layout style={{ marginTop: 64 }}>
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

        {/* 内容区域 - 关键修复：设置 marginLeft 和正确的宽度计算 */}
        <Content
          style={{
            marginLeft: 200,
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
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
