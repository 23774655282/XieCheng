#!/bin/bash

# 阿里云服务器快速部署脚本
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  酒店预订系统 - 阿里云部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

# 项目目录
PROJECT_DIR="/var/www/hotel-booking"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"

echo -e "${YELLOW}步骤 1/8: 检查系统环境...${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js 未安装，正在安装...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js 已安装: $(node -v)${NC}"
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm 未安装${NC}"
    exit 1
else
    echo -e "${GREEN}✓ npm 已安装: $(npm -v)${NC}"
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
else
    echo -e "${GREEN}✓ PM2 已安装${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 2/8: 检查项目目录...${NC}"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}项目目录不存在: $PROJECT_DIR${NC}"
    echo -e "${YELLOW}请先上传项目代码到此目录${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 项目目录存在${NC}"

echo ""
echo -e "${YELLOW}步骤 3/8: 创建必要的目录...${NC}"

mkdir -p "$SERVER_DIR/uploads/hotels"
mkdir -p "$SERVER_DIR/uploads/rooms"
mkdir -p "$SERVER_DIR/uploads/reviews"
mkdir -p "$SERVER_DIR/uploads/merchants"
chmod -R 755 "$SERVER_DIR/uploads"

echo -e "${GREEN}✓ 目录创建完成${NC}"

echo ""
echo -e "${YELLOW}步骤 4/8: 检查环境变量文件...${NC}"

# 检查后端.env文件
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ 后端 .env 文件不存在，请手动创建: $SERVER_DIR/.env${NC}"
    echo -e "${YELLOW}参考 server/.env.example 文件${NC}"
else
    echo -e "${GREEN}✓ 后端 .env 文件存在${NC}"
fi

# 检查前端.env文件
if [ ! -f "$CLIENT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ 前端 .env 文件不存在，请手动创建: $CLIENT_DIR/.env${NC}"
    echo -e "${YELLOW}参考 client/.env.example 文件${NC}"
else
    echo -e "${GREEN}✓ 前端 .env 文件存在${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 5/8: 安装后端依赖...${NC}"

cd "$SERVER_DIR"
npm install

echo -e "${GREEN}✓ 后端依赖安装完成${NC}"

echo ""
echo -e "${YELLOW}步骤 6/8: 安装前端依赖...${NC}"

cd "$CLIENT_DIR"
npm install

echo -e "${GREEN}✓ 前端依赖安装完成${NC}"

echo ""
echo -e "${YELLOW}步骤 7/8: 构建前端...${NC}"

npm run build

if [ ! -d "$CLIENT_DIR/dist" ]; then
    echo -e "${RED}前端构建失败，dist 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 前端构建完成${NC}"

echo ""
echo -e "${YELLOW}步骤 8/8: 启动服务...${NC}"

cd "$SERVER_DIR"

# 检查PM2进程是否已存在
if pm2 list | grep -q "hotel-api"; then
    echo -e "${YELLOW}服务已存在，正在重启...${NC}"
    pm2 restart hotel-api
else
    echo -e "${YELLOW}启动新服务...${NC}"
    pm2 start server.js --name hotel-api
fi

# 设置PM2开机自启
pm2 startup > /tmp/pm2_startup.txt 2>&1 || true
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "  部署完成！"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}服务状态：${NC}"
pm2 status
echo ""
echo -e "${GREEN}查看日志：${NC}"
echo "  pm2 logs hotel-api"
echo ""
echo -e "${GREEN}重启服务：${NC}"
echo "  pm2 restart hotel-api"
echo ""
echo -e "${GREEN}停止服务：${NC}"
echo "  pm2 stop hotel-api"
echo ""
echo -e "${YELLOW}⚠ 请确保：${NC}"
echo "  1. 已配置 server/.env 和 client/.env"
echo "  2. MongoDB 服务已启动或云数据库可访问"
echo "  3. 防火墙已开放端口（5000, 80, 443）"
echo "  4. 阿里云安全组已配置"
echo ""
