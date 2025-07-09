// =====================================================================================
// One-Euro Filter
//
// Copyright (c) 2012, University of Lille 1
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
// list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
// this list of conditions and the following disclaimer in the documentation
// and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
// =====================================================================================

function LowPassFilter(alpha, y0) {
    let y = y0 || 0.0;
    let s = y;
    let initialized = false;

    function alpha_(a) {
        if (a < 0.0 || a > 1.0) {
            throw new Error("alpha should be in [0.0., 1.0]");
        }
        alpha = a;
    }

    function filter(v, peek = false) {
        if (peek) {
            return s;
        }
        if (!initialized) {
            s = v;
            initialized = true;
        } else {
            s = alpha * v + (1.0 - alpha) * s;
        }
        return s;
    }

    return {
        filter: filter,
        alpha: alpha_,
    };
}

function OneEuroFilter(freq, min_cutoff, beta, d_cutoff) {
    freq = freq || 30.0;
    min_cutoff = min_cutoff || 1.0;
    beta = beta || 0.0;
    d_cutoff = d_cutoff || 1.0;

    let x = LowPassFilter(alpha(min_cutoff), 0.0);
    let dx = LowPassFilter(alpha(d_cutoff), 0.0);
    let last_time = -1;
    let initialized = false;

    function alpha(cutoff) {
        const te = 1.0 / freq;
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }

    function filter(v, t) {
        if (last_time !== -1 && t !== -1) {
            freq = 1.0 / (t - last_time);
        }
        last_time = t;

        const prev_x = x.filter(0, true); // Peek the last value

        let d_v;
        if (initialized && t !== -1) {
            d_v = (v - prev_x) * freq;
        } else {
            initialized = true;
            d_v = 0.0;
        }

        const ed_v = dx.filter(d_v);
        const cutoff = min_cutoff + beta * Math.abs(ed_v);
        x.alpha(alpha(cutoff));
        
        return x.filter(v);
    }

    return {
        filter: filter,
    };
}