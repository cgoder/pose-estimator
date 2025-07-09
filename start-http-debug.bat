@echo off
chcp 65001 >nul
echo ========================================
echo    HTTP调试模式启动脚本
echo ========================================
echo.

echo [1/3] 启用HTTP调试模式...
node -e "const fs=require('fs'); const path='src/utils/constants.js'; let content=fs.readFileSync(path,'utf8'); content=content.replace('SKIP_HTTPS_CHECK: false','SKIP_HTTPS_CHECK: true'); fs.writeFileSync(path,content); console.log('✅ HTTP调试模式已启用');"

if %errorlevel% neq 0 (
    echo ❌ 启用HTTP调试模式失败
    pause
    exit /b 1
)

echo.
echo [2/3] 检查依赖...
npx --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到npx，请先安装Node.js
    pause
    exit /b 1
)

echo ✅ Node.js环境检查通过
echo.
echo [3/3] 启动HTTP开发服务器...
echo.
echo 🌐 服务器将在以下地址启动:
echo    http://localhost:8080/main.html
echo    http://127.0.0.1:8080/main.html
echo.
echo ⚠️  重要提示:
echo    1. 某些浏览器可能仍然限制HTTP环境下的摄像头访问
echo    2. 如果摄像头无法访问，请尝试以下方法:
echo       - Chrome: 启动时添加参数 --unsafely-treat-insecure-origin-as-secure=http://localhost:8080
echo       - Firefox: 在about:config中设置media.devices.insecure.enabled为true
echo    3. 按Ctrl+C停止服务器
echo.
echo 正在启动服务器...
echo.

npx http-server . -p 8080 -c-1 --cors

echo.
echo 服务器已停止
pause