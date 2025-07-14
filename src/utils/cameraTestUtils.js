/**
 * 摄像头功能测试工具
 * 用于测试和验证摄像头相关功能
 */
export class CameraTestUtils {
    /**
     * 测试摄像头基本功能
     */
    static async testBasicCameraAccess() {
        const results = {
            hasMediaDevices: false,
            hasGetUserMedia: false,
            hasEnumerateDevices: false,
            canAccessCamera: false,
            deviceCount: 0,
            supportedConstraints: null,
            error: null
        };

        try {
            // 检查基本API支持
            results.hasMediaDevices = !!navigator.mediaDevices;
            results.hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
            results.hasEnumerateDevices = !!navigator.mediaDevices?.enumerateDevices;

            if (!results.hasGetUserMedia) {
                throw new Error('浏览器不支持getUserMedia API');
            }

            // 获取支持的约束
            if (navigator.mediaDevices.getSupportedConstraints) {
                results.supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
            }

            // 枚举设备
            if (results.hasEnumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                results.deviceCount = videoDevices.length;
            }

            // 测试摄像头访问
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            
            results.canAccessCamera = true;
            
            // 清理
            stream.getTracks().forEach(track => track.stop());

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    /**
     * 测试摄像头切换功能
     */
    static async testCameraSwitching() {
        const results = {
            supportsMultipleCameras: false,
            canSwitchToFront: false,
            canSwitchToBack: false,
            switchTime: null,
            error: null
        };

        try {
            // 检查设备数量
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            results.supportsMultipleCameras = videoDevices.length > 1;

            if (!results.supportsMultipleCameras) {
                results.error = '设备只有一个摄像头，无法测试切换功能';
                return results;
            }

            const startTime = performance.now();

            // 测试前置摄像头
            try {
                const frontStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' } 
                });
                results.canSwitchToFront = true;
                frontStream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.warn('前置摄像头测试失败:', error);
            }

            // 测试后置摄像头
            try {
                const backStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                results.canSwitchToBack = true;
                backStream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.warn('后置摄像头测试失败:', error);
            }

            results.switchTime = performance.now() - startTime;

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    /**
     * 生成摄像头诊断报告
     */
    static async generateDiagnosticReport() {
        console.log('🔍 开始摄像头功能诊断...');

        const basicTest = await this.testBasicCameraAccess();
        const switchTest = await this.testCameraSwitching();

        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            basicFunctionality: basicTest,
            switchingFunctionality: switchTest,
            recommendations: this.generateRecommendations(basicTest, switchTest)
        };

        console.log('📋 摄像头诊断报告:', report);
        return report;
    }

    /**
     * 生成建议
     */
    static generateRecommendations(basicTest, switchTest) {
        const recommendations = [];

        if (!basicTest.hasMediaDevices) {
            recommendations.push('浏览器不支持MediaDevices API，请升级浏览器');
        }

        if (!basicTest.canAccessCamera) {
            recommendations.push('无法访问摄像头，请检查权限设置');
        }

        if (basicTest.deviceCount === 0) {
            recommendations.push('未检测到摄像头设备，请检查硬件连接');
        }

        if (basicTest.deviceCount === 1) {
            recommendations.push('只检测到一个摄像头，切换功能将不可用');
        }

        if (!switchTest.supportsMultipleCameras) {
            recommendations.push('设备不支持摄像头切换，考虑使用外接摄像头');
        }

        if (switchTest.switchTime > 3000) {
            recommendations.push('摄像头切换速度较慢，可能影响用户体验');
        }

        if (recommendations.length === 0) {
            recommendations.push('摄像头功能正常，所有测试通过');
        }

        return recommendations;
    }

    /**
     * 创建摄像头测试面板
     */
    static createTestPanel() {
        const panel = document.createElement('div');
        panel.id = 'camera-test-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
        `;

        panel.innerHTML = `
            <h3>📷 摄像头功能测试</h3>
            <button id="run-basic-test">基础功能测试</button>
            <button id="run-switch-test">切换功能测试</button>
            <button id="run-full-diagnostic">完整诊断</button>
            <button id="close-test-panel">关闭</button>
            <div id="test-results"></div>
        `;

        // 绑定事件
        panel.querySelector('#run-basic-test').onclick = async () => {
            const results = await this.testBasicCameraAccess();
            this.displayResults('基础功能测试结果', results);
        };

        panel.querySelector('#run-switch-test').onclick = async () => {
            const results = await this.testCameraSwitching();
            this.displayResults('切换功能测试结果', results);
        };

        panel.querySelector('#run-full-diagnostic').onclick = async () => {
            const report = await this.generateDiagnosticReport();
            this.displayResults('完整诊断报告', report);
        };

        panel.querySelector('#close-test-panel').onclick = () => {
            document.body.removeChild(panel);
        };

        document.body.appendChild(panel);
        return panel;
    }

    /**
     * 显示测试结果
     */
    static displayResults(title, results) {
        const resultsDiv = document.getElementById('test-results');
        resultsDiv.innerHTML = `
            <h4>${title}</h4>
            <pre>${JSON.stringify(results, null, 2)}</pre>
        `;
    }
}

// 添加全局快捷键来打开测试面板
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        // Ctrl+Shift+T 打开摄像头测试面板
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            CameraTestUtils.createTestPanel();
        }
    });
}