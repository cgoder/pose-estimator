import { UIController } from './ui/UIController.js';

/**
 * 重构后的应用入口文件
 * 采用现代化的模块架构和TypeScript
 */

// 全局错误处理 - 改进版本
window.addEventListener('error', (event) => {
  const error = event.error;
  const errorInfo = {
    message: error?.message || '未知错误',
    filename: event.filename || '未知文件',
    lineno: event.lineno || 0,
    colno: event.colno || 0,
    stack: error?.stack || '无堆栈信息'
  };
  
  console.error('🚨 全局错误:', errorInfo);
  
  // 如果是 TensorFlow.js 相关错误，提供特殊处理
  if (errorInfo.message.includes('env is not a function') || 
      errorInfo.filename.includes('tf-backend-webgl') ||
      errorInfo.filename.includes('tensorflow')) {
    console.warn('⚠️ 检测到 TensorFlow.js 初始化错误，这通常是依赖加载顺序问题');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const errorInfo = {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : '无堆栈信息'
  };
  
  console.error('🚨 未处理的Promise拒绝:', errorInfo);
  
  // 阻止默认的未处理拒绝行为
  event.preventDefault();
});

/**
 * 应用启动函数
 */
async function startApp(): Promise<void> {
  try {
    console.log('🚀 启动健身姿态分析系统 (重构版)...');
    
    // 注意：不再在这里检查 TensorFlow.js 依赖
    // TensorFlow.js 将在需要时由 Worker 或主线程推理引擎按需加载
    console.log('✅ 应用架构检查通过');
    
    // 创建UI控制器
    const uiController = new UIController('app');
    
    // 初始化应用
    await uiController.initializeApp();
    
    console.log('🎉 应用启动成功！');
    
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    
    // 显示错误信息给用户
        const appContainer = document.getElementById('app');
        if (appContainer) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          appContainer.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 2rem;
        ">
          <div style="
            background: #fee;
            border: 2px solid #fcc;
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
          ">
            <h1 style="color: #c33; margin: 0 0 1rem 0;">🚨 启动失败</h1>
            <p style="margin: 0 0 1rem 0; color: #666;">
              应用无法正常启动，请检查以下问题：
            </p>
            <ul style="text-align: left; color: #666; margin: 0 0 1rem 0;">
              <li>确保浏览器支持 WebGL</li>
              <li>确保网络连接正常</li>
              <li>尝试刷新页面</li>
            </ul>
            <details style="text-align: left; margin-top: 1rem;">
              <summary style="cursor: pointer; color: #666;">错误详情</summary>
              <pre style="
                background: #f5f5f5;
                padding: 1rem;
                border-radius: 4px;
                margin-top: 0.5rem;
                font-size: 0.8rem;
                overflow: auto;
              ">${errorMessage}</pre>
            </details>
            <button onclick="location.reload()" style="
              background: #3498db;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 1rem;
            ">🔄 重新加载</button>
          </div>
        </div>
      `;
    }
  }
}

// 导出启动函数供外部调用
export { startApp };