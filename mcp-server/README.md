# ClawOperations MCP Server

为 ClawOperations 提供的 MCP (Model Context Protocol) Server，让 AI 平台（如 OpenClaw）可以直接调用视频创作和发布功能。

## 安装

```bash
cd mcp-server
npm install
npm run build
```

## 配置

在 OpenClaw 或其他 MCP 客户端中添加此服务器：

```json
{
  "mcpServers": {
    "clawoperations": {
      "command": "node",
      "args": ["d:/JavaProject/appwuhan/clawOperations/mcp-server/dist/index.js"],
      "env": {
        "CLAWOPS_API_URL": "http://localhost:3001/api"
      }
    }
  }
}
```

## 前置条件

确保 ClawOperations 后端服务正在运行：

```bash
cd ../web/server
npm run dev
```

## 可用工具

### 1. ai_create_content
AI 智能创作：根据需求自动生成视频/图片内容和推广文案。

**参数:**
- `requirement` (必填): 创作需求描述
- `contentType`: 内容类型 (auto/image/video)

**示例:**
```
"制作一个小龙虾美食推广视频，突出麻辣鲜香的特点"
```

### 2. ai_analyze_requirement
分析用户的创作需求，返回结构化的分析结果。

**参数:**
- `requirement` (必填): 创作需求描述
- `contentTypePreference`: 内容类型偏好

### 3. ai_generate_copywriting
快速生成推广文案。

**参数:**
- `theme` (必填): 文案主题
- `keyPoints`: 关键卖点列表

### 4. publish_video
发布视频到抖音平台。

**参数:**
- `videoPath` (必填): 视频文件路径或视频ID
- `title`: 视频标题
- `description`: 视频描述
- `hashtags`: 话题标签列表
- `publishTime`: 定时发布时间（ISO格式）
- `isRemoteUrl`: 是否为远程URL

### 5. get_publish_tasks
获取所有定时发布任务列表。

### 6. cancel_publish_task
取消定时发布任务。

**参数:**
- `taskId` (必填): 任务ID

### 7. get_auth_status
获取抖音认证状态。

### 8. ai_create_and_publish
AI 一键创作并发布：完整的工作流，从需求到发布。

**参数:**
- `requirement` (必填): 创作需求描述
- `contentType`: 内容类型偏好
- `scheduleTime`: 定时发布时间

## 使用示例

在 OpenClaw 中，AI 可以这样调用：

1. **创作视频内容**
   > "帮我创作一个关于夏日饮品的推广视频"

2. **发布到抖音**
   > "把刚才生成的视频发布到抖音，标题是'清凉一夏'"

3. **定时发布**
   > "明天早上10点发布一个小龙虾促销视频"

4. **查看任务**
   > "查看我的定时发布任务"
