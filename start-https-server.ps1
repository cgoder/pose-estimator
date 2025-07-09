# HTTPS开发服务器启动脚本
# 用于解决摄像头访问需要HTTPS环境的问题

Write-Host "🚀 姿态估计应用 - HTTPS开发服务器" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

# 检查Node.js是否安装
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未找到Node.js，请先安装Node.js" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 检查并安装http-server
Write-Host "📦 检查http-server..." -ForegroundColor Cyan
try {
    npx http-server --version 2>$null | Out-Null
    Write-Host "✅ http-server已安装" -ForegroundColor Green
} catch {
    Write-Host "📥 正在安装http-server..." -ForegroundColor Yellow
    npm install -g http-server
}

Write-Host ""
Write-Host "🔒 启动HTTPS开发服务器..." -ForegroundColor Cyan
Write-Host ""

# 显示访问信息
Write-Host "📍 访问地址:" -ForegroundColor Yellow
Write-Host "   https://localhost:8443/main.html" -ForegroundColor White
Write-Host "   https://127.0.0.1:8443/main.html" -ForegroundColor White
Write-Host ""

Write-Host "WARNING: Important Notes:" -ForegroundColor Yellow
Write-Host "   1. First access will show security warning, this is normal" -ForegroundColor Gray
Write-Host "   2. Click 'Advanced' -> 'Proceed to localhost (unsafe)'" -ForegroundColor Gray
Write-Host "   3. Make sure to allow camera access permission" -ForegroundColor Gray
Write-Host "   4. Press Ctrl+C to stop server" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 服务器启动中..." -ForegroundColor Green
Write-Host ""

# 启动HTTPS服务器
try {
    npx http-server . -p 8443 -S -c-1 --cors
} catch {
    Write-Host "❌ 服务器启动失败" -ForegroundColor Red
    Write-Host "请检查端口8443是否被占用" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}