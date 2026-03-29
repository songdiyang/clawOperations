# MCP服务器集成

<cite>
**本文档引用的文件**
- [mcp-server/src/index.ts](file://mcp-server/src/index.ts)
- [mcp-server/package.json](file://mcp-server/package.json)
- [mcp-server/README.md](file://mcp-server/README.md)
- [mcp-server/tsconfig.json](file://mcp-server/tsconfig.json)
- [src/index.ts](file://src/index.ts)
- [src/models/types.ts](file://src/models/types.ts)
- [src/services/publish-service.ts](file://src/services/publish-service.ts)
- [src/api/douyin-client.ts](file://src/api/douyin-client.ts)
- [src/api/auth.ts](file://src/api/auth.ts)
- [src/services/scheduler-service.ts](file://src/services/scheduler-service.ts)
- [web/server/src/index.ts](file://web/server/src/index.ts)
- [web/server/src/routes/publish.ts](file://web/server/src/routes/publish.ts)
- [web/server/src/routes/ai.ts](file://web/server/src/routes/ai.ts)
- [web/server/src/services/publisher.ts](file://web/server/src/services/publisher.ts)
- [config/default.ts](file://config/default.ts)
</cite>

## 更新摘要
**变更内容**
- 新增完整的MCP服务器实现和Model Context Protocol集成
- 添加8个标准化AI工具接口的详细说明和实现
- 更新架构图以反映MCP服务器作为统一入口点的设计
- 增强错误处理和重试机制的文档说明
- 完善生产环境配置和部署指南
- **重大改进**：publish_video工具明确说明发布现有视频而非创建新内容，ai_create_and_publish工具获得更全面的描述，强调其作为推荐工作流程的重要性，并改进了输入参数的清晰度

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介

ClawOperations MCP Server 是一个基于 Model Context Protocol (MCP) 的现代化服务器集成解决方案，专为 ClawOperations AI视频创作与抖音发布平台设计。该系统通过标准的MCP协议实现了AI平台（如 OpenClaw）与视频创作和发布功能的无缝集成，提供了从需求分析到内容生成再到抖音平台发布的完整自动化工作流。

该项目采用模块化架构设计，将复杂的视频创作和发布流程封装为8个标准化的MCP工具接口，为AI系统提供了统一的外部服务调用入口。MCP服务器作为系统的统一入口点，负责参数验证、错误处理和结果格式化，确保所有外部调用都遵循一致的接口规范。

**更新** 新增了完整的MCP服务器实现，集成了@modelcontextprotocol/sdk，并提供了8个标准化的AI工具接口，支持完整的AI创作和发布工作流。

## 项目结构

项目采用多模块架构，主要包含以下核心目录：

```mermaid
graph TB
subgraph "MCP服务器模块"
MCP[mcp-server/]
MCP_SRC[MCP服务器源码]
MCP_PKG[package.json]
MCP_README[README.md]
end
subgraph "核心业务模块"
SRC[src/]
MODELS[models/]
SERVICES[services/]
API[api/]
UTILS[utils/]
end
subgraph "Web服务器模块"
WEB_SERVER[web/server/]
ROUTES[routes/]
SERVICES[server/services/]
MIDDLEWARE[middleware/]
end
subgraph "配置模块"
CONFIG[config/]
DEFAULT_TS[default.ts]
end
MCP --> SRC
WEB_SERVER --> SRC
CONFIG --> SRC
```

**图表来源**
- [mcp-server/src/index.ts:1-358](file://mcp-server/src/index.ts#L1-L358)
- [src/index.ts:1-248](file://src/index.ts#L1-L248)
- [web/server/src/index.ts:1-72](file://web/server/src/index.ts#L1-L72)

**章节来源**
- [mcp-server/package.json:1-23](file://mcp-server/package.json#L1-L23)
- [mcp-server/tsconfig.json:1-17](file://mcp-server/tsconfig.json#L1-L17)

## 核心组件

### MCP服务器核心功能

MCP服务器作为整个系统的入口点，提供了8个标准化的AI工具接口，每个工具都经过精心设计，具有明确的输入参数规范和输出格式：

| 工具名称 | 功能描述 | 输入参数 | 输出格式 |
|---------|----------|----------|----------|
| ai_create_content | AI智能创作：根据用户需求自动生成视频/图片内容和推广文案 | requirement, contentType | 任务ID、分析结果、内容信息、文案 |
| ai_analyze_requirement | 分析用户的创作需求，返回结构化分析结果 | requirement, contentTypePreference | 分析结果 |
| ai_generate_copywriting | 快速生成推广文案，包括标题、描述和话题标签 | theme, keyPoints | 文案内容 |
| **publish_video** | **发布已有视频到抖音平台。注意：需要提供真实存在的视频文件路径。如果用户要求「AI生成并发布」，请使用 ai_create_and_publish 工具。** | **videoPath, title, description, hashtags, publishTime, isRemoteUrl** | **发布结果、视频ID** |
| get_publish_tasks | 获取所有定时发布任务列表 | 无 | 任务列表 |
| cancel_publish_task | 取消指定的定时发布任务 | taskId | 取消结果 |
| get_auth_status | 获取抖音认证状态 | 无 | 认证状态 |
| **ai_create_and_publish** | **【推荐】AI一键创作并发布：根据文字需求自动生成视频/图片并发布到抖音。当用户说"发布一个XX视频"、"创作并发布"、"生成并发布"时，应使用此工具。完整工作流：需求分析 → AI生成视频/图片 → 文案生成 → 发布。** | **requirement, contentType, scheduleTime** | **完整工作流结果** |

### 核心业务架构

```mermaid
classDiagram
class ClawPublisher {
- client : DouyinClient
- auth : DouyinAuth
- publishService : PublishService
- schedulerService : SchedulerService
+ uploadVideo(filePath, onProgress)
+ publishVideo(config)
+ scheduleVideo(config, publishTime)
+ listScheduledTasks()
+ getTokenInfo()
}
class PublishService {
- videoUpload : VideoUpload
- videoPublish : VideoPublish
- auth : DouyinAuth
+ publishVideo(config)
+ uploadVideo(filePath, onProgress)
+ downloadAndPublish(videoUrl, options)
}
class SchedulerService {
- publishService : PublishService
- tasks : Map~string, ScheduledTask~
+ schedulePublish(config, publishTime)
+ cancelSchedule(taskId)
+ listScheduledTasks()
}
class DouyinClient {
- client : AxiosInstance
- accessToken : string
+ post(url, data, config)
+ get(url, config)
+ setAccessToken(token)
}
class DouyinAuth {
- client : DouyinClient
- config : OAuthConfig
- tokenInfo : TokenInfo
+ getAccessToken(authCode)
+ refreshAccessToken()
+ ensureTokenValid()
}
ClawPublisher --> PublishService : "使用"
ClawPublisher --> SchedulerService : "使用"
PublishService --> DouyinClient : "使用"
PublishService --> DouyinAuth : "使用"
SchedulerService --> PublishService : "依赖"
DouyinAuth --> DouyinClient : "使用"
```

**图表来源**
- [src/index.ts:29-244](file://src/index.ts#L29-L244)
- [src/services/publish-service.ts:22-31](file://src/services/publish-service.ts#L22-L31)
- [src/services/scheduler-service.ts:23-29](file://src/services/scheduler-service.ts#L23-L29)
- [src/api/douyin-client.ts:13-44](file://src/api/douyin-client.ts#L13-L44)
- [src/api/auth.ts:28-36](file://src/api/auth.ts#L28-L36)

**章节来源**
- [src/index.ts:29-244](file://src/index.ts#L29-L244)
- [src/models/types.ts:193-201](file://src/models/types.ts#L193-L201)

## 架构概览

### 整体系统架构

```mermaid
graph TB
subgraph "AI客户端层"
OPENCLAW[OpenClaw AI平台]
OTHER_AI[其他AI系统]
END_USER[最终用户]
end
subgraph "MCP协议层"
MCP_SERVER[MCP服务器]
MCP_TRANSPORT[STDIO传输]
MCP_PROTOCOL[MCP协议]
MCP_SDK[@modelcontextprotocol/sdk]
end
subgraph "业务逻辑层"
CLAW_PUBLISHER[ClawPublisher主控制器]
PUBLISH_SERVICE[发布服务]
SCHEDULER_SERVICE[定时调度服务]
AI_SERVICE[AI创作服务]
end
subgraph "数据访问层"
DYOYIN_API[抖音开放平台API]
LOCAL_STORAGE[本地存储]
FILE_SYSTEM[文件系统]
end
OPENCLAW --> MCP_SERVER
OTHER_AI --> MCP_SERVER
END_USER --> MCP_SERVER
MCP_SERVER --> MCP_TRANSPORT
MCP_TRANSPORT --> MCP_PROTOCOL
MCP_PROTOCOL --> MCP_SDK
MCP_PROTOCOL --> CLAW_PUBLISHER
CLAW_PUBLISHER --> PUBLISH_SERVICE
CLAW_PUBLISHER --> SCHEDULER_SERVICE
CLAW_PUBLISHER --> AI_SERVICE
PUBLISH_SERVICE --> DYOYIN_API
SCHEDULER_SERVICE --> LOCAL_STORAGE
AI_SERVICE --> FILE_SYSTEM
```

**图表来源**
- [mcp-server/src/index.ts:318-358](file://mcp-server/src/index.ts#L318-L358)
- [src/index.ts:29-67](file://src/index.ts#L29-L67)
- [web/server/src/index.ts:20-72](file://web/server/src/index.ts#L20-L72)

### 数据流处理流程

```mermaid
sequenceDiagram
participant AI as AI客户端
participant MCP as MCP服务器
participant API as ClawOperations API
participant DYP as 抖音平台
participant FS as 文件系统
AI->>MCP : 调用工具接口
MCP->>MCP : 验证参数和权限
MCP->>API : 转发HTTP请求
API->>FS : 文件操作如需要
API->>DYP : 调用抖音API
DYP-->>API : 返回结果
API-->>MCP : 返回响应
MCP-->>AI : 格式化输出结果
Note over AI,MCP : 完整的MCP工具调用生命周期
```

**图表来源**
- [mcp-server/src/index.ts:176-315](file://mcp-server/src/index.ts#L176-L315)
- [web/server/src/routes/publish.ts:11-35](file://web/server/src/routes/publish.ts#L11-L35)

## 详细组件分析

### MCP服务器实现

MCP服务器的核心实现位于 `mcp-server/src/index.ts`，采用了标准的MCP协议实现模式，集成了@modelcontextprotocol/sdk：

#### 工具定义与注册

服务器定义了8个标准化工具，每个工具都有明确的输入参数规范和输出格式：

```mermaid
flowchart TD
START[服务器启动] --> INIT_CLIENT[初始化API客户端]
INIT_CLIENT --> DEFINE_TOOLS[定义8个MCP工具]
DEFINE_TOOLS --> REGISTER_HANDLERS[注册请求处理器]
REGISTER_HANDLERS --> CONNECT_TRANSPORT[建立STDIO传输]
CONNECT_TRANSPORT --> READY[服务器就绪]
READY --> LIST_TOOLS[处理工具列表请求]
READY --> CALL_TOOL[处理工具调用请求]
CALL_TOOL --> EXECUTE_TOOL[执行具体工具函数]
EXECUTE_TOOL --> VALIDATE_ARGS[验证参数]
VALIDATE_ARGS --> MAKE_REQUEST[向后端API发起请求]
MAKE_REQUEST --> HANDLE_RESPONSE[处理响应并格式化输出]
HANDLE_RESPONSE --> RETURN_RESULT[返回MCP结果]
```

**图表来源**
- [mcp-server/src/index.ts:24-173](file://mcp-server/src/index.ts#L24-L173)
- [mcp-server/src/index.ts:330-348](file://mcp-server/src/index.ts#L330-L348)

#### 错误处理机制

MCP服务器实现了完善的错误处理机制，确保所有异常情况都能被正确捕获和报告：

```mermaid
flowchart TD
TOOL_CALL[工具调用] --> TRY_BLOCK[try块执行]
TRY_BLOCK --> SWITCH_STATEMENT[switch语句匹配工具]
SWITCH_STATEMENT --> EXECUTE_API[执行后端API调用]
EXECUTE_API --> SUCCESS_CHECK{成功?}
SUCCESS_CHECK --> |是| FORMAT_SUCCESS[格式化成功响应]
SUCCESS_CHECK --> |否| FORMAT_ERROR[格式化错误响应]
FORMAT_SUCCESS --> RETURN_MCP[返回MCP格式]
FORMAT_ERROR --> RETURN_MCP
TRY_BLOCK --> CATCH_ERROR[catch异常]
CATCH_ERROR --> EXTRACT_MESSAGE[提取错误信息]
EXTRACT_MESSAGE --> FORMAT_ERROR
```

**图表来源**
- [mcp-server/src/index.ts:311-315](file://mcp-server/src/index.ts#L311-L315)

**章节来源**
- [mcp-server/src/index.ts:176-315](file://mcp-server/src/index.ts#L176-L315)

### 发布服务核心逻辑

发布服务 (`src/services/publish-service.ts`) 实现了完整的视频发布流程编排：

#### 发布流程编排

```mermaid
sequenceDiagram
participant CLIENT as 客户端
participant SERVICE as PublishService
participant UPLOAD as VideoUpload
participant PUBLISH as VideoPublish
participant AUTH as DouyinAuth
CLIENT->>SERVICE : publishVideo(config)
SERVICE->>SERVICE : 验证发布参数
SERVICE->>UPLOAD : 上传视频文件
UPLOAD->>AUTH : 获取访问令牌
AUTH-->>UPLOAD : 返回令牌
UPLOAD->>UPLOAD : 执行文件上传
UPLOAD-->>SERVICE : 返回video_id
SERVICE->>PUBLISH : 创建视频发布
PUBLISH->>AUTH : 获取访问令牌
AUTH-->>PUBLISH : 返回令牌
PUBLISH->>PUBLISH : 调用抖音API
PUBLISH-->>SERVICE : 返回发布结果
SERVICE-->>CLIENT : 返回PublishResult
```

**图表来源**
- [src/services/publish-service.ts:38-80](file://src/services/publish-service.ts#L38-L80)

#### 定时发布调度

定时发布服务 (`src/services/scheduler-service.ts`) 使用 node-cron 实现精确的时间调度：

```mermaid
flowchart TD
SCHEDULE_REQUEST[定时发布请求] --> VALIDATE_TIME[验证发布时间]
VALIDATE_TIME --> CREATE_CRON[创建Cron表达式]
CREATE_CRON --> SETUP_JOB[设置定时任务]
SETUP_JOB --> STORE_TASK[存储任务信息]
STORE_TASK --> WAIT_EXECUTION[等待执行]
WAIT_EXECUTION --> EXECUTE_TASK[执行定时任务]
EXECUTE_TASK --> PUBLISH_VIDEO[调用发布服务]
PUBLISH_VIDEO --> UPDATE_STATUS[更新任务状态]
UPDATE_STATUS --> CLEANUP_COMPLETED[清理已完成任务]
```

**图表来源**
- [src/services/scheduler-service.ts:37-72](file://src/services/scheduler-service.ts#L37-L72)
- [src/services/scheduler-service.ts:140-162](file://src/services/scheduler-service.ts#L140-L162)

**章节来源**
- [src/services/publish-service.ts:38-80](file://src/services/publish-service.ts#L38-L80)
- [src/services/scheduler-service.ts:37-72](file://src/services/scheduler-service.ts#L37-L72)

### 抖音API客户端

抖音API客户端 (`src/api/douyin-client.ts`) 实现了与抖音开放平台的通信：

#### 请求重试机制

```mermaid
flowchart TD
API_REQUEST[API请求] --> WITH_RETRY[withRetry包装]
WITH_RETRY --> CHECK_ERROR{检查错误类型}
CHECK_ERROR --> |限流错误| RETRY_DELAY[指数退避延迟]
CHECK_ERROR --> |网络错误| RETRY_DELAY
CHECK_ERROR --> |其他错误| THROW_ERROR[抛出异常]
RETRY_DELAY --> INCREASE_DELAY[增加延迟时间]
INCREASE_DELAY --> MAX_DELAY_CHECK{达到最大延迟?}
MAX_DELAY_CHECK --> |否| WITH_RETRY
MAX_DELAY_CHECK --> |是| THROW_ERROR
THROW_ERROR --> MAX_RETRIES_CHECK{超过最大重试次数?}
MAX_RETRIES_CHECK --> |否| WITH_RETRY
MAX_RETRIES_CHECK --> |是| FINAL_ERROR[最终错误]
```

**图表来源**
- [src/api/douyin-client.ts:129-139](file://src/api/douyin-client.ts#L129-L139)
- [src/api/douyin-client.ts:204-220](file://src/api/douyin-client.ts#L204-L220)

**章节来源**
- [src/api/douyin-client.ts:124-166](file://src/api/douyin-client.ts#L124-L166)

### Web服务器集成

Web服务器 (`web/server/src/index.ts`) 提供RESTful API接口：

#### 路由组织结构

```mermaid
graph LR
subgraph "API路由"
AUTH_ROUTES[认证路由]
UPLOAD_ROUTES[上传路由]
PUBLISH_ROUTES[发布路由]
AI_ROUTES[AI创作路由]
USER_ROUTES[用户路由]
end
subgraph "服务层"
PUBLISHER_SERVICE[发布服务]
AI_SERVICE[AI服务]
CONFIG_SERVICE[配置服务]
TASK_SERVICE[任务服务]
end
AUTH_ROUTES --> PUBLISHER_SERVICE
UPLOAD_ROUTES --> PUBLISHER_SERVICE
PUBLISH_ROUTES --> PUBLISHER_SERVICE
AI_ROUTES --> AI_SERVICE
USER_ROUTES --> CONFIG_SERVICE
```

**图表来源**
- [web/server/src/index.ts:7-11](file://web/server/src/index.ts#L7-L11)
- [web/server/src/routes/publish.ts:1-123](file://web/server/src/routes/publish.ts#L1-L123)

**章节来源**
- [web/server/src/index.ts:20-72](file://web/server/src/index.ts#L20-L72)
- [web/server/src/routes/publish.ts:11-35](file://web/server/src/routes/publish.ts#L11-L35)

## 依赖关系分析

### 核心依赖关系

```mermaid
graph TB
subgraph "MCP服务器依赖"
MCP_SERVER[mcp-server]
SDK[@modelcontextprotocol/sdk]
AXIOS[axios]
ZOD[zod]
END_USER[最终用户]
ENDPOINT[HTTP端点]
end
subgraph "核心业务依赖"
CORE_LIB[src/]
EXPRESS[express]
CORS[cors]
NODE_CRON[node-cron]
DOTENV[dotenv]
end
subgraph "配置依赖"
DEFAULT_CONFIG[config/default.ts]
TYPES[typescript]
TS_NODE[ts-node]
end
MCP_SERVER --> SDK
MCP_SERVER --> AXIOS
MCP_SERVER --> ZOD
MCP_SERVER --> END_USER
MCP_SERVER --> ENDPOINT
CORE_LIB --> EXPRESS
CORE_LIB --> NODE_CRON
CORE_LIB --> DOTENV
MCP_SERVER --> CORE_LIB
CORE_LIB --> DEFAULT_CONFIG
```

**图表来源**
- [mcp-server/package.json:12-21](file://mcp-server/package.json#L12-L21)
- [web/server/src/index.ts:1-11](file://web/server/src/index.ts#L1-L11)

### 数据模型依赖

```mermaid
erDiagram
DOUYIN_CONFIG {
string clientKey
string clientSecret
string redirectUri
string accessToken
string refreshToken
string openId
number expiresAt
}
PUBLISH_TASK_CONFIG {
string videoPath
object options
boolean isRemoteUrl
}
VIDEO_PUBLISH_OPTIONS {
string title
string description
string[] hashtags
string[] atUsers
string poiId
string microAppId
string articleId
number schedulePublishTime
}
PUBLISH_RESULT {
boolean success
string videoId
string shareUrl
string error
number createTime
}
DOUYIN_CONFIG ||--o{ PUBLISH_TASK_CONFIG : "配置"
PUBLISH_TASK_CONFIG ||--|| VIDEO_PUBLISH_OPTIONS : "包含"
PUBLISH_TASK_CONFIG ||--|| PUBLISH_RESULT : "产生"
```

**图表来源**
- [src/models/types.ts:193-201](file://src/models/types.ts#L193-L201)
- [src/models/types.ts:161-168](file://src/models/types.ts#L161-L168)
- [src/models/types.ts:101-124](file://src/models/types.ts#L101-L124)
- [src/models/types.ts:173-179](file://src/models/types.ts#L173-L179)

**章节来源**
- [src/models/types.ts:1-410](file://src/models/types.ts#L1-L410)

## 性能考虑

### 并发处理优化

系统在多个层面实现了性能优化：

1. **异步并发处理**：所有API调用都采用异步模式，避免阻塞主线程
2. **连接池管理**：使用axios的连接复用机制减少TCP连接开销
3. **缓存策略**：MCP服务器对工具定义进行缓存，避免重复计算
4. **内存管理**：定时任务完成后及时清理内存占用

### 错误重试机制

```mermaid
flowchart TD
REQUEST[请求发起] --> CHECK_RETRY{需要重试?}
CHECK_RETRY --> |否| SUCCESS[请求成功]
CHECK_RETRY --> |是| BACKOFF[指数退避]
BACKOFF --> MAX_RETRY{达到最大重试?}
MAX_RETRY --> |否| REQUEST
MAX_RETRY --> |是| FAIL[请求失败]
SUCCESS --> RESPONSE[返回响应]
FAIL --> ERROR[抛出错误]
```

**图表来源**
- [src/api/douyin-client.ts:204-220](file://src/api/douyin-client.ts#L204-L220)

## 故障排除指南

### 常见问题诊断

#### MCP服务器启动问题

**症状**：MCP服务器无法启动
**排查步骤**：
1. 检查CLAWOPS_API_URL环境变量是否正确设置
2. 验证后端API服务是否正常运行
3. 查看控制台错误日志获取详细信息

#### 认证失败问题

**症状**：抖音认证失败或Token过期
**排查步骤**：
1. 验证抖音应用配置信息
2. 检查access_token和refresh_token的有效性
3. 确认OAuth授权流程是否正确完成

#### 发布失败问题

**症状**：视频发布过程中出现错误
**排查步骤**：
1. 检查视频文件格式和大小限制
2. 验证发布选项参数的完整性
3. 查看抖音API返回的具体错误信息

**章节来源**
- [mcp-server/README.md:31-38](file://mcp-server/README.md#L31-L38)
- [src/api/auth.ts:132-140](file://src/api/auth.ts#L132-L140)

## 结论

ClawOperations MCP Server 提供了一个完整、可靠的AI视频创作和发布集成解决方案。通过标准化的MCP协议接口，该系统成功地将复杂的抖音视频发布流程封装为简单易用的工具调用，为AI平台提供了强大的内容创作和分发能力。

### 主要优势

1. **标准化接口**：8个标准化的MCP工具接口，便于AI系统集成
2. **完整工作流**：从需求分析到内容生成再到发布的一站式服务
3. **高可用性**：完善的错误处理和重试机制
4. **可扩展性**：模块化设计支持功能扩展和定制
5. **安全性**：严格的参数验证和权限控制
6. **生产就绪**：完整的TypeScript实现和配置管理

### 技术特点

- 采用现代TypeScript开发，提供完整的类型安全
- 基于MCP协议的标准实现，确保与其他AI系统的兼容性
- 集成多种AI服务提供商，支持灵活的内容生成策略
- 完善的日志记录和监控机制，便于问题诊断和性能优化
- 支持生产环境配置和部署，具备企业级应用能力

**更新** 特别强调了工具使用的最佳实践：当用户要求「AI生成并发布」时，应优先使用 `ai_create_and_publish` 工具，它提供了完整的端到端工作流；而 `publish_video` 工具仅适用于发布已经存在的视频内容。

该系统为AI驱动的内容创作和分发提供了一个坚实的技术基础，能够满足现代数字营销和内容创作的各种需求。通过MCP服务器的标准化接口，开发者可以轻松地将ClawOperations的功能集成到任何支持MCP协议的AI平台中。