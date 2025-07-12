# HTTP调试模式启动脚本
# PowerShell版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    HTTP调试模式启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "[1/3] 启用HTTP调试模式..." -ForegroundColor Yellow
    
    # 修改constants.js文件启用HTTP调试模式
    $constantsPath = "src/utils/constants.js"
    if (Test-Path $constantsPath) {
        $content = Get-Content $constantsPath -Raw
        $content = $content -replace 'SKIP_HTTPS_CHECK: false', 'SKIP_HTTPS_CHECK: true'
        Set-Content $constantsPath $content
        Write-Host "✅ HTTP调试模式已启用" -ForegroundColor Green
    } else {
        throw "找不到constants.js文件"
    }
    
    Write-Host ""
    Write-Host "[2/3] 检查依赖..." -ForegroundColor Yellow
    
    # 检查Node.js和npx
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "未找到Node.js，请先安装Node.js"
    }
    
    $npxVersion = npx --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "未找到npx，请先安装Node.js"
    }
    
    Write-Host "✅ Node.js环境检查通过 ($nodeVersion)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[3/3] 启动HTTP开发服务器..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🌐 服务器将在以下地址启动:" -ForegroundColor Cyan
    Write-Host "   http://localhost:8080/main.html" -ForegroundColor White
    Write-Host "   http://127.0.0.1:8080/main.html" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  重要提示:" -ForegroundColor Red
    Write-Host "   1. 某些浏览器可能仍然限制HTTP环境下的摄像头访问" -ForegroundColor Yellow
    Write-Host "   2. 如果摄像头无法访问，请尝试以下方法:" -ForegroundColor Yellow
    Write-Host "      - Chrome: 启动时添加参数 --unsafely-treat-insecure-origin-as-secure=http://localhost:8080" -ForegroundColor Gray
    Write-Host "      - Firefox: 在about:config中设置media.devices.insecure.enabled为true" -ForegroundColor Gray
    Write-Host "   3. 按Ctrl+C停止服务器" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "正在启动服务器..." -ForegroundColor Green
    Write-Host ""
    
    # 启动HTTP服务器
    npx http-server . -p 8080 -c-1 --cors
    
} catch {
    Write-Host ""
    Write-Host "❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查以下事项:" -ForegroundColor Yellow
    Write-Host "1. 确保已安装Node.js" -ForegroundColor Gray
    Write-Host "2. 确保在项目根目录运行此脚本" -ForegroundColor Gray
    Write-Host "3. 确保有文件写入权限" -ForegroundColor Gray
} finally {
    Write-Host ""
    Write-Host "服务器已停止" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
}