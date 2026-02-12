/**
 * PM2 进程配置：在服务器上运行 cd server && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'hotel-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
