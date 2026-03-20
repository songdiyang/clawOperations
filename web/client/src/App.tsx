import { useState } from 'react';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout';
import AuthConfig from './pages/AuthConfig';
import Publish from './pages/Publish';
import TaskList from './pages/TaskList';
import AICreator from './pages/AICreator';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './App.css';

// 专业商务风格主题配置
const businessTheme = {
  token: {
    // 主色调
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    // 背景色
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f7fa',
    colorBgElevated: '#ffffff',
    // 文字色
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
    colorTextQuaternary: '#d1d5db',
    // 边框色
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f0f0f0',
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    // 字体
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    // 线条
    lineWidth: 1,
    // 阴影
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#ffffff',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f4ff',
      itemSelectedColor: '#1677ff',
      itemHoverBg: '#f5f5f5',
      iconSize: 18,
      itemHeight: 48,
      itemMarginBlock: 4,
      itemMarginInline: 8,
      itemBorderRadius: 8,
    },
    Card: {
      headerBg: 'transparent',
      paddingLG: 24,
    },
    Button: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingContentHorizontal: 20,
    },
    Input: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    Select: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#1f2937',
      rowHoverBg: '#f5f7fa',
    },
  },
};

type PageType = 'ai' | 'auth' | 'publish' | 'tasks' | 'profile';

// 开发模式状态键
const DEV_MODE_KEY = 'clawops_dev_mode';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('ai');
  const [devMode, setDevMode] = useState(() => {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  });
  const { isAuthenticated, isLoading } = useAuth();

  // 进入开发模式
  const enterDevMode = () => {
    localStorage.setItem(DEV_MODE_KEY, 'true');
    setDevMode(true);
  };

  // 退出开发模式
  const exitDevMode = () => {
    localStorage.removeItem(DEV_MODE_KEY);
    setDevMode(false);
  };

  // 加载中显示 loading
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录且非开发模式，显示登录页面
  if (!isAuthenticated && !devMode) {
    return <Login onDevModeEnter={enterDevMode} />;
  }

  // 已登录显示主应用

  const renderPage = () => {
    switch (currentPage) {
      case 'ai':
        return <AICreator />;
      case 'auth':
        return <AuthConfig />;
      case 'publish':
        return <Publish />;
      case 'tasks':
        return <TaskList />;
      case 'profile':
        return <Profile />;
      default:
        return <AICreator />;
    }
  };

  return (
    <AppLayout 
      currentPage={currentPage} 
      onMenuClick={(key) => setCurrentPage(key as PageType)}
      isDevMode={devMode}
      onExitDevMode={exitDevMode}
    >
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={businessTheme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
