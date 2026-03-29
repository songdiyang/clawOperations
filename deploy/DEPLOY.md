# ClawOperations 部署指南

## 服务器信息
- **IP地址**: 101.133.162.255
- **官网地址**: http://101.133.162.255

## 快速部署

### 方式一：手动部署

#### 1. 上传代码到服务器
```bash
# 在本地打包
tar -czvf clawoperations.tar.gz --exclude='node_modules' --exclude='.git' .

# 上传到服务器
scp clawoperations.tar.gz root@101.133.162.255:/var/www/

# 在服务器上解压
ssh root@101.133.162.255
cd /var/www
mkdir -p clawoperations
tar -xzvf clawoperations.tar.gz -C clawoperations
```

#### 2. 运行部署脚本
```bash
cd /var/www/clawoperations
chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh
```

### 方式二：使用已构建的前端

如果前端已在本地构建，可以直接上传 `dist` 目录：

```bash
# 上传前端构建产物
scp -r web/client/dist/* root@101.133.162.255:/var/www/clawoperations/client/
```

## 目录结构

服务器上的部署目录结构：
```
/var/www/clawoperations/
├── client/              # 前端静态文件 (Nginx 托管)
├── web/
│   └── server/          # 后端 Node.js 服务
├── ecosystem.config.js  # PM2 配置
├── deploy/
│   ├── nginx.conf       # Nginx 配置
│   └── deploy.sh        # 部署脚本
└── logs/                # 日志目录
```

## 配置文件

### 1. 后端环境变量
编辑 `/var/www/clawoperations/web/server/.env`:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=<你的JWT密钥>
DOUYIN_CLIENT_KEY=<抖音Client Key>
DOUYIN_CLIENT_SECRET=<抖音Client Secret>
DOUYIN_REDIRECT_URI=http://101.133.162.255/auth/callback
DEEPSEEK_API_KEY=<DeepSeek API Key>
```

### 2. 抖音开放平台配置
登录 https://open.douyin.com，将回调地址设置为：
```
http://101.133.162.255/auth/callback
```

## 常用命令

### PM2 服务管理
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs clawoperations-server

# 重启服务
pm2 restart clawoperations-server

# 停止服务
pm2 stop clawoperations-server
```

### Nginx 管理
```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 查看日志
tail -f /var/log/nginx/clawoperations-access.log
tail -f /var/log/nginx/clawoperations-error.log
```

## 端口说明

| 服务 | 端口 | 说明 |
|-----|------|------|
| Nginx | 80 | 前端 + API 反向代理 |
| Node.js | 3001 | 后端 API (内部) |

## 访问地址

- **前端页面**: http://101.133.162.255
- **API 接口**: http://101.133.162.255/api
- **健康检查**: http://101.133.162.255/api/health

## 故障排查

### 1. 服务未启动
```bash
pm2 status
pm2 logs clawoperations-server --lines 100
```

### 2. Nginx 502 错误
检查后端服务是否正常运行：
```bash
curl http://127.0.0.1:3001/api/health
```

### 3. 抖音授权失败
- 检查回调地址是否正确配置
- 确认 scope 权限已在抖音开放平台申请
