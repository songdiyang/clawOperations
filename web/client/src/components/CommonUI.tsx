import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: React.ReactNode;
}

/**
 * 统一的页面标题组件
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, extra }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: '#1f2937',
            lineHeight: 1.4,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: 14,
              color: '#6b7280',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

/**
 * 数据统计卡片组件
 */
export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color = '#1677ff',
  bgColor = '#e6f4ff',
  trend,
}) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        border: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#1f2937',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
          {trend && (
            <span
              style={{
                fontSize: 13,
                color: trend.isUp ? '#52c41a' : '#ff4d4f',
              }}
            >
              {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#6b7280',
            marginTop: 2,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

interface StatusTagProps {
  status: 'pending' | 'processing' | 'success' | 'error' | 'default';
  text?: string;
}

/**
 * 状态标签组件
 */
export const StatusTag: React.FC<StatusTagProps> = ({ status, text }) => {
  const configs = {
    pending: { bg: '#e6f4ff', color: '#1677ff', label: '待处理' },
    processing: { bg: '#fff7e6', color: '#fa8c16', label: '处理中' },
    success: { bg: '#f6ffed', color: '#52c41a', label: '成功' },
    error: { bg: '#fff2f0', color: '#ff4d4f', label: '失败' },
    default: { bg: '#f5f5f5', color: '#8c8c8c', label: '默认' },
  };

  const config = configs[status] || configs.default;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        background: config.bg,
        color: config.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: config.color,
        }}
      />
      {text || config.label}
    </span>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * 空状态占位组件
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无数据',
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: 80,
            height: 80,
            background: '#f5f7fa',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 36,
            color: '#d1d5db',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: '#1f2937',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            color: '#6b7280',
            maxWidth: 320,
            marginBottom: action ? 24 : 0,
          }}
        >
          {description}
        </div>
      )}
      {action}
    </div>
  );
};

interface ContentCardProps {
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

/**
 * 内容卡片组件
 */
export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  extra,
  children,
  noPadding = false,
}) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: '#1f2937',
            }}
          >
            {title}
          </h3>
          {extra}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : 24 }}>{children}</div>
    </div>
  );
};
