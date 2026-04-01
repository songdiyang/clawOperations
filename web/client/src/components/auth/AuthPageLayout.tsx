import React from 'react';
import { Row, Col, Typography } from 'antd';
import {
  RobotOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const features = [
  {
    icon: <RobotOutlined style={{ fontSize: 28 }} />,
    title: 'AI 智能创作',
    description: '输入需求，自动生成视频内容和发布文案',
  },
  {
    icon: <VideoCameraOutlined style={{ fontSize: 28 }} />,
    title: '一键发布抖音',
    description: '视频直接发布到抖音平台，省时省力',
  },
  {
    icon: <ClockCircleOutlined style={{ fontSize: 28 }} />,
    title: '定时发布管理',
    description: '设定发布时间，自动执行任务',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 28 }} />,
    title: '高效批量处理',
    description: '批量生成和发布，提升操作效率',
  },
];

interface AuthPageLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 50%, #91caff 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <RobotOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>

          <Title level={1} style={{ color: '#fff', marginBottom: 16, fontSize: 36 }}>
            ClawOperations
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginBottom: 48 }}>
            智能视频创作与发布平台
          </Paragraph>

          <Row gutter={[24, 24]}>
            {features.map((feature, index) => (
              <Col span={12} key={index}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: '24px 16px',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'left',
                    height: '100%',
                  }}
                >
                  <div style={{ color: '#fff', marginBottom: 12 }}>
                    {feature.icon}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4, fontSize: 15 }}>
                    {feature.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>
                    {feature.description}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      <div
        style={{
          width: 480,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8, color: '#1f2937' }}>
              {title}
            </Title>
            <div style={{ color: '#6b7280', fontSize: 15 }}>
              {subtitle}
            </div>
          </div>

          {children}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          &copy; 2024 ClawOperations. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthPageLayout;
