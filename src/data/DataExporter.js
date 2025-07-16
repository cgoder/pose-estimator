/**
 * 数据导出器
 * 负责导出姿态检测数据、分析结果和统计信息
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

export class DataExporter {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 导出格式
            defaultFormat: options.defaultFormat || 'json',
            supportedFormats: options.supportedFormats || ['json', 'csv', 'xml', 'txt'],
            
            // 数据选项
            includeRawData: options.includeRawData !== false,
            includeAnalysis: options.includeAnalysis !== false,
            includeStatistics: options.includeStatistics !== false,
            includeMetadata: options.includeMetadata !== false,
            
            // 压缩选项
            enableCompression: options.enableCompression || false,
            compressionLevel: options.compressionLevel || 6,
            
            // 文件选项
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
            chunkSize: options.chunkSize || 1000, // 记录数
            
            // 时间戳选项
            timestampFormat: options.timestampFormat || 'iso',
            timezone: options.timezone || 'local',
            
            // 过滤选项
            minConfidence: options.minConfidence || 0,
            dateRange: options.dateRange || null,
            keypointFilter: options.keypointFilter || null,
            
            // 隐私选项
            anonymize: options.anonymize || false,
            removePersonalData: options.removePersonalData || false,
            
            // 调试选项
            debug: options.debug || false,
            
            ...options
        };
        
        // 导出历史
        this.exportHistory = [];
        this.maxHistorySize = 100;
        
        // 统计信息
        this.stats = {
            totalExports: 0,
            totalDataExported: 0,
            averageExportTime: 0,
            exportsByFormat: {},
            lastExportTime: null
        };
        
        // 工具实例
        this.logger = new Logger({ prefix: 'DataExporter' });
        this.eventBus = EventBus.getInstance();
        
        // 格式处理器
        this.formatHandlers = new Map();
        
        this.init();
    }
    
    /**
     * 初始化数据导出器
     */
    init() {
        try {
            // 注册默认格式处理器
            this.registerFormatHandlers();
            
            if (this.options.debug) {
                this.logger.info('数据导出器已初始化', this.options);
            }
            
        } catch (error) {
            this.logger.error('数据导出器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 注册格式处理器
     */
    registerFormatHandlers() {
        // JSON格式处理器
        this.formatHandlers.set('json', {
            export: this.exportToJSON.bind(this),
            extension: '.json',
            mimeType: 'application/json'
        });
        
        // CSV格式处理器
        this.formatHandlers.set('csv', {
            export: this.exportToCSV.bind(this),
            extension: '.csv',
            mimeType: 'text/csv'
        });
        
        // XML格式处理器
        this.formatHandlers.set('xml', {
            export: this.exportToXML.bind(this),
            extension: '.xml',
            mimeType: 'application/xml'
        });
        
        // TXT格式处理器
        this.formatHandlers.set('txt', {
            export: this.exportToTXT.bind(this),
            extension: '.txt',
            mimeType: 'text/plain'
        });
    }
    
    /**
     * 导出数据
     * @param {Object} data - 要导出的数据
     * @param {Object} options - 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    async exportData(data, options = {}) {
        const startTime = performance.now();
        
        try {
            // 合并选项
            const exportOptions = { ...this.options, ...options };
            
            // 验证数据
            if (!data || typeof data !== 'object') {
                throw new Error('无效的导出数据');
            }
            
            // 验证格式
            const format = exportOptions.format || this.options.defaultFormat;
            if (!this.formatHandlers.has(format)) {
                throw new Error(`不支持的导出格式: ${format}`);
            }
            
            // 预处理数据
            const processedData = await this.preprocessData(data, exportOptions);
            
            // 检查数据大小
            const dataSize = this.estimateDataSize(processedData);
            if (dataSize > exportOptions.maxFileSize) {
                return await this.exportLargeData(processedData, exportOptions);
            }
            
            // 执行导出
            const handler = this.formatHandlers.get(format);
            const exportedData = await handler.export(processedData, exportOptions);
            
            // 创建导出结果
            const result = {
                data: exportedData,
                format,
                size: exportedData.length,
                timestamp: Date.now(),
                filename: this.generateFilename(format, exportOptions),
                mimeType: handler.mimeType,
                metadata: {
                    recordCount: this.countRecords(processedData),
                    exportTime: performance.now() - startTime,
                    options: exportOptions
                }
            };
            
            // 更新统计信息
            this.updateStats(result);
            
            // 记录导出历史
            this.addToHistory(result);
            
            // 触发事件
            this.eventBus.emit('dataExported', result);
            
            if (this.options.debug) {
                this.logger.info('数据导出完成', {
                    format,
                    size: result.size,
                    recordCount: result.metadata.recordCount,
                    exportTime: result.metadata.exportTime
                });
            }
            
            return result;
            
        } catch (error) {
            this.logger.error('数据导出失败:', error);
            throw error;
        }
    }
    
    /**
     * 预处理数据
     * @param {Object} data - 原始数据
     * @param {Object} options - 处理选项
     * @returns {Object} 处理后的数据
     */
    async preprocessData(data, options) {
        let processedData = { ...data };
        
        // 应用过滤器
        if (options.minConfidence > 0) {
            processedData = this.filterByConfidence(processedData, options.minConfidence);
        }
        
        if (options.dateRange) {
            processedData = this.filterByDateRange(processedData, options.dateRange);
        }
        
        if (options.keypointFilter) {
            processedData = this.filterByKeypoints(processedData, options.keypointFilter);
        }
        
        // 处理隐私选项
        if (options.anonymize) {
            processedData = this.anonymizeData(processedData);
        }
        
        if (options.removePersonalData) {
            processedData = this.removePersonalData(processedData);
        }
        
        // 添加元数据
        if (options.includeMetadata) {
            processedData.metadata = this.generateMetadata(data, options);
        }
        
        return processedData;
    }
    
    /**
     * 按置信度过滤
     * @param {Object} data - 数据
     * @param {number} minConfidence - 最小置信度
     * @returns {Object} 过滤后的数据
     */
    filterByConfidence(data, minConfidence) {
        const filtered = { ...data };
        
        // 过滤姿态数据
        if (data.poses) {
            filtered.poses = data.poses.map(pose => ({
                ...pose,
                keypoints: pose.keypoints ? pose.keypoints.filter(kp => kp.score >= minConfidence) : []
            })).filter(pose => pose.keypoints.length > 0);
        }
        
        // 过滤轨迹数据
        if (data.trajectories) {
            filtered.trajectories = {};
            for (const [key, trajectory] of Object.entries(data.trajectories)) {
                const filteredTrajectory = trajectory.filter(point => point.confidence >= minConfidence);
                if (filteredTrajectory.length > 0) {
                    filtered.trajectories[key] = filteredTrajectory;
                }
            }
        }
        
        return filtered;
    }
    
    /**
     * 按日期范围过滤
     * @param {Object} data - 数据
     * @param {Object} dateRange - 日期范围 {start, end}
     * @returns {Object} 过滤后的数据
     */
    filterByDateRange(data, dateRange) {
        const { start, end } = dateRange;
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        
        const filtered = { ...data };
        
        // 过滤带时间戳的数据
        if (data.poses) {
            filtered.poses = data.poses.filter(pose => {
                const timestamp = pose.timestamp || pose.time;
                return timestamp >= startTime && timestamp <= endTime;
            });
        }
        
        if (data.trajectories) {
            filtered.trajectories = {};
            for (const [key, trajectory] of Object.entries(data.trajectories)) {
                const filteredTrajectory = trajectory.filter(point => {
                    const timestamp = point.timestamp || point.time;
                    return timestamp >= startTime && timestamp <= endTime;
                });
                if (filteredTrajectory.length > 0) {
                    filtered.trajectories[key] = filteredTrajectory;
                }
            }
        }
        
        return filtered;
    }
    
    /**
     * 按关键点过滤
     * @param {Object} data - 数据
     * @param {Array} keypointFilter - 关键点过滤器
     * @returns {Object} 过滤后的数据
     */
    filterByKeypoints(data, keypointFilter) {
        const filtered = { ...data };
        
        if (data.poses) {
            filtered.poses = data.poses.map(pose => ({
                ...pose,
                keypoints: pose.keypoints ? pose.keypoints.filter((kp, index) => 
                    keypointFilter.includes(index) || keypointFilter.includes(kp.name)
                ) : []
            }));
        }
        
        if (data.trajectories) {
            filtered.trajectories = {};
            for (const [key, trajectory] of Object.entries(data.trajectories)) {
                if (keypointFilter.includes(key) || keypointFilter.some(filter => key.includes(filter))) {
                    filtered.trajectories[key] = trajectory;
                }
            }
        }
        
        return filtered;
    }
    
    /**
     * 匿名化数据
     * @param {Object} data - 数据
     * @returns {Object} 匿名化后的数据
     */
    anonymizeData(data) {
        const anonymized = { ...data };
        
        // 移除或替换可识别信息
        delete anonymized.userId;
        delete anonymized.sessionId;
        delete anonymized.deviceId;
        delete anonymized.location;
        
        // 添加随机ID
        anonymized.anonymousId = this.generateAnonymousId();
        
        return anonymized;
    }
    
    /**
     * 移除个人数据
     * @param {Object} data - 数据
     * @returns {Object} 处理后的数据
     */
    removePersonalData(data) {
        const cleaned = { ...data };
        
        // 移除个人信息字段
        const personalFields = ['name', 'email', 'phone', 'address', 'ip', 'userAgent'];
        personalFields.forEach(field => delete cleaned[field]);
        
        return cleaned;
    }
    
    /**
     * 生成元数据
     * @param {Object} data - 原始数据
     * @param {Object} options - 选项
     * @returns {Object} 元数据
     */
    generateMetadata(data, options) {
        return {
            exportTime: new Date().toISOString(),
            exportVersion: '1.0.0',
            dataVersion: data.version || '1.0.0',
            recordCount: this.countRecords(data),
            dataTypes: this.getDataTypes(data),
            filters: {
                minConfidence: options.minConfidence,
                dateRange: options.dateRange,
                keypointFilter: options.keypointFilter
            },
            options: {
                format: options.format,
                includeRawData: options.includeRawData,
                includeAnalysis: options.includeAnalysis,
                includeStatistics: options.includeStatistics
            }
        };
    }
    
    /**
     * 估算数据大小
     * @param {Object} data - 数据
     * @returns {number} 估算大小（字节）
     */
    estimateDataSize(data) {
        try {
            return JSON.stringify(data).length * 2; // 估算，考虑编码开销
        } catch (error) {
            this.logger.warn('无法估算数据大小:', error);
            return 0;
        }
    }
    
    /**
     * 导出大数据
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 导出结果
     */
    async exportLargeData(data, options) {
        const chunks = this.chunkData(data, options.chunkSize);
        const results = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkOptions = {
                ...options,
                filename: `${options.filename || 'export'}_part${i + 1}`
            };
            
            const handler = this.formatHandlers.get(options.format);
            const exportedChunk = await handler.export(chunk, chunkOptions);
            
            results.push({
                data: exportedChunk,
                part: i + 1,
                totalParts: chunks.length,
                filename: this.generateFilename(options.format, chunkOptions)
            });
        }
        
        return {
            type: 'chunked',
            parts: results,
            totalParts: chunks.length,
            format: options.format,
            timestamp: Date.now()
        };
    }
    
    /**
     * 分块数据
     * @param {Object} data - 数据
     * @param {number} chunkSize - 块大小
     * @returns {Array} 数据块
     */
    chunkData(data, chunkSize) {
        const chunks = [];
        
        // 分块姿态数据
        if (data.poses && data.poses.length > chunkSize) {
            for (let i = 0; i < data.poses.length; i += chunkSize) {
                const chunk = {
                    ...data,
                    poses: data.poses.slice(i, i + chunkSize)
                };
                chunks.push(chunk);
            }
        } else {
            chunks.push(data);
        }
        
        return chunks;
    }
    
    /**
     * 导出为JSON格式
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {string} JSON字符串
     */
    async exportToJSON(data, options) {
        const jsonData = {
            version: '1.0.0',
            timestamp: this.formatTimestamp(Date.now(), options),
            ...data
        };
        
        return JSON.stringify(jsonData, null, options.pretty ? 2 : 0);
    }
    
    /**
     * 导出为CSV格式
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {string} CSV字符串
     */
    async exportToCSV(data, options) {
        const lines = [];
        
        // 导出姿态数据
        if (data.poses && data.poses.length > 0) {
            // CSV头部
            const headers = ['timestamp', 'pose_id', 'keypoint_index', 'keypoint_name', 'x', 'y', 'z', 'confidence'];
            lines.push(headers.join(','));
            
            // 数据行
            for (let poseIndex = 0; poseIndex < data.poses.length; poseIndex++) {
                const pose = data.poses[poseIndex];
                const timestamp = this.formatTimestamp(pose.timestamp || Date.now(), options);
                
                if (pose.keypoints) {
                    for (let kpIndex = 0; kpIndex < pose.keypoints.length; kpIndex++) {
                        const kp = pose.keypoints[kpIndex];
                        const row = [
                            timestamp,
                            poseIndex,
                            kpIndex,
                            kp.name || `keypoint_${kpIndex}`,
                            kp.x || 0,
                            kp.y || 0,
                            kp.z || 0,
                            kp.score || kp.confidence || 0
                        ];
                        lines.push(row.join(','));
                    }
                }
            }
        }
        
        // 导出轨迹数据
        if (data.trajectories && Object.keys(data.trajectories).length > 0) {
            if (lines.length > 0) {
                lines.push(''); // 空行分隔
                lines.push('# Trajectory Data');
            }
            
            const headers = ['timestamp', 'keypoint', 'x', 'y', 'z', 'confidence', 'type'];
            lines.push(headers.join(','));
            
            for (const [keypointName, trajectory] of Object.entries(data.trajectories)) {
                for (const point of trajectory) {
                    const row = [
                        this.formatTimestamp(point.timestamp, options),
                        keypointName,
                        point.x,
                        point.y,
                        point.z || 0,
                        point.confidence || point.score || 0,
                        point.type || 'raw'
                    ];
                    lines.push(row.join(','));
                }
            }
        }
        
        return lines.join('\n');
    }
    
    /**
     * 导出为XML格式
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {string} XML字符串
     */
    async exportToXML(data, options) {
        const xmlLines = [];
        
        xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
        xmlLines.push('<pose_data>');
        xmlLines.push(`  <metadata>`);
        xmlLines.push(`    <version>1.0.0</version>`);
        xmlLines.push(`    <timestamp>${this.formatTimestamp(Date.now(), options)}</timestamp>`);
        xmlLines.push(`    <record_count>${this.countRecords(data)}</record_count>`);
        xmlLines.push(`  </metadata>`);
        
        // 导出姿态数据
        if (data.poses && data.poses.length > 0) {
            xmlLines.push('  <poses>');
            
            for (let poseIndex = 0; poseIndex < data.poses.length; poseIndex++) {
                const pose = data.poses[poseIndex];
                xmlLines.push(`    <pose id="${poseIndex}" timestamp="${this.formatTimestamp(pose.timestamp || Date.now(), options)}">`);
                
                if (pose.keypoints) {
                    xmlLines.push('      <keypoints>');
                    
                    for (let kpIndex = 0; kpIndex < pose.keypoints.length; kpIndex++) {
                        const kp = pose.keypoints[kpIndex];
                        xmlLines.push(`        <keypoint index="${kpIndex}" name="${kp.name || `keypoint_${kpIndex}`}">`);
                        xmlLines.push(`          <x>${kp.x || 0}</x>`);
                        xmlLines.push(`          <y>${kp.y || 0}</y>`);
                        xmlLines.push(`          <z>${kp.z || 0}</z>`);
                        xmlLines.push(`          <confidence>${kp.score || kp.confidence || 0}</confidence>`);
                        xmlLines.push('        </keypoint>');
                    }
                    
                    xmlLines.push('      </keypoints>');
                }
                
                xmlLines.push('    </pose>');
            }
            
            xmlLines.push('  </poses>');
        }
        
        // 导出轨迹数据
        if (data.trajectories && Object.keys(data.trajectories).length > 0) {
            xmlLines.push('  <trajectories>');
            
            for (const [keypointName, trajectory] of Object.entries(data.trajectories)) {
                xmlLines.push(`    <trajectory keypoint="${keypointName}">`);
                
                for (const point of trajectory) {
                    xmlLines.push(`      <point timestamp="${this.formatTimestamp(point.timestamp, options)}">`);
                    xmlLines.push(`        <x>${point.x}</x>`);
                    xmlLines.push(`        <y>${point.y}</y>`);
                    xmlLines.push(`        <z>${point.z || 0}</z>`);
                    xmlLines.push(`        <confidence>${point.confidence || point.score || 0}</confidence>`);
                    xmlLines.push(`        <type>${point.type || 'raw'}</type>`);
                    xmlLines.push('      </point>');
                }
                
                xmlLines.push('    </trajectory>');
            }
            
            xmlLines.push('  </trajectories>');
        }
        
        xmlLines.push('</pose_data>');
        
        return xmlLines.join('\n');
    }
    
    /**
     * 导出为TXT格式
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {string} TXT字符串
     */
    async exportToTXT(data, options) {
        const lines = [];
        
        lines.push('=== 姿态检测数据导出 ===');
        lines.push(`导出时间: ${this.formatTimestamp(Date.now(), options)}`);
        lines.push(`数据版本: 1.0.0`);
        lines.push(`记录数量: ${this.countRecords(data)}`);
        lines.push('');
        
        // 导出姿态数据
        if (data.poses && data.poses.length > 0) {
            lines.push('=== 姿态数据 ===');
            
            for (let poseIndex = 0; poseIndex < data.poses.length; poseIndex++) {
                const pose = data.poses[poseIndex];
                lines.push(`姿态 ${poseIndex + 1}:`);
                lines.push(`  时间戳: ${this.formatTimestamp(pose.timestamp || Date.now(), options)}`);
                
                if (pose.keypoints) {
                    lines.push('  关键点:');
                    
                    for (let kpIndex = 0; kpIndex < pose.keypoints.length; kpIndex++) {
                        const kp = pose.keypoints[kpIndex];
                        lines.push(`    ${kpIndex + 1}. ${kp.name || `关键点_${kpIndex}`}: (${kp.x || 0}, ${kp.y || 0}, ${kp.z || 0}) 置信度: ${kp.score || kp.confidence || 0}`);
                    }
                }
                
                lines.push('');
            }
        }
        
        // 导出统计信息
        if (data.statistics) {
            lines.push('=== 统计信息 ===');
            
            for (const [key, value] of Object.entries(data.statistics)) {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            }
            
            lines.push('');
        }
        
        return lines.join('\n');
    }
    
    /**
     * 格式化时间戳
     * @param {number} timestamp - 时间戳
     * @param {Object} options - 选项
     * @returns {string} 格式化的时间戳
     */
    formatTimestamp(timestamp, options) {
        const date = new Date(timestamp);
        
        switch (options.timestampFormat) {
            case 'iso':
                return date.toISOString();
            case 'unix':
                return Math.floor(timestamp / 1000).toString();
            case 'local':
                return date.toLocaleString();
            case 'utc':
                return date.toUTCString();
            default:
                return date.toISOString();
        }
    }
    
    /**
     * 计算记录数量
     * @param {Object} data - 数据
     * @returns {number} 记录数量
     */
    countRecords(data) {
        let count = 0;
        
        if (data.poses) {
            count += data.poses.length;
        }
        
        if (data.trajectories) {
            for (const trajectory of Object.values(data.trajectories)) {
                count += trajectory.length;
            }
        }
        
        return count;
    }
    
    /**
     * 获取数据类型
     * @param {Object} data - 数据
     * @returns {Array} 数据类型列表
     */
    getDataTypes(data) {
        const types = [];
        
        if (data.poses) types.push('poses');
        if (data.trajectories) types.push('trajectories');
        if (data.analysis) types.push('analysis');
        if (data.statistics) types.push('statistics');
        if (data.biomechanics) types.push('biomechanics');
        
        return types;
    }
    
    /**
     * 生成文件名
     * @param {string} format - 格式
     * @param {Object} options - 选项
     * @returns {string} 文件名
     */
    generateFilename(format, options) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const basename = options.filename || `pose_data_${timestamp}`;
        const extension = this.formatHandlers.get(format).extension;
        
        return `${basename}${extension}`;
    }
    
    /**
     * 生成匿名ID
     * @returns {string} 匿名ID
     */
    generateAnonymousId() {
        return 'anon_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 更新统计信息
     * @param {Object} result - 导出结果
     */
    updateStats(result) {
        this.stats.totalExports++;
        this.stats.totalDataExported += result.size;
        this.stats.lastExportTime = result.timestamp;
        
        // 更新平均导出时间
        const exportTime = result.metadata.exportTime;
        this.stats.averageExportTime = 
            (this.stats.averageExportTime * (this.stats.totalExports - 1) + exportTime) / this.stats.totalExports;
        
        // 更新格式统计
        if (!this.stats.exportsByFormat[result.format]) {
            this.stats.exportsByFormat[result.format] = 0;
        }
        this.stats.exportsByFormat[result.format]++;
    }
    
    /**
     * 添加到历史记录
     * @param {Object} result - 导出结果
     */
    addToHistory(result) {
        const historyEntry = {
            timestamp: result.timestamp,
            format: result.format,
            filename: result.filename,
            size: result.size,
            recordCount: result.metadata.recordCount,
            exportTime: result.metadata.exportTime
        };
        
        this.exportHistory.unshift(historyEntry);
        
        // 限制历史记录大小
        if (this.exportHistory.length > this.maxHistorySize) {
            this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * 下载数据
     * @param {Object} result - 导出结果
     */
    downloadData(result) {
        try {
            if (result.type === 'chunked') {
                // 下载分块数据
                for (const part of result.parts) {
                    this.downloadSingleFile(part.data, part.filename, result.format);
                }
            } else {
                // 下载单个文件
                this.downloadSingleFile(result.data, result.filename, result.format);
            }
            
            this.logger.info('数据下载完成', { filename: result.filename });
            
        } catch (error) {
            this.logger.error('数据下载失败:', error);
            throw error;
        }
    }
    
    /**
     * 下载单个文件
     * @param {string} data - 文件数据
     * @param {string} filename - 文件名
     * @param {string} format - 格式
     */
    downloadSingleFile(data, filename, format) {
        const handler = this.formatHandlers.get(format);
        const blob = new Blob([data], { type: handler.mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * 获取支持的格式
     * @returns {Array} 支持的格式列表
     */
    getSupportedFormats() {
        return Array.from(this.formatHandlers.keys());
    }
    
    /**
     * 获取导出历史
     * @returns {Array} 导出历史
     */
    getExportHistory() {
        return [...this.exportHistory];
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        return { ...this.stats };
    }
    
    /**
     * 清空导出历史
     */
    clearHistory() {
        this.exportHistory = [];
        this.logger.info('导出历史已清空');
    }
    
    /**
     * 注册自定义格式处理器
     * @param {string} format - 格式名称
     * @param {Object} handler - 处理器
     */
    registerFormatHandler(format, handler) {
        if (!handler.export || typeof handler.export !== 'function') {
            throw new Error('格式处理器必须包含export方法');
        }
        
        this.formatHandlers.set(format, handler);
        this.logger.info(`注册自定义格式处理器: ${format}`);
    }
    
    /**
     * 移除格式处理器
     * @param {string} format - 格式名称
     */
    removeFormatHandler(format) {
        if (this.formatHandlers.delete(format)) {
            this.logger.info(`移除格式处理器: ${format}`);
        }
    }
    
    /**
     * 更新配置
     * @param {Object} newOptions - 新配置
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.logger.info('数据导出器配置已更新', newOptions);
    }
    
    /**
     * 重置导出器
     */
    reset() {
        this.exportHistory = [];
        this.stats = {
            totalExports: 0,
            totalDataExported: 0,
            averageExportTime: 0,
            exportsByFormat: {},
            lastExportTime: null
        };
        
        this.logger.info('数据导出器已重置');
    }
    
    /**
     * 销毁导出器
     */
    destroy() {
        this.exportHistory = [];
        this.formatHandlers.clear();
        
        this.logger.info('数据导出器已销毁');
    }
}