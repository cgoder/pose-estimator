class PoseEstimator {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.video = null; // 内部创建的video元素，不显示
        this.detector = null;
        this.poseFilters = null;
        this.lastFilteredPose = null; // 用于存储上一帧的滤波结果

        // --- 可配置参数 ---
        this.filterOptions = {
            frequency: 30.0,       // 假设的刷新率
            minCutoff: 1.0,          // 最小截止频率
            beta: 0.5,               // 速度变化影响因子
            dCutoff: 1.0             // 导数截止频率
        };

        this.modelConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        this.flipHorizontal = false;
        this.keypointConfidenceThreshold = 0.3;
        this.showMonitoring = true; // 控制是否显示监控面板
    }

    // 设置参数控制事件监听器
    _setupParameterControls() {
        const applyButton = document.getElementById('applyParams');
        const resetButton = document.getElementById('resetParams');
        const toggleButton = document.getElementById('toggleMonitoring');
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this._updateFilterParameters();
            });
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this._resetToDefaultParameters();
            });
        }

        if (toggleButton) {
            const monitoringContent = document.getElementById('monitoring-content');

            // 初始化状态
            const updateVisibility = () => {
                if (monitoringContent) {
                    monitoringContent.style.display = this.showMonitoring ? 'block' : 'none';
                }
                toggleButton.textContent = this.showMonitoring ? '隐藏监控 (开启中)' : '显示监控 (已关闭)';
            };

            // 页面加载时立即执行一次以设置初始状态
            updateVisibility();

            toggleButton.addEventListener('click', () => {
                this.showMonitoring = !this.showMonitoring;
                updateVisibility();
            });
        }
    }
    
    // 更新滤波器参数
    _updateFilterParameters() {
        const frequency = parseFloat(document.getElementById('frequency').value);
        const minCutoff = parseFloat(document.getElementById('minCutoff').value);
        const beta = parseFloat(document.getElementById('beta').value);
        const dCutoff = parseFloat(document.getElementById('dCutoff').value);
        
        // 验证参数有效性
        if (isNaN(frequency) || isNaN(minCutoff) || isNaN(beta) || isNaN(dCutoff)) {
            alert('请输入有效的数值参数！');
            return;
        }
        
        // 更新参数
        this.filterOptions = { frequency, minCutoff, beta, dCutoff };
        
        // 重新初始化滤波器
        if (this.poseFilters) {
            const keypointCount = this.poseFilters.x.length;
            this._initFilters(keypointCount);
            console.log('滤波器参数已更新:', this.filterOptions);
        }
        
        alert('参数已应用！新的滤波器设置将在下一帧生效。');
    }
    
    // 重置为默认参数
    _resetToDefaultParameters() {
        document.getElementById('frequency').value = '30.0';
        document.getElementById('minCutoff').value = '1.0';
        document.getElementById('beta').value = '0.5';
        document.getElementById('dCutoff').value = '1.0';
        
        this._updateFilterParameters();
    }

    // 初始化滤波器
    _initFilters(keypointCount) {
        this.poseFilters = { x: [], y: [] };
        for (let i = 0; i < keypointCount; i++) {
            const { frequency, minCutoff, beta, dCutoff } = this.filterOptions;
            this.poseFilters.x.push(new OneEuroFilter(frequency, minCutoff, beta, dCutoff));
            this.poseFilters.y.push(new OneEuroFilter(frequency, minCutoff, beta, dCutoff));
        }
    }

    // 设置摄像头
    async _setupCamera() {
        // 创建隐藏的video元素用于获取摄像头流
        this.video = document.createElement('video');
        this.video.style.display = 'none';
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        document.body.appendChild(this.video);
        
        const stream = await navigator.mediaDevices.getUserMedia({ 'video': true });
        this.video.srcObject = stream;
        await new Promise((resolve) => {
            this.video.onloadedmetadata = () => resolve(this.video);
        });
        this.video.play();
        this.video.width = this.video.videoWidth;
        this.video.height = this.video.videoHeight;
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
    }

    // 加载模型
    async _loadModel() {
        this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet, 
            this.modelConfig
        );
    }

    // 实时检测循环
    _detectPoseInRealTime() {
        let frameCount = 0;
        const frame = async () => {
            try {
                // 记录开始时间
                const startTime = performance.now();
                
                const poses = await this.detector.estimatePoses(this.video, { flipHorizontal: this.flipHorizontal });
                
                // 记录姿态检测完成时间
                const poseDetectionTime = performance.now();
                
                const timestamp = performance.now() / 1000.0;

                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

                frameCount++;

                if (poses && poses.length > 0) {
                    const pose = poses[0];

                    if (!this.poseFilters) {
                        this._initFilters(pose.keypoints.length);
                        console.log('初始化滤波器完成');
                    }

                    const newFilteredKeypoints = [];

                    for (let i = 0; i < pose.keypoints.length; i++) {
                        const rawKeypoint = pose.keypoints[i];
                        let finalX, finalY;

                        if (rawKeypoint.score > this.keypointConfidenceThreshold) {
                            // 置信度高：正常滤波
                            finalX = this.poseFilters.x[i].filter(rawKeypoint.x, timestamp);
                            finalY = this.poseFilters.y[i].filter(rawKeypoint.y, timestamp);
                        } else {
                            // 置信度低：使用上一帧的可靠位置
                            if (this.lastFilteredPose) {
                                const lastGoodX = this.lastFilteredPose.keypoints[i].x;
                                const lastGoodY = this.lastFilteredPose.keypoints[i].y;
                                // 将旧的可靠位置重新输入滤波器，以保持状态连续性
                                finalX = this.poseFilters.x[i].filter(lastGoodX, timestamp);
                                finalY = this.poseFilters.y[i].filter(lastGoodY, timestamp);
                            } else {
                                // 如果没有历史记录（例如第一帧），则只能使用当前噪声数据
                                finalX = this.poseFilters.x[i].filter(rawKeypoint.x, timestamp);
                                finalY = this.poseFilters.y[i].filter(rawKeypoint.y, timestamp);
                            }
                        }

                        newFilteredKeypoints.push({
                            x: finalX,
                            y: finalY,
                            score: rawKeypoint.score, // 保留原始分数用于绘制
                            name: rawKeypoint.name
                        });
                    }

                    const filteredPose = { keypoints: newFilteredKeypoints };
                    this.lastFilteredPose = filteredPose; // 缓存当前帧结果，供下一帧使用

                    this._drawKeypoints(this.lastFilteredPose.keypoints);
                    this._drawSkeleton(this.lastFilteredPose.keypoints);
                } else if (frameCount % 30 === 0) {
                    console.log('未检测到姿态');
                }

                // 记录整帧处理完成时间
                const endTime = performance.now();
                
                // 计算各阶段耗时
                const poseDetectionDuration = poseDetectionTime - startTime;
                const totalDuration = endTime - startTime;
                const renderingDuration = endTime - poseDetectionTime;
                
                // 在画布上显示耗时信息
                this._drawPerformanceInfo(poseDetectionDuration, renderingDuration, totalDuration, frameCount);
                
                // 每30帧输出一次耗时统计到控制台
                if (frameCount % 30 === 0) {
                    console.log(`=== 第${frameCount}帧耗时统计 ===`);
                    console.log(`姿态检测耗时: ${poseDetectionDuration.toFixed(2)}ms`);
                    console.log(`渲染绘制耗时: ${renderingDuration.toFixed(2)}ms`);
                    console.log(`总处理耗时: ${totalDuration.toFixed(2)}ms`);
                    console.log(`帧率: ${(1000 / totalDuration).toFixed(1)} FPS`);
                }

                requestAnimationFrame(frame);
            } catch (error) {
                console.error('检测循环错误:', error);
                requestAnimationFrame(frame);
            }
        };
        frame();
    }

    // 绘制关键点
    _drawKeypoints(keypoints) {
        this.ctx.fillStyle = 'Red';
        this.ctx.strokeStyle = 'Red';
        this.ctx.lineWidth = 2;

        for (const keypoint of keypoints) {
            if (keypoint.score > this.keypointConfidenceThreshold) {
                const radius = 1.5 + keypoint.score * 4; // 半径根据置信度从1.5到5.5变化

                // 绘制点
                this.ctx.beginPath();
                this.ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
                this.ctx.fill();

                // 绘制置信度文本
                this.ctx.fillStyle = 'white';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(keypoint.score.toFixed(2), keypoint.x + 8, keypoint.y + 4);
                this.ctx.fillStyle = 'Red'; // 恢复填充颜色以绘制下一个点
            }
        }
    }

    // 绘制骨架
    _drawSkeleton(keypoints) {
        const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
        this.ctx.strokeStyle = 'Green';
        this.ctx.lineWidth = 2;

        adjacentPairs.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];
            if (kp1.score > this.keypointConfidenceThreshold && kp2.score > this.keypointConfidenceThreshold) {
                this.ctx.beginPath();
                this.ctx.moveTo(kp1.x, kp1.y);
                this.ctx.lineTo(kp2.x, kp2.y);
                this.ctx.stroke();
            }
        });
    }

    // 在画布上绘制性能信息
    _drawPerformanceInfo(poseDetectionDuration, renderingDuration, totalDuration, frameCount) {
        if (!this.showMonitoring) return; // 如果设置为不显示，则直接返回

        // 设置文本样式
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 200, 200);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        // 显示性能数据
        const fps = (1000 / totalDuration).toFixed(1);
        const lines = [
            `帧数: ${frameCount}`,
            `姿态检测: ${poseDetectionDuration.toFixed(2)}ms`,
            `渲染绘制: ${renderingDuration.toFixed(2)}ms`,
            `总耗时: ${totalDuration.toFixed(2)}ms`,
            `帧率: ${fps} FPS`,
            ``,
            `One Euro Filter 参数:`,
            `频率: ${this.filterOptions.frequency.toFixed(1)} Hz`,
            `最小截止: ${this.filterOptions.minCutoff.toFixed(1)} Hz`,
            `Beta: ${this.filterOptions.beta.toFixed(1)}`,
            `导数截止: ${this.filterOptions.dCutoff.toFixed(1)} Hz`
        ];
        
        lines.forEach((line, index) => {
            if (line === '') return; // 跳过空行
            if (line.includes('One Euro Filter')) {
                this.ctx.fillStyle = '#ffff99'; // 黄色标题
            } else {
                this.ctx.fillStyle = 'white';
            }
            this.ctx.fillText(line, 20, 30 + index * 16);
        });
    }

    // 公共启动方法
    async start() {
        // 设置参数控制事件监听器（确保DOM已加载）
        this._setupParameterControls();
        
        await this._setupCamera();
        await this._loadModel();
        this._detectPoseInRealTime();
    }
}

// --- Main Execution ---
async function main() {
    const canvas = document.getElementById('canvas');
    const estimator = new PoseEstimator(canvas);
    await estimator.start();
}

// 确保DOM完全加载后再执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}