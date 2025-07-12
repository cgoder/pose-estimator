/**
 * 依赖配置验证工具
 * 用于检查项目中所有依赖配置的一致性
 */

import { unifiedDependencyConfig } from '../config/UnifiedDependencyConfig.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
  };
}

export interface FileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  foundVersions: {
    tensorflow?: string;
    poseDetection?: string;
  };
}

/**
 * 依赖配置验证器
 */
export class DependencyConfigValidator {
  private expectedVersions: {
    tensorflow: string;
    poseDetection: string;
  };

  constructor() {
    this.expectedVersions = unifiedDependencyConfig.getVersionInfo();
  }

  /**
   * 验证单个文件的依赖配置
   */
  validateFile(filePath: string, content: string): FileValidationResult {
    const result: FileValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      foundVersions: {}
    };

    // 检查 TensorFlow.js 版本
    const tfVersionMatches = content.match(/@tensorflow\/tfjs@([\d.]+)/g);
    if (tfVersionMatches) {
      const versions = tfVersionMatches.map(match => match.split('@')[2]);
      const uniqueVersions = [...new Set(versions)];
      
      if (uniqueVersions.length > 1) {
        result.errors.push(`发现多个 TensorFlow.js 版本: ${uniqueVersions.join(', ')}`);
        result.isValid = false;
      }
      
      const foundVersion = uniqueVersions[0];
      if (foundVersion) {
        result.foundVersions.tensorflow = foundVersion;
        
        if (foundVersion !== this.expectedVersions.tensorflow) {
          result.errors.push(
            `TensorFlow.js 版本不匹配: 期望 ${this.expectedVersions.tensorflow}, 实际 ${foundVersion}`
          );
          result.isValid = false;
        }
      }
    }

    // 检查 Pose Detection 版本
    const poseVersionMatches = content.match(/@tensorflow-models\/pose-detection@([\d.]+)/g);
    if (poseVersionMatches) {
      const versions = poseVersionMatches.map(match => match.split('@')[2]);
      const uniqueVersions = [...new Set(versions)];
      
      if (uniqueVersions.length > 1) {
        result.errors.push(`发现多个 Pose Detection 版本: ${uniqueVersions.join(', ')}`);
        result.isValid = false;
      }
      
      const foundVersion = uniqueVersions[0];
      if (foundVersion) {
        result.foundVersions.poseDetection = foundVersion;
        
        if (foundVersion !== this.expectedVersions.poseDetection) {
          result.errors.push(
            `Pose Detection 版本不匹配: 期望 ${this.expectedVersions.poseDetection}, 实际 ${foundVersion}`
          );
          result.isValid = false;
        }
      }
    }

    // 检查是否使用了硬编码的 CDN URLs
    const hardcodedCdnPatterns = [
      /https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow/g,
      /https:\/\/unpkg\.com\/@tensorflow/g
    ];

    for (const pattern of hardcodedCdnPatterns) {
      if (pattern.test(content)) {
        result.warnings.push('发现硬编码的 CDN URLs，建议使用统一配置管理器');
      }
    }

    // 检查是否缺少统一配置的导入
    if (content.includes('@tensorflow') && !content.includes('UnifiedDependencyConfig') && !content.includes('worker-dependency-config')) {
      result.warnings.push('文件使用了 TensorFlow.js 但未导入统一配置管理器');
    }

    return result;
  }

  /**
   * 生成验证报告
   */
  generateReport(results: FileValidationResult[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validFiles = 0;
    let invalidFiles = 0;

    for (const result of results) {
      if (result.isValid) {
        validFiles++;
      } else {
        invalidFiles++;
        errors.push(`${result.filePath}: ${result.errors.join(', ')}`);
      }
      
      if (result.warnings.length > 0) {
        warnings.push(`${result.filePath}: ${result.warnings.join(', ')}`);
      }
    }

    return {
      isValid: invalidFiles === 0,
      errors,
      warnings,
      summary: {
        totalFiles: results.length,
        validFiles,
        invalidFiles
      }
    };
  }

  /**
   * 获取修复建议
   */
  getFixSuggestions(result: FileValidationResult): string[] {
    const suggestions: string[] = [];

    if (result.foundVersions.tensorflow && result.foundVersions.tensorflow !== this.expectedVersions.tensorflow) {
      suggestions.push(
        `将 TensorFlow.js 版本从 ${result.foundVersions.tensorflow} 更新到 ${this.expectedVersions.tensorflow}`
      );
    }

    if (result.foundVersions.poseDetection && result.foundVersions.poseDetection !== this.expectedVersions.poseDetection) {
      suggestions.push(
        `将 Pose Detection 版本从 ${result.foundVersions.poseDetection} 更新到 ${this.expectedVersions.poseDetection}`
      );
    }

    if (result.warnings.some(w => w.includes('硬编码'))) {
      suggestions.push('使用 UnifiedDependencyConfig 替换硬编码的 CDN URLs');
    }

    if (result.warnings.some(w => w.includes('未导入统一配置'))) {
      suggestions.push('导入并使用 UnifiedDependencyConfig 或 worker-dependency-config.js');
    }

    return suggestions;
  }

  /**
   * 打印验证报告
   */
  printReport(result: ValidationResult): void {
    console.log('\n📋 依赖配置验证报告');
    console.log('='.repeat(50));
    
    console.log(`📊 总计: ${result.summary.totalFiles} 个文件`);
    console.log(`✅ 有效: ${result.summary.validFiles} 个文件`);
    console.log(`❌ 无效: ${result.summary.invalidFiles} 个文件`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ 错误:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ 警告:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (result.isValid) {
      console.log('\n🎉 所有依赖配置都是一致的！');
    } else {
      console.log('\n🔧 需要修复依赖配置不一致的问题');
    }
    
    console.log('\n📦 期望版本:');
    console.log(`  - TensorFlow.js: ${this.expectedVersions.tensorflow}`);
    console.log(`  - Pose Detection: ${this.expectedVersions.poseDetection}`);
  }
}

// 导出单例实例
export const dependencyConfigValidator = new DependencyConfigValidator();