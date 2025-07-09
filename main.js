// TensorFlow.js 模型缓存管理器
class ModelCacheManager {
    constructor() {
        this.modelCache = new Map();
        this.dbName = 'PoseEstimatorCache';
        this.dbVersion = 1;
        this.modelVersion = '1.0.0';
        this.db = null;
    }

    // 初始化IndexedDB
    async initDB() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('models')) {
                    const store = db.createObjectStore('models', { keyPath: 'id' });
                    store.createIndex('version', 'version', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // 生成缓存键
    _getCacheKey(modelType, config) {
        return `${modelType}_${JSON.stringify(config)}_${this.modelVersion}`;
    }

    // 从内存缓存获取模型
    getFromMemoryCache(cacheKey) {
        return this.modelCache.get(cacheKey);
    }

    // 存储到内存缓存
    setToMemoryCache(cacheKey, detector) {
        this.modelCache.set(cacheKey, detector);
        console.log(`模型已缓存到内存: ${cacheKey}`);
    }

    // 从IndexedDB获取模型元数据
    async getFromDB(cacheKey) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['models'], 'readonly');
            const store = transaction.objectStore('models');
            const request = store.get(cacheKey);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && this._isValidCache(result)) {
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 存储模型元数据到IndexedDB
    async saveToDB(cacheKey, modelData) {
        if (!this.db) await this.initDB();
        
        const data = {
            id: cacheKey,
            version: this.modelVersion,
            timestamp: Date.now(),
            modelData: modelData
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');
            const request = store.put(data);
            
            request.onsuccess = () => {
                console.log(`模型元数据已保存到IndexedDB: ${cacheKey}`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 检查缓存是否有效（7天过期）
    _isValidCache(cacheData) {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
        return (Date.now() - cacheData.timestamp) < maxAge && 
               cacheData.version === this.modelVersion;
    }

    // 清理过期缓存
    async cleanExpiredCache() {
        if (!this.db) await this.initDB();
        
        const transaction = this.db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (!this._isValidCache(cursor.value)) {
                    cursor.delete();
                    console.log(`已删除过期缓存: ${cursor.value.id}`);
                }
                cursor.continue();
            }
        };
    }

    // 预加载模型
    async preloadModel(modelType, config) {
        const cacheKey = this._getCacheKey(modelType, config);
        
        // 检查内存缓存
        if (this.getFromMemoryCache(cacheKey)) {
            console.log(`模型已在内存中: ${cacheKey}`);
            return this.getFromMemoryCache(cacheKey);
        }
        
        console.log(`开始预加载模型: ${cacheKey}`);
        const startTime = performance.now();
        
        try {
            const detector = await poseDetection.createDetector(modelType, config);
            this.setToMemoryCache(cacheKey, detector);
            
            const loadTime = performance.now() - startTime;
            console.log(`模型预加载完成，耗时: ${loadTime.toFixed(2)}ms`);
            
            // 保存元数据到IndexedDB
            await this.saveToDB(cacheKey, {
                modelType: modelType,
                config: config,
                loadTime: loadTime
            });
            
            return detector;
        } catch (error) {
            console.error('模型预加载失败:', error);
            throw error;
        }
    }

    // 获取或创建模型
    async getOrCreateModel(modelType, config) {
        const cacheKey = this._getCacheKey(modelType, config);
        
        // 1. 检查内存缓存
        const cachedDetector = this.getFromMemoryCache(cacheKey);
        if (cachedDetector) {
            console.log(`使用内存缓存的模型: ${cacheKey}`);
            return cachedDetector;
        }
        
        // 2. 检查IndexedDB缓存
        const dbCache = await this.getFromDB(cacheKey);
        if (dbCache) {
            console.log(`发现IndexedDB缓存，重新加载模型: ${cacheKey}`);
            // 从缓存信息重新创建模型
            return await this.preloadModel(modelType, config);
        }
        
        // 3. 创建新模型
        console.log(`创建新模型: ${cacheKey}`);
        return await this.preloadModel(modelType, config);
    }
}

// 全局模型缓存管理器实例
const modelCacheManager = new ModelCacheManager();

class PoseEstimator {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.video = null; // 创建隐藏的video元素用于处理摄像头流
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
        // 创建隐藏的video元素用于处理摄像头流
        this.video = document.createElement('video');
        this.video.id = 'video'; // 设置id为video
        this.video.style.display = 'none'; // 确保不显示video画布
        this.video.style.visibility = 'hidden'; // 额外隐藏属性
        this.video.style.position = 'absolute'; // 绝对定位
        this.video.style.left = '-9999px'; // 移出视窗
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        document.body.appendChild(this.video);
        
        // 获取摄像头流
        this.stream = await navigator.mediaDevices.getUserMedia({ 'video': true });
        this.video.srcObject = this.stream;
        
        // 等待视频元数据加载完成
        await new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                console.log('视频元数据已加载');
                resolve(this.video);
            };
        });
        
        // 开始播放视频
        await this.video.play();
        
        // 等待视频真正开始播放并有数据
        await new Promise((resolve) => {
            const checkVideoReady = () => {
                if (this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                    console.log('视频已准备好播放');
                    resolve();
                } else {
                    setTimeout(checkVideoReady, 100);
                }
            };
            checkVideoReady();
        });
        
        // 设置canvas尺寸与视频流一致
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        console.log(`摄像头已设置，分辨率: ${this.video.videoWidth}x${this.video.videoHeight}`);
    }

    // 加载模型（使用缓存优化）
    async _loadModel() {
        const startTime = performance.now();
        console.log('开始加载姿态检测模型...');
        
        try {
            // 使用缓存管理器获取或创建模型
            this.detector = await modelCacheManager.getOrCreateModel(
                poseDetection.SupportedModels.MoveNet,
                this.modelConfig
            );
            
            const loadTime = performance.now() - startTime;
            console.log(`模型加载完成，总耗时: ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('模型加载失败:', error);
            throw error;
        }
    }
    
    // 预加载模型（可在页面加载时调用）
    static async preloadModels() {
        console.log('开始预加载TensorFlow.js模型...');
        
        const configs = [
            {
                modelType: poseDetection.SupportedModels.MoveNet,
                config: { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
            },
            {
                modelType: poseDetection.SupportedModels.MoveNet,
                config: { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
            }
        ];
        
        const preloadPromises = configs.map(({ modelType, config }) => 
            modelCacheManager.preloadModel(modelType, config).catch(error => {
                console.warn(`预加载模型失败 ${modelType}:`, error);
                return null;
            })
        );
        
        await Promise.allSettled(preloadPromises);
        console.log('模型预加载完成');
        
        // 清理过期缓存
        await modelCacheManager.cleanExpiredCache();
    }

    // 实时检测循环
    _detectPoseInRealTime() {
        let frameCount = 0;
        const frame = async () => {
            try {
                // 检查video元素是否准备好
                if (!this.video || this.video.readyState < 2) {
                    requestAnimationFrame(frame);
                    return;
                }
                
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
                // if (frameCount % 30 === 0) {
                //     console.log(`=== 第${frameCount}帧耗时统计 ===`);
                //     console.log(`姿态检测耗时: ${poseDetectionDuration.toFixed(2)}ms`);
                //     console.log(`渲染绘制耗时: ${renderingDuration.toFixed(2)}ms`);
                //     console.log(`总处理耗时: ${totalDuration.toFixed(2)}ms`);
                //     console.log(`帧率: ${(1000 / totalDuration).toFixed(1)} FPS`);
                // }

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
        this.ctx.fillRect(10, 10, 220, 240);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        // 显示性能数据
        const fps = (1000 / totalDuration).toFixed(1);
        const memoryUsage = performance.memory ? 
            `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB` : 'N/A';
        
        const lines = [
            `帧数: ${frameCount}`,
            `姿态检测: ${poseDetectionDuration.toFixed(2)}ms`,
            `渲染绘制: ${renderingDuration.toFixed(2)}ms`,
            `总耗时: ${totalDuration.toFixed(2)}ms`,
            `帧率: ${fps} FPS`,
            `内存使用: ${memoryUsage}`,
            ``,
            `模型缓存状态:`,
            `内存缓存: ${modelCacheManager.modelCache.size} 个模型`,
            `数据库: ${modelCacheManager.db ? '已连接' : '未连接'}`,
            ``,
            `One Euro Filter 参数:`,
            `频率: ${this.filterOptions.frequency.toFixed(1)} Hz`,
            `最小截止: ${this.filterOptions.minCutoff.toFixed(1)} Hz`,
            `Beta: ${this.filterOptions.beta.toFixed(1)}`,
            `导数截止: ${this.filterOptions.dCutoff.toFixed(1)} Hz`
        ];
        
        lines.forEach((line, index) => {
            if (line === '') return; // 跳过空行
            if (line.includes('One Euro Filter') || line.includes('模型缓存状态')) {
                this.ctx.fillStyle = '#ffff99'; // 黄色标题
            } else {
                this.ctx.fillStyle = 'white';
            }
            this.ctx.fillText(line, 20, 30 + index * 16);
        });
    }

    // 清理资源
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video && this.video.parentNode) {
            this.video.parentNode.removeChild(this.video);
            this.video = null;
        }
        
        console.log('摄像头资源已清理');
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

// 全局变量用于存储估计器实例
let globalEstimator = null;

// 显示加载状态
function showLoadingStatus(message) {
    const statusElement = document.getElementById('loading-status');
    const messageElement = document.getElementById('loading-message');
    if (statusElement && messageElement) {
        messageElement.textContent = message;
        statusElement.style.display = 'block';
    }
    console.log(message);
}

function hideLoadingStatus() {
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// --- Main Execution ---
async function main() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas元素未找到');
        return;
    }
    
    try {
        // 1. 初始化缓存管理器
        showLoadingStatus('初始化缓存系统...');
        await modelCacheManager.initDB();
        
        // 2. 预加载模型（后台进行）
        showLoadingStatus('预加载AI模型...');
        const preloadPromise = PoseEstimator.preloadModels();
        
        // 3. 创建姿态估计器实例
        globalEstimator = new PoseEstimator(canvas);
        
        // 4. 等待预加载完成（如果还没完成）
        await preloadPromise;
        
        // 5. 启动姿态估计器
        showLoadingStatus('启动摄像头和AI检测...');
        await globalEstimator.start();
        
        hideLoadingStatus();
        console.log('姿态估计器启动成功');
        
        // 显示缓存统计信息
        const cacheStats = {
            memoryCache: modelCacheManager.modelCache.size,
            dbInitialized: !!modelCacheManager.db
        };
        console.log('缓存统计:', cacheStats);
        
    } catch (error) {
        console.error('启动姿态估计器失败:', error);
        hideLoadingStatus();
        alert('启动失败，请检查摄像头权限或刷新页面重试');
    }
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (globalEstimator) {
        globalEstimator.cleanup();
    }
});

// 页面隐藏时暂停摄像头（可选的优化）
document.addEventListener('visibilitychange', () => {
    if (globalEstimator && globalEstimator.video) {
        if (document.hidden) {
            globalEstimator.video.pause();
        } else {
            globalEstimator.video.play();
        }
    }
});

// 确保DOM完全加载后再执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}