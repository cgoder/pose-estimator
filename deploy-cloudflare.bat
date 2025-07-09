@echo off
echo ========================================
echo   PWA 姿态估计器 - Cloudflare 部署脚本
echo ========================================
echo.

:: 检查是否安装了 Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git，请先安装 Git
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: 检查是否安装了 Node.js 和 npm
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 Node.js，建议安装以获得更好的开发体验
    echo 下载地址: https://nodejs.org/
)

echo [信息] 检查必要的 PWA 文件...
if not exist "main.html" (
    echo [错误] 缺少 main.html 文件
    pause
    exit /b 1
)
if not exist "manifest.json" (
    echo [错误] 缺少 manifest.json 文件
    pause
    exit /b 1
)
if not exist "sw.js" (
    echo [错误] 缺少 sw.js 文件
    pause
    exit /b 1
)
echo [成功] 所有 PWA 文件检查通过 ✓
echo.

echo [步骤 1] 初始化 Git 仓库（如果尚未初始化）
if not exist ".git" (
    git init
    echo [信息] Git 仓库已初始化
) else (
    echo [信息] Git 仓库已存在
)

echo.
echo [步骤 2] 添加所有文件到 Git
git add .
echo [信息] 文件已添加到 Git 暂存区

echo.
echo [步骤 3] 提交更改
set /p commit_message="请输入提交信息 (默认: Deploy PWA to Cloudflare): "
if "%commit_message%"=="" set commit_message=Deploy PWA to Cloudflare
git commit -m "%commit_message%"
echo [信息] 更改已提交

echo.
echo [步骤 4] 检查远程仓库
git remote -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [信息] 未配置远程仓库
    echo.
    echo 请按照以下步骤配置:
    echo 1. 在 GitHub/GitLab/Bitbucket 创建新仓库
    echo 2. 复制仓库 URL
    echo 3. 运行: git remote add origin [仓库URL]
    echo 4. 运行: git push -u origin main
    echo.
    echo 示例:
    echo git remote add origin https://github.com/yourusername/pose-estimator-pwa.git
    echo git push -u origin main
    echo.
) else (
    echo [信息] 远程仓库已配置
    echo [步骤 5] 推送到远程仓库
    git push
    if %errorlevel% equ 0 (
        echo [成功] 代码已推送到远程仓库 ✓
    ) else (
        echo [警告] 推送失败，请检查网络连接和仓库权限
    )
)

echo.
echo ========================================
echo           Cloudflare Pages 部署指南
echo ========================================
echo.
echo 现在请按照以下步骤在 Cloudflare Pages 中部署:
echo.
echo 1. 访问 https://dash.cloudflare.com/
echo 2. 登录您的 Cloudflare 账户
echo 3. 点击左侧菜单的 "Pages"
echo 4. 点击 "Create a project"
echo 5. 选择 "Connect to Git"
echo 6. 选择您的 Git 提供商并授权
echo 7. 选择刚才推送的仓库
echo 8. 配置构建设置:
echo    - 项目名称: pose-estimator-pwa
echo    - 生产分支: main
echo    - 构建命令: (留空)
echo    - 构建输出目录: /
echo 9. 点击 "Save and Deploy"
echo.
echo 部署完成后，您将获得一个 .pages.dev 域名
echo 您也可以绑定自定义域名
echo.
echo ========================================
echo              自动部署设置 (可选)
echo ========================================
echo.
echo 如需启用 GitHub Actions 自动部署:
echo 1. 在 GitHub 仓库的 Settings > Secrets 中添加:
echo    - CLOUDFLARE_API_TOKEN
echo    - CLOUDFLARE_ACCOUNT_ID
echo 2. 每次推送代码时将自动部署
echo.
echo 获取 API Token: https://dash.cloudflare.com/profile/api-tokens
echo 获取 Account ID: Cloudflare Dashboard 右侧边栏
echo.
echo ========================================
echo                 部署完成!
echo ========================================
echo.
echo 感谢使用 PWA 姿态估计器部署脚本!
echo 如有问题，请查看 cloudflare-deployment.md 文档
echo.
pause