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

// 简约紧致风格主题配置
const compactTheme = {
  token: {
    // 主色调
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    // 背景色 - 柔和
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8f9fb',
    colorBgElevated: '#ffffff',
    // 文字色
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
    colorTextQuaternary: '#d1d5db',
    // 边框色 - 更淡
    colorBorder: '#ebeef2',
    colorBorderSecondary: '#f3f4f6',
    // 圆角 - 更小
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    // 字体 - 更小
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 13,
    // 间距 - 更紧凑
    padding: 12,
    paddingLG: 16,
    paddingSM: 10,
    paddingXS: 6,
    // 线条
    lineWidth: 1,
    // 阴影 - 更轻
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 48,
      headerPadding: '0 16px',
      siderBg: '#ffffff',
      bodyBg: '#f8f9fb',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f4ff',
      itemSelectedColor: '#1677ff',
      itemHoverBg: '#f5f5f5',
      iconSize: 16,
      itemHeight: 36,
      itemMarginBlock: 2,
      itemMarginInline: 6,
      itemBorderRadius: 6,
      fontSize: 13,
    },
    Card: {
      headerBg: 'transparent',
      paddingLG: 16,
      headerFontSize: 14,
    },
    Button: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
      paddingContentHorizontal: 14,
      fontSize: 13,
    },
    Input: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
    },
    Select: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#1f2937',
      rowHoverBg: '#f8f9fb',
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      headerSplitColor: '#f0f0f0',
      fontSize: 13,
    },
    Form: {
      itemMarginBottom: 16,
      labelFontSize: 13,
    },
    Tabs: {
      horizontalItemPadding: '10px 16px',
      titleFontSize: 13,
    },
    Alert: {
      fontSize: 13,
    },
    Modal: {
      titleFontSize: 15,
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
    <ConfigProvider locale={zhCN} theme={compactTheme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
