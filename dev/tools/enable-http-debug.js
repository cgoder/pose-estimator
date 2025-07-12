/**
 * HTTP调试模式启用脚本
 * 运行此脚本可以启用HTTP环境下的本地调试
 */

// 动态修改配置以启用HTTP调试模式
if (typeof window !== 'undefined' && window.CONFIG) {
    // 如果CONFIG已经加载，直接修改
    window.CONFIG.DEVELOPMENT.SKIP_HTTPS_CHECK = true;
    console.log('✅ HTTP调试模式已启用');
} else {
    // 如果CONFIG还未加载，等待加载后修改
    document.addEventListener('DOMContentLoaded', () => {
        // 尝试多次检查CONFIG是否已加载
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkConfig = () => {
            attempts++;
            
            if (window.CONFIG) {
                window.CONFIG.DEVELOPMENT.SKIP_HTTPS_CHECK = true;
                console.log('✅ HTTP调试模式已启用');
                console.log('⚠️ 注意：某些浏览器可能仍然限制HTTP环境下的摄像头访问');
                console.log('💡 建议：如果摄像头仍无法访问，请尝试以下方法：');
                console.log('   1. 使用Chrome并启动时添加参数：--unsafely-treat-insecure-origin-as-secure=http://localhost:8080');
                console.log('   2. 在Chrome地址栏输入：chrome://flags/#unsafely-treat-insecure-origin-as-secure');
                console.log('   3. 使用Firefox并在about:config中设置media.devices.insecure.enabled为true');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkConfig, 100);
            } else {
                console.error('❌ 无法找到CONFIG对象，请确保应用已正确加载');
            }
        };
        
        checkConfig();
    });
}

// 导出配置修改函数，供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enableHttpDebug: () => {
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                
                const constantsPath = path.join(__dirname, 'src', 'utils', 'constants.js');
                
                try {
                    let content = fs.readFileSync(constantsPath, 'utf8');
                    content = content.replace(
                        'SKIP_HTTPS_CHECK: false',
                        'SKIP_HTTPS_CHECK: true'
                    );
                    fs.writeFileSync(constantsPath, content);
                    console.log('✅ HTTP调试模式已在constants.js中启用');
                } catch (error) {
                    console.error('❌ 修改constants.js失败:', error.message);
                }
            }
        },
        
        disableHttpDebug: () => {
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                
                const constantsPath = path.join(__dirname, 'src', 'utils', 'constants.js');
                
                try {
                    let content = fs.readFileSync(constantsPath, 'utf8');
                    content = content.replace(
                        'SKIP_HTTPS_CHECK: true',
                        'SKIP_HTTPS_CHECK: false'
                    );
                    fs.writeFileSync(constantsPath, content);
                    console.log('✅ HTTP调试模式已在constants.js中禁用');
                } catch (error) {
                    console.error('❌ 修改constants.js失败:', error.message);
                }
            }
        }
    };
}