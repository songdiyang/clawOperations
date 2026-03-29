#!/bin/bash
# ClawOperations 部署脚本
# 服务器: 47.116.213.223

set -e

APP_DIR="/var/www/clawoperations"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================="
echo "ClawOperations 部署脚本"
echo "时间: $(date)"
echo "========================================="

# 1. 备份现有版本
if [ -d "$APP_DIR" ]; then
    echo "[1/7] 备份现有版本..."
    mkdir -p $BACKUP_DIR
    tar -czf "$BACKUP_DIR/clawoperations_$TIMESTAMP.tar.gz" -C /var/www clawoperations 2>/dev/null || true
    echo "备份完成: $BACKUP_DIR/clawoperations_$TIMESTAMP.tar.gz"
else
    echo "[1/7] 首次部署，跳过备份"
fi

# 2. 创建目录结构
echo "[2/7] 创建目录结构..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2

# 3. 解压新版本
echo "[3/7] 解压新版本..."
cd /root
if [ -f "clawoperations.tar.gz" ]; then
    tar -xzf clawoperations.tar.gz -C $APP_DIR --strip-components=1
    echo "解压完成"
else
    echo "错误: 未找到 clawoperations.tar.gz"
    exit 1
fi

# 4. 安装后端依赖（包含构建所需的 devDependencies）
echo "[4/8] 安装后端依赖..."
cd $APP_DIR/web/server
npm install
echo "后端依赖安装完成"

# 5. 编译后端 TypeScript
echo "[5/8] 编译后端代码..."
npm run build
echo "后端编译完成"

# 6. 清理开发依赖，保留生产运行所需依赖
echo "[6/8] 清理开发依赖..."
npm prune --omit=dev
echo "开发依赖已清理"

# 7. 配置环境变量
echo "[7/8] 配置环境变量..."
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "环境变量已配置"
else
    echo "警告: 未找到 .env.production，请手动配置"
fi

# 8. 重启服务
echo "[8/8] 重启服务..."
cd $APP_DIR
pm2 delete clawoperations-server 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

echo ""
echo "========================================="
echo "部署完成！"
echo "前端地址: http://47.116.213.223"
echo "后端地址: http://47.116.213.223/api"
echo "========================================="

# 显示服务状态
pm2 status
