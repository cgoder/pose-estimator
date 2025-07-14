/**
 * 摄像头相关类型定义
 */

export type FacingMode = 'user' | 'environment';

export interface CameraConstraints {
    video: {
        width: number;
        height: number;
        facingMode: FacingMode;
    };
}

export interface CameraDevice {
    deviceId: string;
    kind: 'videoinput';
    label: string;
    groupId: string;
}

export interface CameraSwitchState {
    isSupported: boolean;
    currentMode: FacingMode;
    availableDevices: CameraDevice[];
    isSwitching: boolean;
}

export interface CameraSwitchOptions {
    targetMode?: FacingMode;
    preserveRunningState?: boolean;
    timeout?: number;
}

export type CameraSwitchStatus = 'idle' | 'switching' | 'success' | 'error';