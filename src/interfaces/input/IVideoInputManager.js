import { IInputManager } from './IInputManager.js';

/**
 * 视频输入管理器接口
 */
export class IVideoInputManager extends IInputManager {
    /**
     * 加载视频文件
     * @param {File|string} videoSource - 视频文件或URL
     * @returns {Promise<void>}
     */
    async loadVideo(videoSource) {
        throw new Error('IVideoInputManager.loadVideo must be implemented');
    }

    /**
     * 播放视频
     * @returns {Promise<void>}
     */
    async playVideo() {
        throw new Error('IVideoInputManager.playVideo must be implemented');
    }

    /**
     * 暂停视频
     */
    pauseVideo() {
        throw new Error('IVideoInputManager.pauseVideo must be implemented');
    }

    /**
     * 停止视频
     */
    stopVideo() {
        throw new Error('IVideoInputManager.stopVideo must be implemented');
    }

    /**
     * 跳转到指定时间
     * @param {number} time - 时间（秒）
     */
    seekTo(time) {
        throw new Error('IVideoInputManager.seekTo must be implemented');
    }

    /**
     * 获取视频时长
     * @returns {number} 视频时长（秒）
     */
    getDuration() {
        throw new Error('IVideoInputManager.getDuration must be implemented');
    }

    /**
     * 获取当前播放时间
     * @returns {number} 当前时间（秒）
     */
    getCurrentTime() {
        throw new Error('IVideoInputManager.getCurrentTime must be implemented');
    }

    /**
     * 设置播放速度
     * @param {number} speed - 播放速度
     */
    setPlaybackSpeed(speed) {
        throw new Error('IVideoInputManager.setPlaybackSpeed must be implemented');
    }

    /**
     * 获取播放速度
     * @returns {number} 播放速度
     */
    getPlaybackSpeed() {
        throw new Error('IVideoInputManager.getPlaybackSpeed must be implemented');
    }

    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        throw new Error('IVideoInputManager.setVolume must be implemented');
    }

    /**
     * 获取音量
     * @returns {number} 音量
     */
    getVolume() {
        throw new Error('IVideoInputManager.getVolume must be implemented');
    }

    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        throw new Error('IVideoInputManager.setMuted must be implemented');
    }

    /**
     * 检查是否静音
     * @returns {boolean} 是否静音
     */
    isMuted() {
        throw new Error('IVideoInputManager.isMuted must be implemented');
    }

    /**
     * 检查视频是否正在播放
     * @returns {boolean} 是否正在播放
     */
    isPlaying() {
        throw new Error('IVideoInputManager.isPlaying must be implemented');
    }

    /**
     * 检查视频是否已结束
     * @returns {boolean} 是否已结束
     */
    isEnded() {
        throw new Error('IVideoInputManager.isEnded must be implemented');
    }

    /**
     * 获取视频元数据
     * @returns {Object} 视频元数据
     */
    getVideoMetadata() {
        throw new Error('IVideoInputManager.getVideoMetadata must be implemented');
    }
}

export default IVideoInputManager;