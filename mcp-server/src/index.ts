#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// ClawOperations API 基础地址
const API_BASE_URL = process.env.CLAWOPS_API_URL || 'http://localhost:3001/api';

// API 客户端
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // AI 创作可能需要较长时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 工具定义
const tools = [
  {
    name: 'ai_create_content',
    description: 'AI 智能创作：根据用户需求自动生成视频/图片内容和推广文案。输入创作需求描述，AI 将分析需求、生成内容、生成文案。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requirement: {
          type: 'string',
          description: '创作需求描述，例如：制作一个小龙虾美食推广视频，突出麻辣鲜香的特点',
        },
        contentType: {
          type: 'string',
          enum: ['auto', 'image', 'video'],
          description: '内容类型偏好：auto=自动选择, image=图片, video=视频',
          default: 'auto',
        },
      },
      required: ['requirement'],
    },
  },
  {
    name: 'ai_analyze_requirement',
    description: '分析用户的创作需求，返回内容类型、主题、风格、目标受众、关键卖点等信息',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requirement: {
          type: 'string',
          description: '创作需求描述',
        },
        contentTypePreference: {
          type: 'string',
          enum: ['image', 'video'],
          description: '内容类型偏好（可选）',
        },
      },
      required: ['requirement'],
    },
  },
  {
    name: 'ai_generate_copywriting',
    description: '根据主题快速生成推广文案，包括标题、描述和话题标签',
    inputSchema: {
      type: 'object' as const,
      properties: {
        theme: {
          type: 'string',
          description: '文案主题',
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: '关键卖点列表（可选）',
        },
      },
      required: ['theme'],
    },
  },
  {
    name: 'publish_video',
    description: '发布已有视频到抖音平台。注意：需要提供真实存在的视频文件路径。如果用户要求「AI生成并发布」，请使用 ai_create_and_publish 工具。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        videoPath: {
          type: 'string',
          description: '真实存在的视频文件绝对路径（如 /path/to/video.mp4）或视频ID',
        },
        title: {
          type: 'string',
          description: '视频标题（最多55字符）',
        },
        description: {
          type: 'string',
          description: '视频描述（最多300字符）',
        },
        hashtags: {
          type: 'array',
          items: { type: 'string' },
          description: '话题标签列表（最多5个）',
        },
        publishTime: {
          type: 'string',
          description: '定时发布时间（ISO格式），不填则立即发布',
        },
        isRemoteUrl: {
          type: 'boolean',
          description: 'videoPath 是否为远程URL',
          default: false,
        },
      },
      required: ['videoPath'],
    },
  },
  {
    name: 'get_publish_tasks',
    description: '获取所有定时发布任务列表，包括待执行、已完成、失败的任务',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'cancel_publish_task',
    description: '取消指定的定时发布任务',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: '任务ID',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'get_auth_status',
    description: '获取抖音认证状态，检查是否已配置和授权',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'ai_create_and_publish',
    description: '【推荐】AI 一键创作并发布：根据文字需求自动生成视频/图片并发布到抖音。当用户说“发布一个XX视频”、“创作并发布”、“生成并发布”时，应使用此工具。完整工作流：需求分析 → AI生成视频/图片 → 文案生成 → 发布。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requirement: {
          type: 'string',
          description: '创作需求描述，例如：“生成一个可爱小猫的视频”、“制作美食探店vlog”等',
        },
        contentType: {
          type: 'string',
          enum: ['auto', 'image', 'video'],
          description: '内容类型偏好：auto自动判断，image图片，video视频',
          default: 'auto',
        },
        scheduleTime: {
          type: 'string',
          description: '定时发布时间（ISO格式），不填则立即发布',
        },
      },
      required: ['requirement'],
    },
  },
];

// 工具执行函数
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'ai_create_content': {
        const response = await apiClient.post('/ai/create', {
          input: args.requirement,
          config: {
            contentTypePreference: args.contentType || 'auto',
          },
        });
        
        if (response.data.success) {
          const data = response.data.data;
          return JSON.stringify({
            success: true,
            taskId: data.taskId,
            analysis: data.analysis,
            content: {
              type: data.content?.type,
              path: data.content?.localPath,
            },
            copywriting: data.copywriting,
          }, null, 2);
        }
        return JSON.stringify({ success: false, error: response.data.error });
      }

      case 'ai_analyze_requirement': {
        const response = await apiClient.post('/ai/analyze', {
          input: args.requirement,
          contentTypePreference: args.contentTypePreference,
        });
        
        if (response.data.success) {
          return JSON.stringify({
            success: true,
            analysis: response.data.data,
          }, null, 2);
        }
        return JSON.stringify({ success: false, error: response.data.error });
      }

      case 'ai_generate_copywriting': {
        const response = await apiClient.post('/ai/quick-copywriting', {
          theme: args.theme,
          keyPoints: args.keyPoints,
        });
        
        if (response.data.success) {
          return JSON.stringify({
            success: true,
            copywriting: response.data.data,
          }, null, 2);
        }
        return JSON.stringify({ success: false, error: response.data.error });
      }

      case 'publish_video': {
        const options: Record<string, unknown> = {};
        if (args.title) options.title = args.title;
        if (args.description) options.description = args.description;
        if (args.hashtags) options.hashtags = args.hashtags;

        const endpoint = args.publishTime ? '/publish/schedule' : '/publish';
        const payload: Record<string, unknown> = {
          videoPath: args.videoPath,
          options,
          isRemoteUrl: args.isRemoteUrl || false,
        };

        if (args.publishTime) {
          payload.publishTime = args.publishTime;
        }

        const response = await apiClient.post(endpoint, payload);
        
        return JSON.stringify({
          success: response.data.data?.success ?? true,
          videoId: response.data.data?.videoId,
          taskId: response.data.data?.taskId,
          shareUrl: response.data.data?.shareUrl,
          isScheduled: !!args.publishTime,
        }, null, 2);
      }

      case 'get_publish_tasks': {
        const response = await apiClient.get('/publish/tasks');
        return JSON.stringify({
          success: true,
          tasks: response.data.data || [],
        }, null, 2);
      }

      case 'cancel_publish_task': {
        await apiClient.delete(`/publish/tasks/${args.taskId}`);
        return JSON.stringify({
          success: true,
          message: `任务 ${args.taskId} 已取消`,
        });
      }

      case 'get_auth_status': {
        const response = await apiClient.get('/auth/status');
        return JSON.stringify({
          success: true,
          status: response.data.data,
        }, null, 2);
      }

      case 'ai_create_and_publish': {
        const response = await apiClient.post('/ai/publish', {
          input: args.requirement,
          config: {
            contentTypePreference: args.contentType || 'auto',
            scheduleTime: args.scheduleTime,
          },
        });
        
        if (response.data.success) {
          const data = response.data.data;
          return JSON.stringify({
            success: true,
            taskId: data.taskId,
            analysis: data.analysis,
            content: data.content,
            copywriting: data.copywriting,
            publishResult: data.publishResult,
          }, null, 2);
        }
        return JSON.stringify({ success: false, error: response.data.error });
      }

      default:
        return JSON.stringify({ success: false, error: `未知工具: ${name}` });
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || '请求失败';
    return JSON.stringify({ success: false, error: errorMessage });
  }
}

// 创建 MCP Server
const server = new Server(
  {
    name: 'clawoperations-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await executeTool(name, args || {});
  
  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
});

// 启动服务
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ClawOperations MCP Server 已启动');
}

main().catch(console.error);
