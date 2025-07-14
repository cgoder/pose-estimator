/**
 * 摄像头错误处理类
 * 提供更精确的错误分类和用户友好的错误信息
 */
export class CameraError extends Error {
    constructor(code, message, originalError = null) {
        super(message);
        this.name = 'CameraError';
        this.code = code;
        this.originalError = originalError;
    }

    /**
     * 获取用户友好的错误信息
     */
    getUserFriendlyMessage() {
        const messages = {
            'PERMISSION_DENIED': '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头',
            'DEVICE_NOT_FOUND': '未找到摄像头设备，请检查设备连接',
            'SWITCH_NOT_SUPPORTED': '当前设备不支持摄像头切换',
            'SWITCH_TIMEOUT': '摄像头切换超时，请重试',
            'DEVICE_IN_USE': '摄像头正被其他应用使用，请关闭其他应用后重试',
            'UNKNOWN_ERROR': '摄像头操作失败，请重试'
        };
        
        return messages[this.code] || messages['UNKNOWN_ERROR'];
    }

    /**
     * 获取建议的解决方案
     */
    getSuggestedSolution() {
        const solutions = {
            'PERMISSION_DENIED': '1. 点击地址栏的摄像头图标\n2. 选择"允许"\n3. 刷新页面重试',
            'DEVICE_NOT_FOUND': '1. 检查摄像头是否正确连接\n2. 重启浏览器\n3. 检查设备驱动程序',
            'SWITCH_NOT_SUPPORTED': '当前设备只有一个摄像头，无法切换',
            'SWITCH_TIMEOUT': '1. 检查网络连接\n2. 重启浏览器\n3. 重新连接摄像头',
            'DEVICE_IN_USE': '1. 关闭其他使用摄像头的应用\n2. 重启浏览器\n3. 重新尝试',
            'UNKNOWN_ERROR': '1. 刷新页面重试\n2. 重启浏览器\n3. 检查设备状态'
        };
        
        return solutions[this.code] || solutions['UNKNOWN_ERROR'];
    }
}

/**
 * 摄像头错误代码常量
 */
export const CameraErrorCode = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
    SWITCH_NOT_SUPPORTED: 'SWITCH_NOT_SUPPORTED',
    SWITCH_TIMEOUT: 'SWITCH_TIMEOUT',
    DEVICE_IN_USE: 'DEVICE_IN_USE',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 摄像头错误工厂类
 * 用于创建标准化的摄像头错误
 */
export class CameraErrorFactory {
    /**
     * 从 DOMException 创建 CameraError
     */
    static fromDOMException(error) {
        let code = CameraErrorCode.UNKNOWN_ERROR;
        let message = error.message;

        switch (error.name) {
            case 'NotAllowedError':
                code = CameraErrorCode.PERMISSION_DENIED;
                break;
            case 'NotFoundError':
                code = CameraErrorCode.DEVICE_NOT_FOUND;
                break;
            case 'NotReadableError':
                code = CameraErrorCode.DEVICE_IN_USE;
                break;
            default:
                code = CameraErrorCode.UNKNOWN_ERROR;
        }

        return new CameraError(code, message, error);
    }

    /**
     * 创建切换不支持错误
     */
    static switchNotSupported() {
        return new CameraError(
            CameraErrorCode.SWITCH_NOT_SUPPORTED,
            'Camera switching is not supported on this device'
        );
    }

    /**
     * 创建切换超时错误
     */
    static switchTimeout() {
        return new CameraError(
            CameraErrorCode.SWITCH_TIMEOUT,
            'Camera switch operation timed out'
        );
    }
}