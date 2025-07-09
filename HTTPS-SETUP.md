# HTTPS 环境设置指南

## 🚨 为什么需要HTTPS？

现代浏览器出于安全考虑，**只允许在HTTPS环境下访问摄像头**。这是Web标准的安全要求，无法绕过。

## 🚀 快速解决方案

### 方法一：使用提供的启动脚本（推荐）

#### Windows PowerShell（推荐）
```powershell
# 在项目根目录右键选择"在此处打开PowerShell窗口"
.\start-https-server.ps1
```

#### Windows 批处理
```cmd
# 双击运行或在命令提示符中执行
start-https-server.bat
```

### 方法二：手动启动HTTPS服务器

```bash
# 安装http-server（如果未安装）
npm install -g http-server

# 启动HTTPS服务器
npx http-server . -p 8443 -S -c-1 --cors
```

## 🌐 访问应用

启动HTTPS服务器后，在浏览器中访问：
- https://localhost:8443/main.html
- https://127.0.0.1:8443/main.html

## ⚠️ 安全警告处理

首次访问会显示安全警告，这是正常的（因为使用了自签名证书）：

1. 点击 **"高级"** 或 **"Advanced"**
2. 点击 **"继续访问localhost(不安全)"** 或 **"Proceed to localhost (unsafe)"**
3. 允许摄像头访问权限

## 🔧 常见问题

### Q: 端口8443被占用怎么办？
A: 修改启动命令中的端口号，例如使用8444：
```bash
npx http-server . -p 8444 -S -c-1 --cors
```

### Q: 仍然无法访问摄像头？
A: 检查以下几点：
1. 确保使用的是 `https://` 协议
2. 检查浏览器地址栏是否有摄像头权限提示
3. 确保摄像头没有被其他应用占用
4. 尝试刷新页面重新授权

### Q: 没有安装Node.js怎么办？
A: 请先安装Node.js：
1. 访问 https://nodejs.org/
2. 下载并安装LTS版本
3. 重启命令行工具
4. 再次运行启动脚本

## 🎯 生产环境部署

在生产环境中，请使用正式的SSL证书：

1. **Netlify/Vercel**: 自动提供HTTPS
2. **GitHub Pages**: 自动提供HTTPS
3. **自建服务器**: 使用Let's Encrypt等免费SSL证书

## 📱 移动端测试

在移动设备上测试时：

1. 确保移动设备和电脑在同一网络
2. 使用电脑的IP地址访问，例如：`https://192.168.1.100:8443/main.html`
3. 同样需要处理安全警告

## 🛠️ 开发者选项

### 生成自定义SSL证书

如果需要自定义SSL证书：

```bash
# 使用OpenSSL生成证书
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes

# 启动服务器时指定证书
npx http-server . -p 8443 -S -C server.crt -K server.key -c-1 --cors
```

### Chrome开发者标志（不推荐）

⚠️ **不推荐使用**，仅供开发参考：

```bash
# 启动Chrome时禁用安全检查（仅用于开发）
chrome.exe --unsafely-treat-insecure-origin-as-secure=http://localhost:8080 --user-data-dir=/tmp/chrome-dev
```

## 📞 需要帮助？

如果仍然遇到问题，请：

1. 检查浏览器控制台的错误信息
2. 确认按照上述步骤正确操作
3. 查看项目的 `troubleshooting.md` 文件
4. 在项目仓库中提交Issue

---

**记住：HTTPS不仅是技术要求，也是保护用户隐私和数据安全的重要措施！** 🔒