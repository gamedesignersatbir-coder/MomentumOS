# MomentumOS — Deployment Guide

## Prerequisites
- Node.js 20+ (`node --version`)
- PM2: `npm install -g pm2`
- Tailscale installed and authenticated

## Setup
cp .env.example .env.local   # then set OPENROUTER_API_KEY
npm install
npm run build

## Start
pm2 start pm2.config.cjs
pm2 save
pm2 startup   # run the printed command to enable autostart on reboot

## Verify
curl http://localhost:3000
# Or visit http://<tailscale-ip>:3000 from any device on your Tailscale network

## Automated Backups
chmod +x scripts/backup.sh
crontab -e
# Add: 0 2 * * * /absolute/path/to/project/scripts/backup.sh >> /var/log/momentumos-backup.log 2>&1
# Backups land in data/backups/, last 30 kept automatically.

## Updating
git pull && npm install && npm run build && pm2 restart momentumos

## PM2 Commands
| Command | Purpose |
|---------|---------|
| `pm2 status` | Check running processes |
| `pm2 logs momentumos` | Tail application logs |
| `pm2 restart momentumos` | Restart after update |
| `pm2 stop momentumos` | Stop the app |
