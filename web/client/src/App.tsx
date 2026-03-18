import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import AuthConfig from './pages/AuthConfig';
import Publish from './pages/Publish';
import TaskList from './pages/TaskList';
import './App.css';

type PageType = 'auth' | 'publish' | 'tasks';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('auth');

  const renderPage = () => {
    switch (currentPage) {
      case 'auth':
        return <AuthConfig />;
      case 'publish':
        return <Publish />;
      case 'tasks':
        return <TaskList />;
      default:
        return <AuthConfig />;
    }
  };

  return (
    <ConfigProvider locale={zhCN}>
      <AppLayout currentPage={currentPage} onMenuClick={(key) => setCurrentPage(key as PageType)}>
        {renderPage()}
      </AppLayout>
    </ConfigProvider>
  );
}

export default App;
