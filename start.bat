@echo off
cd /d D:\sales-orders

start cmd /k "npm run start"

timeout /t 20

start cmd /k "tailscale funnel 3000"