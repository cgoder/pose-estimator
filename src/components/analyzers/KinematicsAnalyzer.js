/**
 * 运动学分析器
 * 提供高级的运动学计算功能，包括速度、加速度、角速度等
 */
class KinematicsAnalyzer {
    constructor() {
        this.name = 'KinematicsAnalyzer';
        this.positionHistory = new Map(); // 存储每个关键点的位置历史
        this.velocityHistory = new Map(); // 存储速度历史
        this.accelerationHistory = new Map(); // 存储加速度历史
        this.angularVelocityHistory = new Map(); // 存储角速度历史
        this.maxHistoryLength = 30; // 最大历史长度
        this.smoothingFactor = 0.7; // 平滑因子
    }

    /**
     * 更新关键点的运动学数据
     * @param {Array} keypoints - 当前帧的关键点
     * @param {number} timestamp - 时间戳
     * @param {number} deltaTime - 时间间隔（毫秒）
     */
    updateKinematics(keypoints, timestamp, deltaTime = 33.33) {
        if (!keypoints || keypoints.length === 0) return;

        const deltaTimeSeconds = deltaTime / 1000; // 转换为秒

        keypoints.forEach((keypoint, index) => {
            if (!keypoint || typeof keypoint.x !== 'number' || typeof keypoint.y !== 'number') {
                return;
            }

            this._updatePointKinematics(index, keypoint, timestamp, deltaTimeSeconds);
        });

        // 清理过期数据
        this._cleanupHistory();
    }

    /**
     * 更新单个关键点的运动学数据
     */
    _updatePointKinematics(pointIndex, currentPosition, timestamp, deltaTime) {
        // 初始化历史记录
        if (!this.positionHistory.has(pointIndex)) {
            this.positionHistory.set(pointIndex, []);
            this.velocityHistory.set(pointIndex, []);
            this.accelerationHistory.set(pointIndex, []);
        }

        const positions = this.positionHistory.get(pointIndex);
        const velocities = this.velocityHistory.get(pointIndex);
        const accelerations = this.accelerationHistory.get(pointIndex);

        // 添加当前位置
        positions.push({
            x: currentPosition.x,
            y: currentPosition.y,
            timestamp
        });

        // 计算速度（需要至少2个位置点）
        if (positions.length >= 2) {
            const prevPosition = positions[positions.length - 2];
            const velocity = this._calculateVelocity(prevPosition, currentPosition, deltaTime);
            
            // 应用平滑滤波
            const smoothedVelocity = this._applySmoothing(velocity, velocities);
            velocities.push({
                ...smoothedVelocity,
                timestamp
            });

            // 计算加速度（需要至少2个速度点）
            if (velocities.length >= 2) {
                const prevVelocity = velocities[velocities.length - 2];
                const acceleration = this._calculateAcceleration(prevVelocity, smoothedVelocity, deltaTime);
                
                accelerations.push({
                    ...acceleration,
                    timestamp
                });
            }
        }

        // 限制历史长度
        this._limitHistoryLength(positions);
        this._limitHistoryLength(velocities);
        this._limitHistoryLength(accelerations);
    }

    /**
     * 计算速度
     */
    _calculateVelocity(prevPos, currPos, deltaTime) {
        if (deltaTime <= 0) return { x: 0, y: 0, magnitude: 0 };

        const vx = (currPos.x - prevPos.x) / deltaTime;
        const vy = (currPos.y - prevPos.y) / deltaTime;
        const magnitude = Math.sqrt(vx * vx + vy * vy);

        return { x: vx, y: vy, magnitude };
    }

    /**
     * 计算加速度
     */
    _calculateAcceleration(prevVel, currVel, deltaTime) {
        if (deltaTime <= 0) return { x: 0, y: 0, magnitude: 0 };

        const ax = (currVel.x - prevVel.x) / deltaTime;
        const ay = (currVel.y - prevVel.y) / deltaTime;
        const magnitude = Math.sqrt(ax * ax + ay * ay);

        return { x: ax, y: ay, magnitude };
    }

    /**
     * 应用平滑滤波
     */
    _applySmoothing(newValue, history) {
        if (history.length === 0) return newValue;

        const lastValue = history[history.length - 1];
        return {
            x: this.smoothingFactor * lastValue.x + (1 - this.smoothingFactor) * newValue.x,
            y: this.smoothingFactor * lastValue.y + (1 - this.smoothingFactor) * newValue.y,
            magnitude: this.smoothingFactor * lastValue.magnitude + (1 - this.smoothingFactor) * newValue.magnitude
        };
    }

    /**
     * 计算关节角速度
     * @param {number} joint - 关节点索引
     * @param {number} point1 - 第一个连接点索引
     * @param {number} point2 - 第二个连接点索引
     * @param {Array} keypoints - 当前关键点
     * @param {number} timestamp - 时间戳
     * @param {number} deltaTime - 时间间隔
     */
    calculateAngularVelocity(joint, point1, point2, keypoints, timestamp, deltaTime = 33.33) {
        const jointKey = `${joint}-${point1}-${point2}`;
        
        if (!this.angularVelocityHistory.has(jointKey)) {
            this.angularVelocityHistory.set(jointKey, []);
        }

        const history = this.angularVelocityHistory.get(jointKey);
        const currentAngle = this._calculateAngle(keypoints[point1], keypoints[joint], keypoints[point2]);

        if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            const angleDiff = this._normalizeAngleDifference(currentAngle - lastEntry.angle);
            const angularVelocity = angleDiff / (deltaTime / 1000); // 度/秒

            history.push({
                angle: currentAngle,
                angularVelocity,
                timestamp
            });

            this._limitHistoryLength(history);
            return angularVelocity;
        } else {
            history.push({
                angle: currentAngle,
                angularVelocity: 0,
                timestamp
            });
            return 0;
        }
    }

    /**
     * 计算角度
     */
    _calculateAngle(point1, vertex, point2) {
        if (!point1 || !vertex || !point2) return 0;
        
        const vector1 = {
            x: point1.x - vertex.x,
            y: point1.y - vertex.y
        };
        
        const vector2 = {
            x: point2.x - vertex.x,
            y: point2.y - vertex.y
        };
        
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        const cosAngle = dotProduct / (magnitude1 * magnitude2);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleRad = Math.acos(clampedCos);
        
        return angleRad * 180 / Math.PI;
    }

    /**
     * 标准化角度差值（处理角度跳跃）
     */
    _normalizeAngleDifference(angleDiff) {
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        return angleDiff;
    }

    /**
     * 获取关键点的当前速度
     */
    getVelocity(pointIndex) {
        const velocities = this.velocityHistory.get(pointIndex);
        if (!velocities || velocities.length === 0) return null;
        return velocities[velocities.length - 1];
    }

    /**
     * 获取关键点的当前加速度
     */
    getAcceleration(pointIndex) {
        const accelerations = this.accelerationHistory.get(pointIndex);
        if (!accelerations || accelerations.length === 0) return null;
        return accelerations[accelerations.length - 1];
    }

    /**
     * 获取关节的当前角速度
     */
    getAngularVelocity(joint, point1, point2) {
        const jointKey = `${joint}-${point1}-${point2}`;
        const history = this.angularVelocityHistory.get(jointKey);
        if (!history || history.length === 0) return null;
        return history[history.length - 1];
    }

    /**
     * 计算运动的平滑度（基于加速度变化）
     */
    calculateSmoothness(pointIndex, windowSize = 10) {
        const accelerations = this.accelerationHistory.get(pointIndex);
        if (!accelerations || accelerations.length < windowSize) return null;

        const recentAccelerations = accelerations.slice(-windowSize);
        const magnitudes = recentAccelerations.map(acc => acc.magnitude);
        
        // 计算加速度变化的标准差（越小越平滑）
        const mean = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
        const variance = magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitudes.length;
        const smoothness = 1 / (1 + Math.sqrt(variance)); // 转换为0-1的平滑度分数

        return smoothness;
    }

    /**
     * 检测运动模式（周期性、线性等）
     */
    detectMotionPattern(pointIndex, windowSize = 20) {
        const positions = this.positionHistory.get(pointIndex);
        if (!positions || positions.length < windowSize) return null;

        const recentPositions = positions.slice(-windowSize);
        
        // 检测周期性运动
        const periodicity = this._detectPeriodicity(recentPositions);
        
        // 检测运动方向
        const direction = this._detectDirection(recentPositions);
        
        // 检测运动幅度
        const amplitude = this._calculateAmplitude(recentPositions);

        return {
            periodicity,
            direction,
            amplitude,
            isRhythmic: periodicity > 0.7,
            isLinear: direction.consistency > 0.8
        };
    }

    /**
     * 检测周期性
     */
    _detectPeriodicity(positions) {
        if (positions.length < 10) return 0;

        const yValues = positions.map(pos => pos.y);
        const autocorrelation = this._calculateAutocorrelation(yValues);
        
        // 寻找最大的非零滞后自相关值
        let maxCorrelation = 0;
        for (let lag = 1; lag < autocorrelation.length / 2; lag++) {
            if (autocorrelation[lag] > maxCorrelation) {
                maxCorrelation = autocorrelation[lag];
            }
        }

        return maxCorrelation;
    }

    /**
     * 计算自相关
     */
    _calculateAutocorrelation(values) {
        const n = values.length;
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        
        const autocorr = [];
        for (let lag = 0; lag < n; lag++) {
            let sum = 0;
            for (let i = 0; i < n - lag; i++) {
                sum += (values[i] - mean) * (values[i + lag] - mean);
            }
            autocorr[lag] = sum / ((n - lag) * variance);
        }
        
        return autocorr;
    }

    /**
     * 检测运动方向
     */
    _detectDirection(positions) {
        if (positions.length < 2) return { angle: 0, consistency: 0 };

        const directions = [];
        for (let i = 1; i < positions.length; i++) {
            const dx = positions[i].x - positions[i-1].x;
            const dy = positions[i].y - positions[i-1].y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            directions.push(angle);
        }

        // 计算方向一致性
        const avgDirection = this._circularMean(directions);
        const consistency = this._calculateDirectionConsistency(directions, avgDirection);

        return {
            angle: avgDirection,
            consistency
        };
    }

    /**
     * 计算圆形平均值（用于角度）
     */
    _circularMean(angles) {
        let sumSin = 0, sumCos = 0;
        for (const angle of angles) {
            const rad = angle * Math.PI / 180;
            sumSin += Math.sin(rad);
            sumCos += Math.cos(rad);
        }
        return Math.atan2(sumSin, sumCos) * 180 / Math.PI;
    }

    /**
     * 计算方向一致性
     */
    _calculateDirectionConsistency(directions, avgDirection) {
        if (directions.length === 0) return 0;

        const deviations = directions.map(dir => {
            let diff = Math.abs(dir - avgDirection);
            if (diff > 180) diff = 360 - diff;
            return diff;
        });

        const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
        return Math.max(0, 1 - avgDeviation / 90); // 标准化到0-1
    }

    /**
     * 计算运动幅度
     */
    _calculateAmplitude(positions) {
        if (positions.length === 0) return 0;

        const xValues = positions.map(pos => pos.x);
        const yValues = positions.map(pos => pos.y);

        const xRange = Math.max(...xValues) - Math.min(...xValues);
        const yRange = Math.max(...yValues) - Math.min(...yValues);

        return Math.sqrt(xRange * xRange + yRange * yRange);
    }

    /**
     * 限制历史长度
     */
    _limitHistoryLength(history) {
        while (history.length > this.maxHistoryLength) {
            history.shift();
        }
    }

    /**
     * 清理过期历史数据
     */
    _cleanupHistory() {
        const currentTime = Date.now();
        const maxAge = 10000; // 10秒

        for (const [key, history] of this.positionHistory) {
            this._removeExpiredEntries(history, currentTime, maxAge);
        }
        for (const [key, history] of this.velocityHistory) {
            this._removeExpiredEntries(history, currentTime, maxAge);
        }
        for (const [key, history] of this.accelerationHistory) {
            this._removeExpiredEntries(history, currentTime, maxAge);
        }
        for (const [key, history] of this.angularVelocityHistory) {
            this._removeExpiredEntries(history, currentTime, maxAge);
        }
    }

    /**
     * 移除过期条目
     */
    _removeExpiredEntries(history, currentTime, maxAge) {
        while (history.length > 0 && (currentTime - history[0].timestamp) > maxAge) {
            history.shift();
        }
    }

    /**
     * 重置所有数据
     */
    reset() {
        this.positionHistory.clear();
        this.velocityHistory.clear();
        this.accelerationHistory.clear();
        this.angularVelocityHistory.clear();
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            trackedPoints: this.positionHistory.size,
            totalPositionEntries: Array.from(this.positionHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
            totalVelocityEntries: Array.from(this.velocityHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
            totalAccelerationEntries: Array.from(this.accelerationHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
            totalAngularVelocityEntries: Array.from(this.angularVelocityHistory.values()).reduce((sum, hist) => sum + hist.length, 0)
        };
    }
}

export default KinematicsAnalyzer;