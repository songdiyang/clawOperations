#!/bin/bash
# ========================================
# ClawOperations 服务器部署脚本
# 服务器: 101.133.162.255
# ========================================

set -e  # 出错时停止

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ClawOperations 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 配置
APP_NAME="clawoperations"
DEPLOY_PATH="/var/www/$APP_NAME"
REPO_URL="<YOUR_GIT_REPO_URL>"  # 替换为你的 Git 仓库地址

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行此脚本${NC}"
  exit 1
fi

# 1. 安装依赖
echo -e "\n${YELLOW}[1/7] 检查并安装依赖...${NC}"
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update
    apt-get install -y nginx
fi

echo -e "${GREEN}✓ 依赖检查完成${NC}"

# 2. 创建部署目录
echo -e "\n${YELLOW}[2/7] 创建部署目录...${NC}"
mkdir -p $DEPLOY_PATH
mkdir -p $DEPLOY_PATH/logs
echo -e "${GREEN}✓ 目录创建完成${NC}"

# 3. 上传/更新代码 (如果是手动上传则跳过)
echo -e "\n${YELLOW}[3/7] 代码部署...${NC}"
if [ -d "$DEPLOY_PATH/src" ]; then
    echo "检测到已有代码，跳过代码拉取..."
else
    echo "请手动将代码上传到 $DEPLOY_PATH"
    echo "或配置 REPO_URL 后使用 git clone"
fi
echo -e "${GREEN}✓ 代码就绪${NC}"

# 4. 安装后端依赖并构建
echo -e "\n${YELLOW}[4/7] 构建后端...${NC}"
cd $DEPLOY_PATH/web/server

# 复制生产环境配置
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "已应用生产环境配置"
fi

npm install --production=false
npm run build
echo -e "${GREEN}✓ 后端构建完成${NC}"

# 5. 构建前端
echo -e "\n${YELLOW}[5/7] 构建前端...${NC}"
cd $DEPLOY_PATH/web/client
npm install
npm run build

# 复制构建产物
mkdir -p $DEPLOY_PATH/client
cp -r dist/* $DEPLOY_PATH/client/
echo -e "${GREEN}✓ 前端构建完成${NC}"

# 6. 配置 Nginx
echo -e "\n${YELLOW}[6/7] 配置 Nginx...${NC}"
cp $DEPLOY_PATH/deploy/nginx.conf /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# 移除默认配置
rm -f /etc/nginx/sites-enabled/default

nginx -t && nginx -s reload
echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 7. 启动服务
echo -e "\n${YELLOW}[7/7] 启动服务...${NC}"
cd $DEPLOY_PATH

# 停止旧服务
pm2 delete clawops-server 2>/dev/null || true

# 启动新服务
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo -e "${GREEN}✓ 服务启动完成${NC}"

# 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "前端访问: ${YELLOW}http://101.133.162.255${NC}"
echo -e "后端 API: ${YELLOW}http://101.133.162.255/api${NC}"
echo -e ""
echo -e "管理命令:"
echo -e "  查看状态: ${YELLOW}pm2 status${NC}"
echo -e "  查看日志: ${YELLOW}pm2 logs clawops-server${NC}"
echo -e "  重启服务: ${YELLOW}pm2 restart clawops-server${NC}"
