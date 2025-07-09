# HTTP调试模式使用指南

## 📋 概述

本指南说明如何在本地开发环境中启用HTTP调试模式，绕过HTTPS安全检查，以便在HTTP环境下进行摄像头功能调试。

⚠️ **重要提醒**: 此模式仅用于本地开发调试，生产环境必须使用HTTPS。

## 🚀 快速启动

### 方法一：使用启动脚本（推荐）

#### Windows批处理脚本
```bash
# 双击运行或在命令行执行
start-http-debug.bat
```

#### PowerShell脚本
```powershell
# 在PowerShell中执行
.\start-http-debug.ps1
```

### 方法二：手动启用

1. **修改配置文件**
   ```javascript
   // 在 src/utils/constants.js 中修改
   DEVELOPMENT: {
       SKIP_HTTPS_CHECK: true,  // 改为 true
       LOG_LEVEL: 'info'
   }
   ```

2. **启动HTTP服务器**
   ```bash
   npx http-server . -p 8080 -c-1 --cors
   ```

3. **访问应用**
   - http://localhost:8080/main.html
   - http://127.0.0.1:8080/main.html

## 🌐 浏览器配置

由于现代浏览器的安全策略，即使启用了HTTP调试模式，某些浏览器仍可能限制摄像头访问。以下是各浏览器的解决方案：

### Chrome浏览器

#### 方法1：启动参数（推荐）
```bash
# Windows
chrome.exe --unsafely-treat-insecure-origin-as-secure=http://localhost:8080 --user-data-dir=temp-chrome-profile

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --unsafely-treat-insecure-origin-as-secure=http://localhost:8080 --user-data-dir=temp-chrome-profile

# Linux
google-chrome --unsafely-treat-insecure-origin-as-secure=http://localhost:8080 --user-data-dir=temp-chrome-profile
```

#### 方法2：Chrome标志设置
1. 在地址栏输入：`chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 在"Insecure origins treated as secure"中添加：`http://localhost:8080`
3. 重启Chrome浏览器

### Firefox浏览器

1. 在地址栏输入：`about:config`
2. 搜索：`media.devices.insecure.enabled`
3. 将值设置为：`true`
4. 重启Firefox浏览器

### Edge浏览器

使用与Chrome相同的启动参数：
```bash
msedge.exe --unsafely-treat-insecure-origin-as-secure=http://localhost:8080 --user-data-dir=temp-edge-profile
```

### Safari浏览器

1. 打开Safari偏好设置
2. 进入"高级"选项卡
3. 勾选"在菜单栏中显示开发菜单"
4. 在"开发"菜单中选择"停用本地文件限制"

## 🔧 技术原理

### 代码修改说明

1. **配置文件修改**
   ```javascript
   // src/utils/constants.js
   DEVELOPMENT: {
       SKIP_HTTPS_CHECK: true,  // 跳过HTTPS检查
       LOG_LEVEL: 'info'
   }
   ```

2. **环境检查逻辑**
   ```javascript
   // src/utils/errorHandling.js
   static checkHTTPS() {
       if (CONFIG.DEVELOPMENT.SKIP_HTTPS_CHECK) {
           console.warn('🔧 开发模式：已跳过HTTPS检查');
           return; // 直接返回，不进行HTTPS检查
       }
       // 原有的HTTPS检查逻辑...
   }
   ```

### 安全考虑

- ✅ 仅在本地开发环境使用
- ✅ 不影响生产环境部署
- ✅ 可随时禁用调试模式
- ❌ 不要在生产环境启用此模式

## 📝 使用步骤

### 启用HTTP调试模式

1. **运行启动脚本**
   ```bash
   # Windows
   start-http-debug.bat
   
   # 或 PowerShell
   .\start-http-debug.ps1
   ```

2. **配置浏览器**（如果需要）
   - 按照上述浏览器配置说明操作

3. **访问应用**
   - 打开 http://localhost:8080/main.html
   - 允许摄像头权限

4. **开始调试**
   - 应用应该能正常访问摄像头
   - 查看控制台确认调试模式已启用

### 禁用HTTP调试模式

1. **手动修改配置**
   ```javascript
   // 在 src/utils/constants.js 中修改
   DEVELOPMENT: {
       SKIP_HTTPS_CHECK: false,  // 改回 false
       LOG_LEVEL: 'info'
   }
   ```

2. **或使用Node.js脚本**
   ```javascript
   // 运行 enable-http-debug.js 中的禁用函数
   const { disableHttpDebug } = require('./enable-http-debug.js');
   disableHttpDebug();
   ```

## 🐛 故障排除

### 常见问题

1. **摄像头仍然无法访问**
   - 确认浏览器配置正确
   - 检查控制台是否显示"开发模式：已跳过HTTPS检查"
   - 尝试不同的浏览器

2. **配置修改不生效**
   - 确认文件保存成功
   - 刷新页面（Ctrl+F5强制刷新）
   - 检查浏览器缓存

3. **服务器启动失败**
   - 确认Node.js已安装
   - 检查端口8080是否被占用
   - 尝试使用其他端口：`npx http-server . -p 3000`

### 调试信息

启用调试模式后，控制台会显示：
```
🔧 开发模式：已跳过HTTPS检查
⚠️ 注意：某些浏览器可能仍然限制HTTP环境下的摄像头访问
```

## 📚 相关文档

- [HTTPS-SETUP.md](./HTTPS-SETUP.md) - HTTPS环境设置指南
- [troubleshooting.md](./troubleshooting.md) - 常见问题解决方案
- [README.md](./README.md) - 项目主要文档

## ⚠️ 重要提醒

1. **仅用于开发**: 此模式仅用于本地开发调试
2. **生产环境**: 生产环境必须使用HTTPS
3. **安全风险**: HTTP环境存在安全风险，不要处理敏感数据
4. **浏览器限制**: 某些浏览器可能仍然限制HTTP环境下的摄像头访问
5. **及时恢复**: 调试完成后及时禁用此模式

---

💡 **提示**: 如果HTTP调试模式仍然无法解决摄像头访问问题，建议使用HTTPS开发服务器，参考 [HTTPS-SETUP.md](./HTTPS-SETUP.md) 文档。