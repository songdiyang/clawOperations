#!/bin/bash
# ClawOperations 一键部署脚本 - 服务器: 47.116.213.223
# 将此脚本内容复制到服务器执行

set -e
echo "========================================="
echo "ClawOperations 一键部署"
echo "========================================="

# 1. 检查并安装 Node.js 20
echo "[1/8] 检查 Node.js..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
    echo "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js 版本: $(node -v)"

# 2. 检查并安装 PM2
echo "[2/8] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi
echo "PM2 版本: $(pm2 -v)"

# 3. 检查并安装 Nginx
echo "[3/8] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update
    apt-get install -y nginx
fi
echo "Nginx 已安装"

# 4. 创建目录并解压
echo "[4/8] 解压项目文件..."
mkdir -p /var/www/clawoperations
mkdir -p /var/log/pm2
cd /root
tar -xzf clawoperations.tar.gz -C /var/www/clawoperations --strip-components=0
echo "解压完成"

# 5. 安装后端依赖
echo "[5/8] 安装后端依赖..."
cd /var/www/clawoperations/web/server
npm install --production
echo "依赖安装完成"

# 6. 配置环境变量
echo "[6/8] 配置环境变量..."
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "环境变量已配置"
else
    echo "警告: 请手动配置 .env 文件"
fi

# 7. 配置 Nginx
echo "[7/8] 配置 Nginx..."
cat > /etc/nginx/sites-available/clawoperations << 'NGINX_CONF'
server {
    listen 80;
    server_name 47.116.213.223;
    
    root /var/www/clawoperations/web/client/dist;
    index index.html;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        client_max_body_size 500M;
    }
    
    location /health {
        access_log off;
        return 200 'OK';
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/clawoperations /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx 配置完成"

# 8. 启动服务
echo "[8/8] 启动服务..."
cd /var/www/clawoperations
pm2 delete clawoperations-server 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "========================================="
echo "部署完成！"
echo "========================================="
echo "前端地址: http://47.116.213.223"
echo "后端API:  http://47.116.213.223/api"
echo ""
echo "常用命令:"
echo "  pm2 status          # 查看服务状态"
echo "  pm2 logs            # 查看日志"
echo "  pm2 restart all     # 重启服务"
echo "========================================="
pm2 status
