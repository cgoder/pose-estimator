#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器用于测试PWA应用
使用方法: python server.py
然后在浏览器中访问 http://localhost:8080
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

class PWAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加PWA所需的MIME类型"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        # 添加CORS头部，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # 添加PWA相关的头部
        if self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json')
        elif self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.svg'):
            self.send_header('Content-Type', 'image/svg+xml')
        
        # 添加缓存控制头部
        if self.path.endswith(('.js', '.css', '.svg', '.png', '.jpg')):
            self.send_header('Cache-Control', 'public, max-age=31536000')  # 1年缓存
        elif self.path.endswith('.html'):
            self.send_header('Cache-Control', 'no-cache')  # HTML不缓存
        
        super().end_headers()
    
    def do_GET(self):
        # 如果访问根路径，重定向到main.html
        if self.path == '/':
            self.path = '/main.html'
        
        return super().do_GET()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    # 设置端口
    PORT = 8080
    
    # 确保在正确的目录中运行
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"PWA姿态估计器服务器")
    print(f"当前目录: {os.getcwd()}")
    print(f"启动服务器在端口 {PORT}...")
    print(f"请在浏览器中访问: http://localhost:{PORT}")
    print(f"按 Ctrl+C 停止服务器")
    print("-" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), PWAHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"错误: 端口 {PORT} 已被占用")
            print("请尝试关闭其他使用该端口的程序，或修改PORT变量使用其他端口")
        else:
            print(f"服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()