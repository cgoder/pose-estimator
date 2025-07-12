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
export declare class LowPassFilter {
    private alpha;
    private s;
    private initialized;
    constructor(alpha: number, y0?: number);
    setAlpha(alpha: number): void;
    filter(value: number, peek?: boolean): number;
}
export declare class OneEuroFilter {
    private frequency;
    private minCutoff;
    private beta;
    private dCutoff;
    private x;
    private dx;
    private lastTime;
    private initialized;
    constructor(config?: FilterConfig);
    private alpha;
    filter(value: number, timestamp?: number): number;
    updateConfig(config: Partial<FilterConfig>): void;
}
export declare function createOneEuroFilter(freq?: number, minCutoff?: number, beta?: number, dCutoff?: number): OneEuroFilter;
//# sourceMappingURL=OneEuroFilter.d.ts.map