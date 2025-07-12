/**
 * OneEuroFilter TypeScript 版本演示
 * 展示新的 TypeScript 实现的使用方法和性能
 */

import { OneEuroFilter, FilterConfig } from '../utils/OneEuroFilter.js';
import { OneEuroFilterManager } from '../components/OneEuroFilterManager.js';

// 模拟 CONFIG 对象
const mockConfig = {
    UI: {
        CONFIDENCE_THRESHOLD: 0.5
    }
};

// 模拟全局 CONFIG
(global as any).CONFIG = mockConfig;                                                                                    

/**
 * 演示基本的 OneEuroFilter 使用
 */
function demonstrateBasicUsage() {
    console.log('🎯 OneEuroFilter 基本使用演示');
    console.log('================================');

    // 创建滤波器配置
    const config: FilterConfig = {
        frequency: 30.0,    // 30 FPS
        minCutoff: 1.0,     // 最小截止频率
        beta: 0.007,        // 速度敏感性
        dCutoff: 1.0        // 导数截止频率
    };

    // 创建滤波器实例
    const filter = new OneEuroFilter(config);

    // 模拟带噪声的数据序列
    const baseValue = 100.0;
    const noiseAmplitude = 2.0;
    const timestamps = Array.from({ length: 10 }, (_, i) => i * 33); // 30fps

    console.log('原始数据 vs 滤波后数据:');
    console.log('时间戳\t原始值\t\t滤波值\t\t噪声减少');

    timestamps.forEach((timestamp) => {
        // 添加随机噪声
        const noise = (Math.random() - 0.5) * 2 * noiseAmplitude;
        const noisyValue = baseValue + noise;
        
        // 应用滤波
        const filteredValue = filter.filter(noisyValue, timestamp);
        
        // 计算噪声减少量
        const noiseReduction = Math.abs(noise) - Math.abs(filteredValue - baseValue);
        
        console.log(
            `${timestamp}ms\t${noisyValue.toFixed(2)}\t\t${filteredValue.toFixed(2)}\t\t${noiseReduction > 0 ? '+' : ''}${noiseReduction.toFixed(2)}`
        );
    });

    console.log('\n');
}

/**
 * 演示 OneEuroFilterManager 的使用
 */
function demonstrateManagerUsage() {
    console.log('🎛️ OneEuroFilterManager 使用演示');
    console.log('==================================');

    // 创建管理器实例
    const manager = new OneEuroFilterManager();

    // 模拟姿态关键点数据
    const generateKeypoints = (frame: number) => [
        {
            x: 100 + Math.sin(frame * 0.1) * 5 + (Math.random() - 0.5) * 2,
            y: 200 + Math.cos(frame * 0.1) * 5 + (Math.random() - 0.5) * 2,
            score: 0.9
        },
        {
            x: 150 + Math.sin(frame * 0.15) * 3 + (Math.random() - 0.5) * 1.5,
            y: 250 + Math.cos(frame * 0.15) * 3 + (Math.random() - 0.5) * 1.5,
            score: 0.8
        },
        {
            x: 200 + (Math.random() - 0.5) * 10, // 高噪声点
            y: 300 + (Math.random() - 0.5) * 10,
            score: 0.3 // 低置信度，应该跳过滤波
        }
    ];

    console.log('帧数\t原始关键点\t\t\t滤波后关键点');
    
    for (let frame = 0; frame < 5; frame++) {
        const timestamp = frame * 33; // 30fps
        const originalKeypoints = generateKeypoints(frame);
        const filteredKeypoints = manager.filterPose(originalKeypoints, timestamp);

        if (originalKeypoints[0] && filteredKeypoints[0]) {
            console.log(`${frame}\t(${originalKeypoints[0].x.toFixed(1)}, ${originalKeypoints[0].y.toFixed(1)})\t\t\t(${filteredKeypoints[0].x.toFixed(1)}, ${filteredKeypoints[0].y.toFixed(1)})`);
        }
    }

    // 显示统计信息
    const stats = manager.getStats();
    console.log(`\n📊 统计信息:`);
    console.log(`- 滤波器启用: ${stats.enabled}`);
    console.log(`- 活跃滤波器数量: ${stats.filterCount}`);
    console.log(`- 当前参数: frequency=${stats.parameters.frequency}, minCutoff=${stats.parameters.minCutoff}`);

    console.log('\n');
}

/**
 * 演示预设配置的使用
 */
function demonstratePresets() {
    console.log('🎨 预设配置演示');
    console.log('================');

    const manager = new OneEuroFilterManager();

    const presets = ['smooth', 'balanced', 'responsive'];
    
    presets.forEach(presetName => {
        const success = manager.applyPreset(presetName);
        if (success) {
            const params = manager.getParameters();
            console.log(`${presetName} 预设:`);
            console.log(`  - frequency: ${params.frequency}`);
            console.log(`  - minCutoff: ${params.minCutoff}`);
            console.log(`  - beta: ${params.beta}`);
            console.log(`  - dCutoff: ${params.dCutoff}`);
        }
    });

    console.log('\n');
}

/**
 * 演示配置导出和导入
 */
function demonstrateConfigManagement() {
    console.log('💾 配置管理演示');
    console.log('================');

    const manager = new OneEuroFilterManager();

    // 自定义配置
    manager.updateParameters({
        frequency: 45.0,
        minCutoff: 1.5,
        beta: 0.01
    });

    // 导出配置
    const configJson = manager.exportConfig();
    console.log('导出的配置:');
    console.log(configJson);

    // 创建新管理器并导入配置
    const newManager = new OneEuroFilterManager();
    const importSuccess = newManager.importConfig(configJson);
    
    console.log(`\n配置导入${importSuccess ? '成功' : '失败'}`);
    if (importSuccess) {
        const importedParams = newManager.getParameters();
        console.log('导入后的参数:');
        console.log(`  - frequency: ${importedParams.frequency}`);
        console.log(`  - minCutoff: ${importedParams.minCutoff}`);
        console.log(`  - beta: ${importedParams.beta}`);
    }

    console.log('\n');
}

/**
 * 性能测试
 */
function performanceTest() {
    console.log('⚡ 性能测试');
    console.log('===========');

    const manager = new OneEuroFilterManager();
    const iterations = 1000;
    const keypointsCount = 17; // 典型的人体关键点数量

    // 生成测试数据
    const testKeypoints = Array.from({ length: keypointsCount }, (_, i) => ({
        x: 100 + i * 10 + Math.random() * 5,
        y: 200 + i * 15 + Math.random() * 5,
        score: 0.8 + Math.random() * 0.2
    }));

    // 性能测试
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        const timestamp = i * 16; // 60fps
        manager.filterPose(testKeypoints, timestamp);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerFrame = totalTime / iterations;
    const fps = 1000 / avgTimePerFrame;

    console.log(`测试结果 (${iterations} 帧, ${keypointsCount} 关键点):`);
    console.log(`- 总时间: ${totalTime.toFixed(2)}ms`);
    console.log(`- 平均每帧: ${avgTimePerFrame.toFixed(3)}ms`);
    console.log(`- 理论最大FPS: ${fps.toFixed(1)}`);
    console.log(`- 滤波器数量: ${manager.getStats().filterCount}`);

    console.log('\n');
}

/**
 * 主演示函数
 */
function runDemo() {
    console.log('🚀 OneEuroFilter TypeScript 版本完整演示');
    console.log('==========================================\n');

    try {
        demonstrateBasicUsage();
        demonstrateManagerUsage();
        demonstratePresets();
        demonstrateConfigManagement();
        performanceTest();

        console.log('✅ 演示完成！新的 TypeScript 版本运行正常。');
        console.log('\n主要改进:');
        console.log('- ✨ 完整的 TypeScript 类型支持');
        console.log('- 🔧 更好的 API 设计和错误处理');
        console.log('- 📦 模块化架构，易于维护');
        console.log('- 🎛️ 丰富的配置管理功能');
        console.log('- ⚡ 优化的性能表现');

    } catch (error) {
        console.error('❌ 演示过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    runDemo();
}

export {
    demonstrateBasicUsage,
    demonstrateManagerUsage,
    demonstratePresets,
    demonstrateConfigManagement,
    performanceTest,
    runDemo
};