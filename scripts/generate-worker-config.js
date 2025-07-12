#!/usr/bin/env node

/**
 * 自动生成 Worker 依赖配置脚本
 * 从 UnifiedDependencyConfig.ts 生成 worker-dependency-config.js
 * 确保配置的一致性，避免手动同步错误
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const CONFIG_DIR = path.join(__dirname, '../src/config');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'worker-dependency-config.js');

// 从 TypeScript 配置中提取版本信息
function extractVersions() {
  const configPath = path.join(CONFIG_DIR, 'UnifiedDependencyConfig.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  
  // 提取版本号
  const tfVersionMatch = content.match(/TENSORFLOW_VERSION = ['"]([^'"]+)['"]/);
  const poseVersionMatch = content.match(/POSE_DETECTION_VERSION = ['"]([^'"]+)['"]/);
  
  if (!tfVersionMatch || !poseVersionMatch) {
    throw new Error('无法从 UnifiedDependencyConfig.ts 中提取版本信息');
  }
  
  return {
    tensorflow: tfVersionMatch[1],
    poseDetection: poseVersionMatch[1]
  };
}

// 生成 Worker 配置文件
function generateWorkerConfig() {
  console.log('🔄 正在生成 Worker 依赖配置...');
  
  try {
    const versions = extractVersions();
    
    const workerConfigContent = `/**
 * Worker 环境的统一依赖配置
 * 🤖 此文件由构建脚本自动生成，请勿手动编辑
 * 
 * 生成时间: ${new Date().toISOString()}
 * 生成脚本: scripts/generate-worker-config.js
 * 数据源: src/config/UnifiedDependencyConfig.ts
 */

// 统一的版本配置（自动同步）
const TENSORFLOW_VERSION = '${versions.tensorflow}';
const POSE_DETECTION_VERSION = '${versions.poseDetection}';

// 主要 CDN 提供商
const PRIMARY_CDN = 'https://cdn.jsdelivr.net/npm';
const FALLBACK_CDN = 'https://unpkg.com';

/**
 * 获取统一的依赖配置
 */
function getUnifiedDependencyConfig() {
  return {
    tensorflow: \`\${PRIMARY_CDN}/@tensorflow/tfjs@\${TENSORFLOW_VERSION}/dist/tf.min.js\`,
    tensorflowWebGL: \`\${PRIMARY_CDN}/@tensorflow/tfjs-backend-webgl@\${TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js\`,
    poseDetection: \`\${PRIMARY_CDN}/@tensorflow-models/pose-detection@\${POSE_DETECTION_VERSION}/dist/pose-detection.min.js\`
  };
}

/**
 * 获取回退依赖配置
 */
function getUnifiedFallbackConfig() {
  return {
    tensorflow: \`\${FALLBACK_CDN}/@tensorflow/tfjs@\${TENSORFLOW_VERSION}/dist/tf.min.js\`,
    tensorflowWebGL: \`\${FALLBACK_CDN}/@tensorflow/tfjs-backend-webgl@\${TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js\`,
    poseDetection: \`\${FALLBACK_CDN}/@tensorflow-models/pose-detection@\${POSE_DETECTION_VERSION}/dist/pose-detection.min.js\`
  };
}

/**
 * 获取版本信息
 */
function getVersionInfo() {
  return {
    tensorflow: TENSORFLOW_VERSION,
    poseDetection: POSE_DETECTION_VERSION,
    generatedAt: '${new Date().toISOString()}'
  };
}

// 导出配置（Worker 环境使用）
if (typeof self !== 'undefined') {
  // Worker 环境
  self.UNIFIED_DEPENDENCY_CONFIG = getUnifiedDependencyConfig();
  self.UNIFIED_FALLBACK_CONFIG = getUnifiedFallbackConfig();
  self.VERSION_INFO = getVersionInfo();
  
  console.log('📦 Worker 依赖配置已加载:', self.VERSION_INFO);
}

// 也支持 CommonJS 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUnifiedDependencyConfig,
    getUnifiedFallbackConfig,
    getVersionInfo,
    TENSORFLOW_VERSION,
    POSE_DETECTION_VERSION
  };
}
`;

    // 写入文件
    fs.writeFileSync(OUTPUT_FILE, workerConfigContent, 'utf8');
    
    console.log('✅ Worker 依赖配置生成成功!');
    console.log(`📁 输出文件: ${OUTPUT_FILE}`);
    console.log(`📊 版本信息:`);
    console.log(`   - TensorFlow.js: ${versions.tensorflow}`);
    console.log(`   - Pose Detection: ${versions.poseDetection}`);
    
  } catch (error) {
    console.error('❌ 生成 Worker 配置失败:', error.message);
    process.exit(1);
  }
}

// 验证生成的配置
function validateGeneratedConfig() {
  console.log('🔍 验证生成的配置...');
  
  try {
    // 尝试加载生成的配置
    delete require.cache[require.resolve(OUTPUT_FILE)];
    const config = require(OUTPUT_FILE);
    
    // 验证必要的导出
    const requiredExports = [
      'getUnifiedDependencyConfig',
      'getUnifiedFallbackConfig', 
      'getVersionInfo',
      'TENSORFLOW_VERSION',
      'POSE_DETECTION_VERSION'
    ];
    
    for (const exportName of requiredExports) {
      if (!(exportName in config)) {
        throw new Error(`缺少必要的导出: ${exportName}`);
      }
    }
    
    // 验证配置结构
    const depConfig = config.getUnifiedDependencyConfig();
    const fallbackConfig = config.getUnifiedFallbackConfig();
    const versionInfo = config.getVersionInfo();
    
    if (!depConfig.tensorflow || !depConfig.tensorflowWebGL || !depConfig.poseDetection) {
      throw new Error('依赖配置结构不完整');
    }
    
    if (!fallbackConfig.tensorflow || !fallbackConfig.tensorflowWebGL || !fallbackConfig.poseDetection) {
      throw new Error('回退配置结构不完整');
    }
    
    if (!versionInfo.tensorflow || !versionInfo.poseDetection) {
      throw new Error('版本信息不完整');
    }
    
    console.log('✅ 配置验证通过!');
    
  } catch (error) {
    console.error('❌ 配置验证失败:', error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  console.log('🚀 开始生成 Worker 依赖配置...\n');
  
  // 确保输出目录存在
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // 生成配置
  generateWorkerConfig();
  
  // 验证配置
  validateGeneratedConfig();
  
  console.log('\n🎉 Worker 依赖配置生成完成!');
  console.log('💡 提示: 现在 Worker 配置将自动与 TypeScript 配置保持同步');
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateWorkerConfig,
  validateGeneratedConfig,
  main
};