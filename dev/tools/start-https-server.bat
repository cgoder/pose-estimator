@echo off
echo 正在启动HTTPS开发服务器...
echo.
echo 注意: 首次运行可能需要安装依赖包
echo.

REM 检查是否安装了Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否安装了http-server
npx http-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 正在安装http-server...
    npm install -g http-server
)

REM 生成自签名证书（如果不存在）
if not exist "server.crt" (
    echo 正在生成自签名SSL证书...
    echo.
    echo 请注意: 浏览器会显示安全警告，这是正常的
    echo 请点击"高级"然后"继续访问"来使用自签名证书
    echo.
    
    REM 使用OpenSSL生成证书（如果可用）
    openssl version >nul 2>&1
    if %errorlevel% equ 0 (
        openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/C=CN/ST=Local/L=Local/O=Dev/CN=localhost"
    ) else (
        echo 警告: 未找到OpenSSL，将使用http-server的内置SSL功能
    )
)

echo.
echo 🚀 启动HTTPS开发服务器...
echo.
echo 访问地址:
echo   https://localhost:8443/main.html
echo   https://127.0.0.1:8443/main.html
echo.
echo 注意事项:
echo   1. 首次访问会显示安全警告，请点击"高级"→"继续访问"
echo   2. 确保摄像头权限已授权
echo   3. 按 Ctrl+C 停止服务器
echo.

REM 启动HTTPS服务器
if exist "server.crt" (
    npx http-server . -p 8443 -S -C server.crt -K server.key -c-1 --cors
) else (
    npx http-server . -p 8443 -S -c-1 --cors
)

pause