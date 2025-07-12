#!/usr/bin/env python3
"""
简单的HTTP服务器用于测试应用
支持CORS和自定义MIME类型
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

PORT = 8080

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加所需的MIME类型"""
    
    def end_headers(self):
        # 添加CORS头部
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # 添加缓存控制头部
        if self.path.endswith('.js'):
            self.send_header('Cache-Control', 'no-cache')
        
        super().end_headers()
    
    def guess_type(self, path):
        """扩展MIME类型支持"""
        mimetype, encoding = super().guess_type(path)
        
        # 添加自定义MIME类型
        if path.endswith('.js'):
            return 'application/javascript', encoding
        elif path.endswith('.ts'):
            return 'application/typescript', encoding
        elif path.endswith('.json'):
            return 'application/json', encoding
        
        return mimetype, encoding

def main():
    """启动HTTP服务器"""
    os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    
    print(f"健身姿态分析系统服务器")
    print(f"端口: {PORT}")
    print(f"目录: {os.getcwd()}")
    print(f"访问: http://localhost:{PORT}")
    print("按 Ctrl+C 停止服务器")
    print("-" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"服务器运行在 http://localhost:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        sys.exit(0)
    except Exception as e:
        print(f"服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()