/**
 * TTY-PTY Module - WALIA-RX Console Subsystem
 * Handles PTY/TTY abstraction, sizing/events, and signal interop
 */

class TTYPtyModule {
    constructor() {
        this.ptyInstances = new Map();
        this.eventHandlers = new Map();
        this.config = {
            defaultRows: 24,
            defaultCols: 80,
            bufferSize: 64 * 1024, // 64KB buffer
            encoding: 'utf8'
        };
        
        this.telemetry = null;
        this.setupEventHandlers();
        console.log('TTY-PTY module initialized');
    }

    setTelemetry(telemetryModule) {
        this.telemetry = telemetryModule;
    }

    setupEventHandlers() {
        // Handle window resize events
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Handle visibility change (for power management)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    createPty(options = {}) {
        const ptyId = this.generatePtyId();
        const pty = {
            id: ptyId,
            rows: options.rows || this.config.defaultRows,
            cols: options.cols || this.config.defaultCols,
            buffer: '',
            inputBuffer: [],
            outputBuffer: [],
            state: 'ready',
            lastActivity: Date.now(),
            encoding: options.encoding || this.config.encoding,
            environmentVars: options.env || {},
            workingDirectory: options.cwd || '/',
            signals: {
                SIGINT: false,
                SIGTERM: false,
                SIGKILL: false,
                SIGSTOP: false,
                SIGCONT: false
            }
        };

        this.ptyInstances.set(ptyId, pty);
        
        if (this.telemetry) {
            this.telemetry.logEvent('pty_created', { 
                ptyId, 
                rows: pty.rows, 
                cols: pty.cols 
            });
        }

        return ptyId;
    }

    destroyPty(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        // Clean up resources
        pty.state = 'destroyed';
        this.ptyInstances.delete(ptyId);
        
        if (this.telemetry) {
            this.telemetry.logEvent('pty_destroyed', { ptyId });
        }
    }

    resize(ptyId, rows, cols) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        const oldSize = { rows: pty.rows, cols: pty.cols };
        pty.rows = rows;
        pty.cols = cols;

        // Emit resize event to connected processes
        this.emitSignal(ptyId, 'SIGWINCH', { rows, cols });
        
        if (this.telemetry) {
            this.telemetry.logEvent('pty_resized', { 
                ptyId, 
                oldSize, 
                newSize: { rows, cols } 
            });
        }

        return { rows, cols };
    }

    write(ptyId, data) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        if (pty.state !== 'ready') {
            throw new Error(`PTY not ready: ${ptyId} (state: ${pty.state})`);
        }

        // Convert data to buffer if needed
        const buffer = typeof data === 'string' ? 
            new TextEncoder().encode(data) : data;

        // Add to input buffer
        pty.inputBuffer.push({
            data: buffer,
            timestamp: Date.now()
        });

        pty.lastActivity = Date.now();

        // Process special key sequences
        const processedData = this.processInputSequences(data);
        
        if (this.telemetry) {
            this.telemetry.logEvent('pty_input', { 
                ptyId, 
                bytes: buffer.length,
                hasSpecialSequences: processedData !== data
            });
        }

        return processedData;
    }

    read(ptyId, maxBytes = null) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        if (pty.outputBuffer.length === 0) {
            return null;
        }

        let totalBytes = 0;
        const result = [];

        while (pty.outputBuffer.length > 0 && 
               (maxBytes === null || totalBytes < maxBytes)) {
            const entry = pty.outputBuffer.shift();
            result.push(entry);
            totalBytes += entry.data.length;
        }

        if (this.telemetry) {
            this.telemetry.logEvent('pty_output', { 
                ptyId, 
                bytes: totalBytes,
                entries: result.length
            });
        }

        return result;
    }

    emitSignal(ptyId, signal, data = {}) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        // Handle common signals
        switch (signal) {
            case 'SIGINT':
                pty.signals.SIGINT = true;
                this.handleInterrupt(ptyId);
                break;
            case 'SIGTERM':
                pty.signals.SIGTERM = true;
                this.handleTerminate(ptyId);
                break;
            case 'SIGKILL':
                pty.signals.SIGKILL = true;
                this.handleKill(ptyId);
                break;
            case 'SIGSTOP':
                pty.signals.SIGSTOP = true;
                this.handleStop(ptyId);
                break;
            case 'SIGCONT':
                pty.signals.SIGCONT = true;
                this.handleContinue(ptyId);
                break;
            case 'SIGWINCH':
                this.handleWindowChange(ptyId, data);
                break;
        }

        if (this.telemetry) {
            this.telemetry.logEvent('pty_signal', { ptyId, signal, data });
        }
    }

    getStatus(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) {
            throw new Error(`PTY not found: ${ptyId}`);
        }

        return {
            id: pty.id,
            state: pty.state,
            dimensions: { rows: pty.rows, cols: pty.cols },
            bufferStats: {
                inputBufferSize: pty.inputBuffer.length,
                outputBufferSize: pty.outputBuffer.length,
                totalBufferMemory: this.calculateBufferMemory(pty)
            },
            lastActivity: pty.lastActivity,
            activeSignals: Object.entries(pty.signals)
                .filter(([_, active]) => active)
                .map(([signal, _]) => signal),
            environment: {
                workingDirectory: pty.workingDirectory,
                encoding: pty.encoding
            }
        };
    }

    listPtys() {
        return Array.from(this.ptyInstances.keys()).map(ptyId => {
            return this.getStatus(ptyId);
        });
    }

    // Process special input sequences (escape codes, control characters)
    processInputSequences(data) {
        if (typeof data !== 'string') return data;

        // Handle common escape sequences
        const sequences = {
            '\u001b[A': '\u001b[A', // Up arrow
            '\u001b[B': '\u001b[B', // Down arrow
            '\u001b[C': '\u001b[C', // Right arrow
            '\u001b[D': '\u001b[D', // Left arrow
            '\u0003': '\u0003',     // Ctrl+C
            '\u0004': '\u0004',     // Ctrl+D
            '\u001a': '\u001a',     // Ctrl+Z
            '\u0008': '\u0008',     // Backspace
            '\u007f': '\u007f',     // Delete
            '\u0009': '\u0009',     // Tab
            '\u000d': '\u000a',     // CR -> LF
        };

        let result = data;
        for (const [sequence, replacement] of Object.entries(sequences)) {
            result = result.replace(new RegExp(sequence, 'g'), replacement);
        }

        return result;
    }

    // Signal handlers
    handleInterrupt(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty) {
            // Simulate sending interrupt to foreground process
            this.addOutput(ptyId, '^C\n');
        }
    }

    handleTerminate(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty) {
            pty.state = 'terminating';
        }
    }

    handleKill(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty) {
            pty.state = 'killed';
        }
    }

    handleStop(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty) {
            pty.state = 'stopped';
        }
    }

    handleContinue(ptyId) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty && pty.state === 'stopped') {
            pty.state = 'ready';
        }
    }

    handleWindowChange(ptyId, data) {
        const pty = this.ptyInstances.get(ptyId);
        if (pty && data.rows && data.cols) {
            pty.rows = data.rows;
            pty.cols = data.cols;
        }
    }

    handleWindowResize() {
        // Update all PTYs with new dimensions
        for (const [ptyId, pty] of this.ptyInstances) {
            const container = document.querySelector('.terminal-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const charWidth = 8; // Approximate character width
                const charHeight = 16; // Approximate character height
                
                const newCols = Math.floor(rect.width / charWidth);
                const newRows = Math.floor(rect.height / charHeight);
                
                if (newCols !== pty.cols || newRows !== pty.rows) {
                    this.resize(ptyId, newRows, newCols);
                }
            }
        }
    }

    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        if (this.telemetry) {
            this.telemetry.logEvent('pty_visibility_change', { visible: isVisible });
        }
        
        // Pause/resume PTY processing based on visibility
        for (const [ptyId, pty] of this.ptyInstances) {
            if (isVisible && pty.state === 'paused') {
                pty.state = 'ready';
            } else if (!isVisible && pty.state === 'ready') {
                pty.state = 'paused';
            }
        }
    }

    addOutput(ptyId, data) {
        const pty = this.ptyInstances.get(ptyId);
        if (!pty) return;

        const buffer = typeof data === 'string' ? 
            new TextEncoder().encode(data) : data;

        pty.outputBuffer.push({
            data: buffer,
            timestamp: Date.now()
        });

        pty.lastActivity = Date.now();

        // Limit output buffer size
        while (pty.outputBuffer.length > 1000) {
            pty.outputBuffer.shift();
        }
    }

    calculateBufferMemory(pty) {
        let total = 0;
        
        for (const entry of pty.inputBuffer) {
            total += entry.data.length;
        }
        
        for (const entry of pty.outputBuffer) {
            total += entry.data.length;
        }
        
        return total;
    }

    generatePtyId() {
        return `pty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Export PTY state for debugging
    exportState() {
        const state = {};
        for (const [ptyId, pty] of this.ptyInstances) {
            state[ptyId] = {
                ...this.getStatus(ptyId),
                bufferData: {
                    inputEntries: pty.inputBuffer.length,
                    outputEntries: pty.outputBuffer.length
                }
            };
        }
        return state;
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TTYPtyModule;
}
