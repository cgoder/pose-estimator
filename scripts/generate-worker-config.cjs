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
    // 读取生成的文件内容
    const content = fs.readFileSync(OUTPUT_FILE, 'utf8');
    
    // 验证文件包含必要的函数和变量
    const requiredPatterns = [
      /function getUnifiedDependencyConfig\(\)/,
      /function getUnifiedFallbackConfig\(\)/,
      /function getVersionInfo\(\)/,
      /const TENSORFLOW_VERSION = /,
      /const POSE_DETECTION_VERSION = /,
      /self\.UNIFIED_DEPENDENCY_CONFIG/,
      /self\.UNIFIED_FALLBACK_CONFIG/,
      /self\.VERSION_INFO/
    ];
    
    for (const pattern of requiredPatterns) {
      if (!pattern.test(content)) {
        throw new Error(`配置文件缺少必要的内容: ${pattern.source}`);
      }
    }
    
    // 验证版本号格式
    const tfVersionMatch = content.match(/const TENSORFLOW_VERSION = '([^']+)'/);
    const poseVersionMatch = content.match(/const POSE_DETECTION_VERSION = '([^']+)'/);
    
    if (!tfVersionMatch || !poseVersionMatch) {
      throw new Error('版本号格式不正确');
    }
    
    // 验证版本号不为空
    if (!tfVersionMatch[1] || !poseVersionMatch[1]) {
      throw new Error('版本号不能为空');
    }
    
    console.log('✅ 配置验证通过!');
    console.log(`   - TensorFlow.js: ${tfVersionMatch[1]}`);
    console.log(`   - Pose Detection: ${poseVersionMatch[1]}`);
    
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