/**
 * Telemetry Module - WALIA-RX Console Subsystem
 * Handles structured logging, metrics, and trace spans
 */

class TelemetryModule {
    constructor() {
        this.logs = [];
        this.metrics = new Map();
        this.traces = [];
        this.config = {
            maxLogs: 1000,
            maxTraces: 100,
            enableRedaction: true,
            logLevel: 'info'
        };
        
        this.levels = {
            'error': 0,
            'warn': 1,
            'info': 2,
            'debug': 3
        };
        
        this.initializeMetrics();
        console.log('Telemetry module initialized');
    }

    initializeMetrics() {
        // Initialize performance counters
        this.metrics.set('commands_executed', { type: 'counter', value: 0 });
        this.metrics.set('input_latency_histogram', { type: 'histogram', values: [] });
        this.metrics.set('memory_usage_gauge', { type: 'gauge', value: 0 });
        this.metrics.set('session_duration', { type: 'gauge', value: 0 });
        this.metrics.set('error_count', { type: 'counter', value: 0 });
    }

    log(level, message, context = {}) {
        if (this.levels[level] > this.levels[this.config.logLevel]) {
            return; // Skip logs below configured level
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message: this.config.enableRedaction ? this.redactSensitiveData(message) : message,
            context: this.config.enableRedaction ? this.redactSensitiveData(context) : context,
            sessionId: this.getSessionId(),
            module: 'telemetry'
        };

        this.logs.push(logEntry);
        
        // Maintain log size limit
        if (this.logs.length > this.config.maxLogs) {
            this.logs = this.logs.slice(-this.config.maxLogs / 2);
        }

        // Emit to console for development
        console.log(`[${level.toUpperCase()}] ${message}`, context);
    }

    logEvent(eventName, data = {}) {
        this.log('info', `Event: ${eventName}`, data);
        
        // Update metrics based on event
        switch (eventName) {
            case 'command_executed':
                this.incrementCounter('commands_executed');
                if (data.latency) {
                    this.recordHistogram('input_latency_histogram', data.latency);
                }
                if (!data.success) {
                    this.incrementCounter('error_count');
                }
                break;
            case 'view_switch':
                this.log('debug', `Switched to view: ${data.view}`);
                break;
        }
    }

    startTrace(name, metadata = {}) {
        const traceId = this.generateTraceId();
        const trace = {
            id: traceId,
            name,
            startTime: performance.now(),
            endTime: null,
            duration: null,
            metadata,
            spans: []
        };

        this.traces.push(trace);
        
        // Maintain trace size limit
        if (this.traces.length > this.config.maxTraces) {
            this.traces = this.traces.slice(-this.config.maxTraces / 2);
        }

        this.log('debug', `Started trace: ${name}`, { traceId, metadata });
        return traceId;
    }

    endTrace(traceId) {
        const trace = this.traces.find(t => t.id === traceId);
        if (!trace) {
            this.log('warn', `Trace not found: ${traceId}`);
            return;
        }

        trace.endTime = performance.now();
        trace.duration = trace.endTime - trace.startTime;
        
        this.log('debug', `Ended trace: ${trace.name}`, { 
            traceId, 
            duration: trace.duration 
        });
    }

    addSpan(traceId, spanName, startTime, endTime, metadata = {}) {
        const trace = this.traces.find(t => t.id === traceId);
        if (!trace) {
            this.log('warn', `Trace not found for span: ${traceId}`);
            return;
        }

        const span = {
            name: spanName,
            startTime,
            endTime,
            duration: endTime - startTime,
            metadata
        };

        trace.spans.push(span);
    }

    incrementCounter(name) {
        const metric = this.metrics.get(name);
        if (metric && metric.type === 'counter') {
            metric.value++;
        } else {
            this.log('warn', `Counter not found: ${name}`);
        }
    }

    recordGauge(name, value) {
        const metric = this.metrics.get(name);
        if (metric && metric.type === 'gauge') {
            metric.value = value;
        } else {
            this.log('warn', `Gauge not found: ${name}`);
        }
    }

    recordHistogram(name, value) {
        const metric = this.metrics.get(name);
        if (metric && metric.type === 'histogram') {
            metric.values.push({
                value,
                timestamp: Date.now()
            });
            
            // Keep only recent values (last 1000)
            if (metric.values.length > 1000) {
                metric.values = metric.values.slice(-500);
            }
        } else {
            this.log('warn', `Histogram not found: ${name}`);
        }
    }

    getMetrics() {
        const result = {};
        for (const [name, metric] of this.metrics) {
            if (metric.type === 'histogram') {
                result[name] = {
                    type: metric.type,
                    count: metric.values.length,
                    values: metric.values.slice(-100) // Return recent values
                };
            } else {
                result[name] = metric;
            }
        }
        return result;
    }

    getRecentLogs(count = 50) {
        return this.logs.slice(-count).map(log => ({
            timestamp: new Date(log.timestamp).toLocaleTimeString(),
            level: log.level,
            message: log.message,
            context: log.context
        }));
    }

    getActiveTraces() {
        return this.traces.filter(trace => trace.endTime === null);
    }

    exportTelemetryData() {
        return {
            timestamp: new Date().toISOString(),
            version: '1.0.0-PRD',
            sessionId: this.getSessionId(),
            logs: this.logs,
            metrics: Object.fromEntries(this.metrics),
            traces: this.traces,
            config: this.config
        };
    }

    redactSensitiveData(data) {
        if (typeof data === 'string') {
            // Redact potential sensitive patterns
            return data
                .replace(/password\s*[:=]\s*\S+/gi, 'password=***')
                .replace(/token\s*[:=]\s*\S+/gi, 'token=***')
                .replace(/key\s*[:=]\s*\S+/gi, 'key=***');
        }
        
        if (typeof data === 'object' && data !== null) {
            const redacted = { ...data };
            for (const key of Object.keys(redacted)) {
                if (/password|token|key|secret/i.test(key)) {
                    redacted[key] = '***';
                }
            }
            return redacted;
        }
        
        return data;
    }

    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }

    setConfig(config) {
        this.config = { ...this.config, ...config };
        this.log('info', 'Telemetry configuration updated', config);
    }

    // Performance monitoring utilities
    measureAsync(name, asyncFn) {
        return async (...args) => {
            const traceId = this.startTrace(name);
            const startTime = performance.now();
            
            try {
                const result = await asyncFn(...args);
                const endTime = performance.now();
                this.addSpan(traceId, name, startTime, endTime, { success: true });
                this.endTrace(traceId);
                return result;
            } catch (error) {
                const endTime = performance.now();
                this.addSpan(traceId, name, startTime, endTime, { 
                    success: false, 
                    error: error.message 
                });
                this.endTrace(traceId);
                this.log('error', `Error in ${name}: ${error.message}`);
                throw error;
            }
        };
    }

    measureSync(name, fn) {
        return (...args) => {
            const traceId = this.startTrace(name);
            const startTime = performance.now();
            
            try {
                const result = fn(...args);
                const endTime = performance.now();
                this.addSpan(traceId, name, startTime, endTime, { success: true });
                this.endTrace(traceId);
                return result;
            } catch (error) {
                const endTime = performance.now();
                this.addSpan(traceId, name, startTime, endTime, { 
                    success: false, 
                    error: error.message 
                });
                this.endTrace(traceId);
                this.log('error', `Error in ${name}: ${error.message}`);
                throw error;
            }
        };
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelemetryModule;
}
