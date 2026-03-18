import React, { useState } from 'react';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout';
import AuthConfig from './pages/AuthConfig';
import Publish from './pages/Publish';
import TaskList from './pages/TaskList';
import AICreator from './pages/AICreator';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import './App.css';

type PageType = 'ai' | 'auth' | 'publish' | 'tasks' | 'profile';
type AuthPageType = 'login' | 'register';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('ai');
  const [authPage, setAuthPage] = useState<AuthPageType>('login');
  const { isAuthenticated, isLoading } = useAuth();

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

  // 未登录显示登录/注册页面
  if (!isAuthenticated) {
    if (authPage === 'login') {
      return <Login onSwitchToRegister={() => setAuthPage('register')} />;
    }
    return <Register onSwitchToLogin={() => setAuthPage('login')} />;
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
    <AppLayout currentPage={currentPage} onMenuClick={(key) => setCurrentPage(key as PageType)}>
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
