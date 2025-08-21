/**
 * Term Core Module - WALIA-RX Console Subsystem
 * Handles VT emulation, rendering, input handling, scrollback, replay, and clipboard API
 */

class TermCoreModule {
    constructor() {
        this.terminalState = {
            cursorX: 0,
            cursorY: 0,
            rows: 24,
            cols: 80,
            scrollTop: 0,
            scrollBottom: 23,
            charset: 'B', // ASCII
            wraparound: true,
            originMode: false,
            insertMode: false,
            applicationKeypad: false,
            applicationCursor: false
        };
        
        this.screen = [];
        this.scrollback = [];
        this.attributes = {
            bold: false,
            dim: false,
            italic: false,
            underline: false,
            blink: false,
            reverse: false,
            strikethrough: false,
            foreground: 7, // White
            background: 0  // Black
        };
        
        this.config = {
            maxScrollback: 10000,
            tabSize: 8,
            enableReplay: true,
            enableMouse: true,
            enableClipboard: true,
            maxReplaySize: 1000000 // 1MB
        };
        
        this.sessionLog = [];
        this.replayData = [];
        this.isReplaying = false;
        this.telemetry = null;
        
        this.initializeScreen();
        this.setupKeyHandlers();
        
        console.log('Term Core module initialized');
    }

    setTelemetry(telemetryModule) {
        this.telemetry = telemetryModule;
    }

    initializeScreen() {
        for (let row = 0; row < this.terminalState.rows; row++) {
            this.screen[row] = [];
            for (let col = 0; col < this.terminalState.cols; col++) {
                this.screen[row][col] = {
                    char: ' ',
                    attributes: { ...this.attributes }
                };
            }
        }
    }

    setupKeyHandlers() {
        // VT100/ANSI key sequence mappings
        this.keyMappings = {
            'ArrowUp': '\x1b[A',
            'ArrowDown': '\x1b[B',
            'ArrowRight': '\x1b[C',
            'ArrowLeft': '\x1b[D',
            'Home': '\x1b[H',
            'End': '\x1b[F',
            'PageUp': '\x1b[5~',
            'PageDown': '\x1b[6~',
            'Insert': '\x1b[2~',
            'Delete': '\x1b[3~',
            'F1': '\x1bOP',
            'F2': '\x1bOQ',
            'F3': '\x1bOR',
            'F4': '\x1bOS',
            'F5': '\x1b[15~',
            'F6': '\x1b[17~',
            'F7': '\x1b[18~',
            'F8': '\x1b[19~',
            'F9': '\x1b[20~',
            'F10': '\x1b[21~',
            'F11': '\x1b[23~',
            'F12': '\x1b[24~'
        };
    }

    write(data) {
        const startTime = performance.now();
        
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        
        // Log for replay functionality
        if (this.config.enableReplay && !this.isReplaying) {
            this.addToReplayLog('output', data);
        }
        
        // Process VT100/ANSI sequences
        this.processOutput(data);
        
        const duration = performance.now() - startTime;
        
        if (this.telemetry) {
            this.telemetry.logEvent('terminal_write', {
                bytes: data.length,
                duration
            });
        }
        
        return data.length;
    }

    processOutput(data) {
        const text = new TextDecoder().decode(data);
        let i = 0;
        
        while (i < text.length) {
            const char = text[i];
            
            if (char === '\x1b') {
                // Process escape sequence
                const sequenceResult = this.processEscapeSequence(text, i);
                i = sequenceResult.newIndex;
            } else if (char === '\r') {
                // Carriage return
                this.terminalState.cursorX = 0;
                i++;
            } else if (char === '\n') {
                // Line feed
                this.lineFeed();
                i++;
            } else if (char === '\t') {
                // Tab
                this.tab();
                i++;
            } else if (char === '\b') {
                // Backspace
                this.backspace();
                i++;
            } else if (char.charCodeAt(0) >= 32) {
                // Printable character
                this.insertCharacter(char);
                i++;
            } else {
                // Other control characters
                i++;
            }
        }
        
        this.updateDisplay();
    }

    processEscapeSequence(text, startIndex) {
        let i = startIndex + 1;
        
        if (i >= text.length) {
            return { newIndex: startIndex + 1 };
        }
        
        const nextChar = text[i];
        
        if (nextChar === '[') {
            // CSI sequence
            return this.processCSISequence(text, i + 1);
        } else if (nextChar === ']') {
            // OSC sequence
            return this.processOSCSequence(text, i + 1);
        } else if (nextChar === '(') {
            // Character set selection
            i += 2; // Skip charset identifier
            return { newIndex: i };
        } else {
            // Simple escape sequence
            switch (nextChar) {
                case 'M': // Reverse index
                    this.reverseIndex();
                    break;
                case 'D': // Index
                    this.index();
                    break;
                case 'E': // Next line
                    this.nextLine();
                    break;
                case 'H': // Tab set
                    // Implementation for tab set
                    break;
                case '7': // Save cursor
                    this.saveCursor();
                    break;
                case '8': // Restore cursor
                    this.restoreCursor();
                    break;
            }
            return { newIndex: i + 1 };
        }
    }

    processCSISequence(text, startIndex) {
        let i = startIndex;
        let paramString = '';
        
        // Collect parameters
        while (i < text.length && text[i].match(/[0-9;]/)) {
            paramString += text[i];
            i++;
        }
        
        if (i >= text.length) {
            return { newIndex: text.length };
        }
        
        const command = text[i];
        const params = paramString ? paramString.split(';').map(p => parseInt(p) || 0) : [];
        
        switch (command) {
            case 'A': // Cursor up
                this.cursorUp(params[0] || 1);
                break;
            case 'B': // Cursor down
                this.cursorDown(params[0] || 1);
                break;
            case 'C': // Cursor right
                this.cursorRight(params[0] || 1);
                break;
            case 'D': // Cursor left
                this.cursorLeft(params[0] || 1);
                break;
            case 'H': // Cursor position
                this.setCursorPosition(params[0] || 1, params[1] || 1);
                break;
            case 'J': // Erase display
                this.eraseDisplay(params[0] || 0);
                break;
            case 'K': // Erase line
                this.eraseLine(params[0] || 0);
                break;
            case 'm': // Set graphics rendition
                this.setGraphicsRendition(params);
                break;
            case 'r': // Set scroll region
                this.setScrollRegion(params[0] || 1, params[1] || this.terminalState.rows);
                break;
            case 's': // Save cursor position
                this.saveCursor();
                break;
            case 'u': // Restore cursor position
                this.restoreCursor();
                break;
            case 'l': // Reset mode
            case 'h': // Set mode
                this.setMode(params, command === 'h');
                break;
        }
        
        return { newIndex: i + 1 };
    }

    processOSCSequence(text, startIndex) {
        let i = startIndex;
        
        // Find the end of OSC sequence (ST or BEL)
        while (i < text.length && text[i] !== '\x07' && 
               !(text[i] === '\x1b' && text[i + 1] === '\\')) {
            i++;
        }
        
        if (i < text.length) {
            if (text[i] === '\x07') {
                i++;
            } else {
                i += 2; // Skip ESC \
            }
        }
        
        return { newIndex: i };
    }

    insertCharacter(char) {
        if (this.terminalState.cursorX >= this.terminalState.cols) {
            if (this.terminalState.wraparound) {
                this.terminalState.cursorX = 0;
                this.lineFeed();
            } else {
                this.terminalState.cursorX = this.terminalState.cols - 1;
            }
        }
        
        this.screen[this.terminalState.cursorY][this.terminalState.cursorX] = {
            char: char,
            attributes: { ...this.attributes }
        };
        
        this.terminalState.cursorX++;
    }

    lineFeed() {
        if (this.terminalState.cursorY === this.terminalState.scrollBottom) {
            this.scrollUp();
        } else {
            this.terminalState.cursorY++;
        }
    }

    scrollUp() {
        // Move top line to scrollback
        const topLine = this.screen[this.terminalState.scrollTop];
        this.scrollback.push(topLine);
        
        // Limit scrollback size
        if (this.scrollback.length > this.config.maxScrollback) {
            this.scrollback = this.scrollback.slice(-this.config.maxScrollback / 2);
        }
        
        // Scroll screen up
        for (let row = this.terminalState.scrollTop; row < this.terminalState.scrollBottom; row++) {
            this.screen[row] = this.screen[row + 1];
        }
        
        // Clear bottom line
        this.screen[this.terminalState.scrollBottom] = [];
        for (let col = 0; col < this.terminalState.cols; col++) {
            this.screen[this.terminalState.scrollBottom][col] = {
                char: ' ',
                attributes: { ...this.attributes }
            };
        }
    }

    tab() {
        const nextTabStop = Math.floor((this.terminalState.cursorX + this.config.tabSize) / this.config.tabSize) * this.config.tabSize;
        this.terminalState.cursorX = Math.min(nextTabStop, this.terminalState.cols - 1);
    }

    backspace() {
        if (this.terminalState.cursorX > 0) {
            this.terminalState.cursorX--;
        }
    }

    // Cursor movement methods
    cursorUp(count) {
        this.terminalState.cursorY = Math.max(this.terminalState.scrollTop, this.terminalState.cursorY - count);
    }

    cursorDown(count) {
        this.terminalState.cursorY = Math.min(this.terminalState.scrollBottom, this.terminalState.cursorY + count);
    }

    cursorRight(count) {
        this.terminalState.cursorX = Math.min(this.terminalState.cols - 1, this.terminalState.cursorX + count);
    }

    cursorLeft(count) {
        this.terminalState.cursorX = Math.max(0, this.terminalState.cursorX - count);
    }

    setCursorPosition(row, col) {
        this.terminalState.cursorY = Math.max(0, Math.min(this.terminalState.rows - 1, row - 1));
        this.terminalState.cursorX = Math.max(0, Math.min(this.terminalState.cols - 1, col - 1));
    }

    // Erase methods
    eraseDisplay(mode) {
        switch (mode) {
            case 0: // Erase from cursor to end of display
                this.eraseLine(0);
                for (let row = this.terminalState.cursorY + 1; row < this.terminalState.rows; row++) {
                    this.clearRow(row);
                }
                break;
            case 1: // Erase from beginning of display to cursor
                for (let row = 0; row < this.terminalState.cursorY; row++) {
                    this.clearRow(row);
                }
                this.eraseLine(1);
                break;
            case 2: // Erase entire display
                for (let row = 0; row < this.terminalState.rows; row++) {
                    this.clearRow(row);
                }
                this.setCursorPosition(1, 1);
                break;
        }
    }

    eraseLine(mode) {
        const row = this.terminalState.cursorY;
        
        switch (mode) {
            case 0: // Erase from cursor to end of line
                for (let col = this.terminalState.cursorX; col < this.terminalState.cols; col++) {
                    this.screen[row][col] = { char: ' ', attributes: { ...this.attributes } };
                }
                break;
            case 1: // Erase from beginning of line to cursor
                for (let col = 0; col <= this.terminalState.cursorX; col++) {
                    this.screen[row][col] = { char: ' ', attributes: { ...this.attributes } };
                }
                break;
            case 2: // Erase entire line
                this.clearRow(row);
                break;
        }
    }

    clearRow(row) {
        this.screen[row] = [];
        for (let col = 0; col < this.terminalState.cols; col++) {
            this.screen[row][col] = {
                char: ' ',
                attributes: { ...this.attributes }
            };
        }
    }

    setGraphicsRendition(params) {
        if (params.length === 0) {
            params = [0];
        }
        
        for (const param of params) {
            switch (param) {
                case 0: // Reset
                    this.attributes = {
                        bold: false,
                        dim: false,
                        italic: false,
                        underline: false,
                        blink: false,
                        reverse: false,
                        strikethrough: false,
                        foreground: 7,
                        background: 0
                    };
                    break;
                case 1: // Bold
                    this.attributes.bold = true;
                    break;
                case 2: // Dim
                    this.attributes.dim = true;
                    break;
                case 3: // Italic
                    this.attributes.italic = true;
                    break;
                case 4: // Underline
                    this.attributes.underline = true;
                    break;
                case 5: // Blink
                    this.attributes.blink = true;
                    break;
                case 7: // Reverse
                    this.attributes.reverse = true;
                    break;
                case 9: // Strikethrough
                    this.attributes.strikethrough = true;
                    break;
                case 22: // Normal intensity
                    this.attributes.bold = false;
                    this.attributes.dim = false;
                    break;
                case 23: // Not italic
                    this.attributes.italic = false;
                    break;
                case 24: // Not underlined
                    this.attributes.underline = false;
                    break;
                case 25: // Not blinking
                    this.attributes.blink = false;
                    break;
                case 27: // Not reversed
                    this.attributes.reverse = false;
                    break;
                case 29: // Not strikethrough
                    this.attributes.strikethrough = false;
                    break;
                default:
                    if (param >= 30 && param <= 37) {
                        // Foreground colors
                        this.attributes.foreground = param - 30;
                    } else if (param >= 40 && param <= 47) {
                        // Background colors
                        this.attributes.background = param - 40;
                    }
                    break;
            }
        }
    }

    setScrollRegion(top, bottom) {
        this.terminalState.scrollTop = Math.max(0, top - 1);
        this.terminalState.scrollBottom = Math.min(this.terminalState.rows - 1, bottom - 1);
        this.setCursorPosition(1, 1);
    }

    setMode(params, enable) {
        for (const param of params) {
            switch (param) {
                case 1: // Application cursor keys
                    this.terminalState.applicationCursor = enable;
                    break;
                case 25: // Show/hide cursor
                    // Implementation for cursor visibility
                    break;
                case 1000: // Mouse reporting
                    // Implementation for mouse reporting
                    break;
                case 1049: // Alternative screen buffer
                    // Implementation for alternative screen
                    break;
            }
        }
    }

    saveCursor() {
        this.savedCursor = {
            x: this.terminalState.cursorX,
            y: this.terminalState.cursorY,
            attributes: { ...this.attributes }
        };
    }

    restoreCursor() {
        if (this.savedCursor) {
            this.terminalState.cursorX = this.savedCursor.x;
            this.terminalState.cursorY = this.savedCursor.y;
            this.attributes = { ...this.savedCursor.attributes };
        }
    }

    reverseIndex() {
        if (this.terminalState.cursorY === this.terminalState.scrollTop) {
            this.scrollDown();
        } else {
            this.terminalState.cursorY--;
        }
    }

    index() {
        if (this.terminalState.cursorY === this.terminalState.scrollBottom) {
            this.scrollUp();
        } else {
            this.terminalState.cursorY++;
        }
    }

    nextLine() {
        this.terminalState.cursorX = 0;
        this.index();
    }

    scrollDown() {
        // Move bottom line up
        for (let row = this.terminalState.scrollBottom; row > this.terminalState.scrollTop; row--) {
            this.screen[row] = this.screen[row - 1];
        }
        
        // Clear top line
        this.clearRow(this.terminalState.scrollTop);
    }

    resize(rows, cols) {
        const oldRows = this.terminalState.rows;
        const oldCols = this.terminalState.cols;
        
        this.terminalState.rows = rows;
        this.terminalState.cols = cols;
        this.terminalState.scrollBottom = rows - 1;
        
        // Resize screen buffer
        if (rows > oldRows) {
            // Add new rows
            for (let row = oldRows; row < rows; row++) {
                this.screen[row] = [];
                for (let col = 0; col < cols; col++) {
                    this.screen[row][col] = {
                        char: ' ',
                        attributes: { ...this.attributes }
                    };
                }
            }
        } else if (rows < oldRows) {
            // Remove excess rows (move to scrollback)
            for (let row = rows; row < oldRows; row++) {
                if (this.screen[row]) {
                    this.scrollback.push(this.screen[row]);
                }
            }
            this.screen = this.screen.slice(0, rows);
        }
        
        // Adjust column width for existing rows
        for (let row = 0; row < Math.min(rows, oldRows); row++) {
            if (cols > oldCols) {
                // Add new columns
                for (let col = oldCols; col < cols; col++) {
                    this.screen[row][col] = {
                        char: ' ',
                        attributes: { ...this.attributes }
                    };
                }
            } else if (cols < oldCols) {
                // Remove excess columns
                this.screen[row] = this.screen[row].slice(0, cols);
            }
        }
        
        // Adjust cursor position
        this.terminalState.cursorX = Math.min(this.terminalState.cursorX, cols - 1);
        this.terminalState.cursorY = Math.min(this.terminalState.cursorY, rows - 1);
        
        if (this.telemetry) {
            this.telemetry.logEvent('terminal_resized', {
                oldSize: { rows: oldRows, cols: oldCols },
                newSize: { rows, cols }
            });
        }
        
        this.updateDisplay();
    }

    updateDisplay() {
        // This would trigger a re-render in the actual implementation
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    // Replay functionality
    startReplay(replayData) {
        if (!this.config.enableReplay) {
            throw new Error('Replay is disabled');
        }
        
        this.isReplaying = true;
        this.replayIndex = 0;
        this.replayData = replayData;
        
        // Clear current screen
        this.initializeScreen();
        this.terminalState.cursorX = 0;
        this.terminalState.cursorY = 0;
        
        if (this.telemetry) {
            this.telemetry.logEvent('replay_started', {
                entries: replayData.length
            });
        }
    }

    stepReplay() {
        if (!this.isReplaying || this.replayIndex >= this.replayData.length) {
            return false;
        }
        
        const entry = this.replayData[this.replayIndex];
        if (entry.type === 'output') {
            this.write(entry.data);
        }
        
        this.replayIndex++;
        return this.replayIndex < this.replayData.length;
    }

    stopReplay() {
        this.isReplaying = false;
        this.replayIndex = 0;
        
        if (this.telemetry) {
            this.telemetry.logEvent('replay_stopped');
        }
    }

    addToReplayLog(type, data) {
        this.sessionLog.push({
            type,
            data,
            timestamp: Date.now()
        });
        
        // Limit session log size
        if (this.sessionLog.length > this.config.maxReplaySize) {
            this.sessionLog = this.sessionLog.slice(-this.config.maxReplaySize / 2);
        }
    }

    exportSessionLog() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            terminalSize: {
                rows: this.terminalState.rows,
                cols: this.terminalState.cols
            },
            entries: this.sessionLog
        };
    }

    // Clipboard functionality
    copySelection(startRow, startCol, endRow, endCol) {
        if (!this.config.enableClipboard) {
            throw new Error('Clipboard is disabled');
        }
        
        let text = '';
        
        for (let row = startRow; row <= endRow; row++) {
            let lineText = '';
            const startColForRow = row === startRow ? startCol : 0;
            const endColForRow = row === endRow ? endCol : this.terminalState.cols - 1;
            
            for (let col = startColForRow; col <= endColForRow; col++) {
                if (this.screen[row] && this.screen[row][col]) {
                    lineText += this.screen[row][col].char;
                }
            }
            
            text += lineText;
            if (row < endRow) {
                text += '\n';
            }
        }
        
        // Use Clipboard API if available
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text.trim());
        }
        
        if (this.telemetry) {
            this.telemetry.logEvent('text_copied', {
                length: text.length
            });
        }
        
        return text.trim();
    }

    getScreenText() {
        let text = '';
        for (let row = 0; row < this.terminalState.rows; row++) {
            let lineText = '';
            for (let col = 0; col < this.terminalState.cols; col++) {
                if (this.screen[row] && this.screen[row][col]) {
                    lineText += this.screen[row][col].char;
                }
            }
            text += lineText.trimEnd();
            if (row < this.terminalState.rows - 1) {
                text += '\n';
            }
        }
        return text;
    }

    getScrollbackText() {
        return this.scrollback.map(line => 
            line.map(cell => cell.char).join('').trimEnd()
        ).join('\n');
    }

    clear() {
        this.initializeScreen();
        this.terminalState.cursorX = 0;
        this.terminalState.cursorY = 0;
        this.updateDisplay();
        
        if (this.telemetry) {
            this.telemetry.logEvent('terminal_cleared');
        }
    }

    getState() {
        return {
            cursor: {
                x: this.terminalState.cursorX,
                y: this.terminalState.cursorY
            },
            size: {
                rows: this.terminalState.rows,
                cols: this.terminalState.cols
            },
            scrollback: {
                lines: this.scrollback.length,
                maxLines: this.config.maxScrollback
            },
            session: {
                logEntries: this.sessionLog.length,
                isReplaying: this.isReplaying
            }
        };
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermCoreModule;
}
