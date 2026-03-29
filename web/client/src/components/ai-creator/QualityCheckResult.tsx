/**
 * 内容质量校验结果展示组件
 */

import React from 'react';
import {
  Card,
  Tag,
  Space,
  Progress,
  Collapse,
  Typography,
  Alert,
  Button,
  Tooltip,
  Divider,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  TagOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

// 问题分类映射
const CATEGORY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sensitive_word: { label: '敏感词风险', color: 'red', icon: <ExclamationCircleOutlined /> },
  brand_issue: { label: '品牌问题', color: 'orange', icon: <InfoCircleOutlined /> },
  platform_compliance: { label: '平台适配', color: 'blue', icon: <SafetyCertificateOutlined /> },
  content_structure: { label: '内容结构', color: 'purple', icon: <BulbOutlined /> },
  publish_suggestion: { label: '发布建议', color: 'cyan', icon: <ClockCircleOutlined /> },
};

// 严重等级映射
const SEVERITY_MAP: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  error: { color: 'red', text: '错误', icon: <CloseCircleOutlined /> },
  warning: { color: 'orange', text: '警告', icon: <ExclamationCircleOutlined /> },
  info: { color: 'blue', text: '建议', icon: <InfoCircleOutlined /> },
};

export interface QualityIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  original?: string;
  suggestion?: string;
  alternatives?: string[];
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  checkedAt: string;
  suggestedPublishTime?: string;
  suggestedTags?: string[];
}

interface QualityCheckResultProps {
  result: QualityCheckResult | null;
  loading?: boolean;
  onRecheck?: () => void;
  onRegenerateCopywriting?: () => void;  // 新增：重新生成文案回调
  onCopySuggestion?: (text: string) => void;
}

/**
 * 质量评分展示
 */
const ScoreDisplay: React.FC<{ score: number; passed: boolean }> = ({ score, passed }) => {
  const getScoreColor = () => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <Progress
        type="circle"
        percent={score}
        size={100}
        strokeColor={getScoreColor()}
        format={(percent) => (
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{percent}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>质量评分</div>
          </div>
        )}
      />
      <div style={{ marginTop: 12 }}>
        {passed ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            校验通过
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            存在问题
          </Tag>
        )}
      </div>
    </div>
  );
};

/**
 * 问题汇总展示
 */
const IssueSummary: React.FC<{ summary: QualityCheckResult['summary'] }> = ({ summary }) => {
  return (
    <Space size={16} style={{ width: '100%', justifyContent: 'center', padding: '8px 0' }}>
      <Tag color="red" style={{ padding: '4px 12px' }}>
        <CloseCircleOutlined /> {summary.errors} 个错误
      </Tag>
      <Tag color="orange" style={{ padding: '4px 12px' }}>
        <ExclamationCircleOutlined /> {summary.warnings} 个警告
      </Tag>
      <Tag color="blue" style={{ padding: '4px 12px' }}>
        <InfoCircleOutlined /> {summary.infos} 个建议
      </Tag>
    </Space>
  );
};

/**
 * 单个问题项展示
 */
const IssueItem: React.FC<{ 
  issue: QualityIssue; 
  onCopy?: (text: string) => void 
}> = ({ issue, onCopy }) => {
  const severity = SEVERITY_MAP[issue.severity];

  return (
    <div
      style={{
        padding: '12px',
        background: '#fafafa',
        borderRadius: 6,
        marginBottom: 8,
        borderLeft: `3px solid ${severity.color === 'red' ? '#ff4d4f' : severity.color === 'orange' ? '#faad14' : '#1677ff'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Tag color={severity.color} style={{ marginTop: 2 }}>
          {severity.icon} {severity.text}
        </Tag>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {issue.message}
          </div>
          
          {issue.location && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              位置: {issue.location}
            </Text>
          )}
          
          {issue.original && (
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>原文: </Text>
              <Tag color="default" style={{ fontSize: 12 }}>
                {issue.original}
              </Tag>
            </div>
          )}
          
          {issue.suggestion && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4 }}>
              <Text style={{ fontSize: 13 }}>
                <BulbOutlined style={{ color: '#1677ff', marginRight: 6 }} />
                {issue.suggestion}
              </Text>
            </div>
          )}
          
          {issue.alternatives && issue.alternatives.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>替代表达: </Text>
              <Space wrap size={4} style={{ marginTop: 4 }}>
                {issue.alternatives.map((alt, idx) => (
                  <Tooltip key={idx} title="点击复制">
                    <Tag
                      color="green"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onCopy?.(alt)}
                    >
                      {alt}
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 发布建议展示
 */
const PublishSuggestions: React.FC<{
  suggestedPublishTime?: string;
  suggestedTags?: string[];
  onCopy?: (text: string) => void;
}> = ({ suggestedPublishTime, suggestedTags, onCopy }) => {
  if (!suggestedPublishTime && (!suggestedTags || suggestedTags.length === 0)) {
    return null;
  }

  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 500, marginBottom: 12 }}>
        <BulbOutlined style={{ color: '#1677ff', marginRight: 8 }} />
        发布优化建议
      </div>
      
      {suggestedPublishTime && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            建议发布时间:
          </Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>
            {new Date(suggestedPublishTime).toLocaleString('zh-CN', {
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Tag>
        </div>
      )}
      
      {suggestedTags && suggestedTags.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <TagOutlined style={{ marginRight: 6 }} />
            建议补充标签:
          </Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap size={4}>
              {suggestedTags.map((tag, idx) => (
                <Tooltip key={idx} title="点击复制">
                  <Tag
                    color="cyan"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onCopy?.(`#${tag}`)}
                  >
                    #{tag}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
};

/**
 * 质量校验结果组件
 */
const QualityCheckResultDisplay: React.FC<QualityCheckResultProps> = ({
  result,
  loading = false,
  onRecheck,
  onRegenerateCopywriting,
  onCopySuggestion,
}) => {
  if (!result) {
    return (
      <Card>
        <Empty
          image={<SafetyCertificateOutlined style={{ fontSize: 48, color: '#9ca3af' }} />}
          description="暂无校验结果"
        >
          {onRecheck && (
            <Button type="primary" onClick={onRecheck} loading={loading}>
              开始校验
            </Button>
          )}
        </Empty>
      </Card>
    );
  }

  // 按分类分组问题
  const groupedIssues = result.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, QualityIssue[]>);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onCopySuggestion?.(text);
  };

  return (
    <Card
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          <span>内容质量校验</span>
          {result.passed ? (
            <Tag color="success">已通过</Tag>
          ) : (
            <Tag color="error">需优化</Tag>
          )}
        </Space>
      }
      extra={
        onRecheck && (
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={onRecheck}
            loading={loading}
          >
            重新校验
          </Button>
        )
      }
    >
      {/* 评分和汇总 */}
      <ScoreDisplay score={result.score} passed={result.passed} />
      <IssueSummary summary={result.summary} />
      
      <Divider style={{ margin: '16px 0' }} />
      
      {/* 问题列表 */}
      {result.issues.length > 0 ? (
        <Collapse
          defaultActiveKey={Object.keys(groupedIssues).filter(
            cat => groupedIssues[cat].some(i => i.severity === 'error')
          )}
          ghost
        >
          {Object.entries(groupedIssues).map(([category, issues]) => {
            const categoryInfo = CATEGORY_MAP[category] || { 
              label: category, 
              color: 'default', 
              icon: <InfoCircleOutlined /> 
            };
            const errorCount = issues.filter(i => i.severity === 'error').length;
            const warningCount = issues.filter(i => i.severity === 'warning').length;
            
            return (
              <Panel
                key={category}
                header={
                  <Space>
                    {categoryInfo.icon}
                    <span>{categoryInfo.label}</span>
                    <Tag color={categoryInfo.color}>{issues.length} 项</Tag>
                    {errorCount > 0 && <Tag color="red">{errorCount} 错误</Tag>}
                    {warningCount > 0 && <Tag color="orange">{warningCount} 警告</Tag>}
                  </Space>
                }
              >
                {issues.map((issue, idx) => (
                  <IssueItem key={idx} issue={issue} onCopy={handleCopy} />
                ))}
              </Panel>
            );
          })}
        </Collapse>
      ) : (
        <Alert
          message="内容质量优秀"
          description="未发现任何问题，内容可以直接发布。"
          type="success"
          showIcon
        />
      )}
      
      {/* 发布建议 */}
      <PublishSuggestions
        suggestedPublishTime={result.suggestedPublishTime}
        suggestedTags={result.suggestedTags}
        onCopy={handleCopy}
      />
      
      {/* 质量不合格时显示重新生成文案按钮 */}
      {!result.passed && onRegenerateCopywriting && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onRegenerateCopywriting}
            block
            style={{ marginTop: 8 }}
          >
            重新生成文案
          </Button>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            根据校验结果，AI 将优化文案内容
          </Text>
        </>
      )}
    </Card>
  );
};

export default QualityCheckResultDisplay;
