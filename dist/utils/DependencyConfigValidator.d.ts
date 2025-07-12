/**
 * 依赖配置验证工具
 * 用于检查项目中所有依赖配置的一致性
 */
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
export declare class DependencyConfigValidator {
    private expectedVersions;
    constructor();
    /**
     * 验证单个文件的依赖配置
     */
    validateFile(filePath: string, content: string): FileValidationResult;
    /**
     * 生成验证报告
     */
    generateReport(results: FileValidationResult[]): ValidationResult;
    /**
     * 获取修复建议
     */
    getFixSuggestions(result: FileValidationResult): string[];
    /**
     * 打印验证报告
     */
    printReport(result: ValidationResult): void;
}
export declare const dependencyConfigValidator: DependencyConfigValidator;
//# sourceMappingURL=DependencyConfigValidator.d.ts.map