/**
 * One Euro Filter TypeScript Implementation
 * 
 * Copyright (c) 2012, University of Lille 1
 * All rights reserved.
 * 
 * TypeScript port for better type safety and integration
 */

export interface FilterConfig {
  frequency?: number;
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

export class LowPassFilter {
  private alpha: number;
  private s: number;
  private initialized: boolean = false;

  constructor(alpha: number, y0: number = 0.0) {
    this.alpha = alpha;
    this.s = y0;
  }

  setAlpha(alpha: number): void {
    if (alpha < 0.0 || alpha > 1.0) {
      throw new Error("alpha should be in [0.0, 1.0]");
    }
    this.alpha = alpha;
  }

  filter(value: number, peek: boolean = false): number {
    if (peek) {
      return this.s;
    }
    
    if (!this.initialized) {
      this.s = value;
      this.initialized = true;
    } else {
      this.s = this.alpha * value + (1.0 - this.alpha) * this.s;
    }
    
    return this.s;
  }
}

export class OneEuroFilter {
  private frequency: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private x: LowPassFilter;
  private dx: LowPassFilter;
  private lastTime: number = -1;
  private initialized: boolean = false;

  constructor(config: FilterConfig = {}) {
    this.frequency = config.frequency || 30.0;
    this.minCutoff = config.minCutoff || 1.0;
    this.beta = config.beta || 0.0;
    this.dCutoff = config.dCutoff || 1.0;

    this.x = new LowPassFilter(this.alpha(this.minCutoff), 0.0);
    this.dx = new LowPassFilter(this.alpha(this.dCutoff), 0.0);
  }

  private alpha(cutoff: number): number {
    const te = 1.0 / this.frequency;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp: number = -1): number {
    // 处理时间戳和频率计算
    if (this.lastTime !== -1 && timestamp !== -1) {
      const dt = timestamp - this.lastTime;
      if (dt > 0) {
        this.frequency = 1.0 / dt;
      }
      // 如果时间差为零或负数，保持当前频率不变
    }
    this.lastTime = timestamp;

    const prevX = this.x.filter(0, true); // Peek the last value

    let dv: number;
    if (this.initialized && timestamp !== -1) {
      dv = (value - prevX) * this.frequency;
    } else {
      this.initialized = true;
      dv = 0.0;
    }

    const edv = this.dx.filter(dv);
    const cutoff = this.minCutoff + this.beta * Math.abs(edv);
    const alpha = this.alpha(cutoff);
    
    // 确保 alpha 在有效范围内
    const clampedAlpha = Math.max(0.0, Math.min(1.0, alpha));
    this.x.setAlpha(clampedAlpha);
    
    return this.x.filter(value);
  }

  updateConfig(config: Partial<FilterConfig>): void {
    if (config.frequency !== undefined) this.frequency = config.frequency;
    if (config.minCutoff !== undefined) this.minCutoff = config.minCutoff;
    if (config.beta !== undefined) this.beta = config.beta;
    if (config.dCutoff !== undefined) this.dCutoff = config.dCutoff;

    // 重新初始化滤波器
    this.x = new LowPassFilter(this.alpha(this.minCutoff), 0.0);
    this.dx = new LowPassFilter(this.alpha(this.dCutoff), 0.0);
    this.initialized = false;
  }
}

// 为了向后兼容，导出全局函数
export function createOneEuroFilter(
  freq?: number, 
  minCutoff?: number, 
  beta?: number, 
  dCutoff?: number
): OneEuroFilter {
  const config: FilterConfig = {};
  
  if (freq !== undefined) config.frequency = freq;
  if (minCutoff !== undefined) config.minCutoff = minCutoff;
  if (beta !== undefined) config.beta = beta;
  if (dCutoff !== undefined) config.dCutoff = dCutoff;
  
  return new OneEuroFilter(config);
}