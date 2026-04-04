// pm2.config.cjs
module.exports = {
  apps: [
    {
      name: 'momentumos',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
