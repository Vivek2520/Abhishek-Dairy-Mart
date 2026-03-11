// performanceMonitor.js
// measure and log performance metrics

export class PerformanceMonitor {
    constructor() {
        this.marks = {};
        this.measures = {};
    }

    mark(label) {
        if ('performance' in window) {
            performance.mark(label);
            this.marks[label] = Date.now();
        }
    }

    measure(label, startMark, endMark) {
        if ('performance' in window && this.marks[startMark] && this.marks[endMark]) {
            performance.measure(label, startMark, endMark);
            const duration = this.marks[endMark] - this.marks[startMark];
            this.measures[label] = duration;
            console.log(`[PERF] ${label}: ${duration}ms`);
        }
    }

    report() {
        console.log('[PERF REPORT]', this.measures);
        if ('window' in 'PerformanceEventTiming') {
            const entries = performance.getEntriesByType('navigation')[0];
            if (entries) {
                console.log(`[PERF] FCP: ${entries.responseEnd}ms`);
                console.log(`[PERF] DOM Interactive: ${entries.domInteractive}ms`);
                console.log(`[PERF] DOM Complete: ${entries.domComplete}ms`);
            }
        }
    }
}

export const perf = new PerformanceMonitor();
