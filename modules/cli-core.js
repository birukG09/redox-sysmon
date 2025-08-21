/**
 * CLI Core Module - WALIA-RX Console Subsystem
 * Handles argument parsing, formatting, progress, colors, and consistent exit codes
 */

class CLICoreModule {
    constructor() {
        this.exitCodes = {
            SUCCESS: 0,
            GENERAL_ERROR: 1,
            MISUSE_OF_BUILTIN: 2,
            COMMAND_NOT_FOUND: 127,
            INVALID_ARGUMENT: 128,
            PERMISSION_DENIED: 126,
            INTERRUPTED: 130
        };
        
        this.colorSchemes = {
            default: {
                error: '\u001b[31m',    // Red
                warning: '\u001b[33m',  // Yellow
                success: '\u001b[32m',  // Green
                info: '\u001b[36m',     // Cyan
                highlight: '\u001b[35m', // Magenta
                reset: '\u001b[0m'      // Reset
            },
            minimal: {
                error: '',
                warning: '',
                success: '',
                info: '',
                highlight: '',
                reset: ''
            }
        };
        
        this.config = {
            colorEnabled: this.detectColorSupport(),
            progressEnabled: true,
            pageSize: 25,
            currentColorScheme: 'default'
        };
        
        this.telemetry = null;
        console.log('CLI Core module initialized');
    }

    setTelemetry(telemetryModule) {
        this.telemetry = telemetryModule;
    }

    // Argument parsing functionality
    parseArgs(args, schema = {}) {
        const result = {
            positional: [],
            flags: {},
            options: {},
            errors: []
        };

        if (typeof args === 'string') {
            args = this.tokenizeCommand(args);
        }

        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            
            if (arg.startsWith('--')) {
                // Long option
                const [key, value] = arg.substring(2).split('=', 2);
                if (value !== undefined) {
                    result.options[key] = value;
                } else if (schema[key] && schema[key].type === 'boolean') {
                    result.flags[key] = true;
                } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                    result.options[key] = args[++i];
                } else {
                    result.flags[key] = true;
                }
            } else if (arg.startsWith('-') && arg.length > 1) {
                // Short option(s)
                const flags = arg.substring(1);
                for (const flag of flags) {
                    result.flags[flag] = true;
                }
            } else {
                // Positional argument
                result.positional.push(arg);
            }
            
            i++;
        }

        // Validate against schema
        if (schema) {
            this.validateArgs(result, schema);
        }

        if (this.telemetry) {
            this.telemetry.logEvent('args_parsed', {
                positionalCount: result.positional.length,
                flagCount: Object.keys(result.flags).length,
                optionCount: Object.keys(result.options).length,
                errorCount: result.errors.length
            });
        }

        return result;
    }

    tokenizeCommand(command) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let escaped = false;

        for (let i = 0; i < command.length; i++) {
            const char = command[i];
            
            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }
            
            if (char === '\\') {
                escaped = true;
                continue;
            }
            
            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
                continue;
            }
            
            if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
                continue;
            }
            
            if (!inQuotes && /\s/.test(char)) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }
            
            current += char;
        }
        
        if (current) {
            tokens.push(current);
        }
        
        return tokens;
    }

    validateArgs(parsed, schema) {
        for (const [key, definition] of Object.entries(schema)) {
            if (definition.required) {
                const hasFlag = parsed.flags[key];
                const hasOption = parsed.options[key] !== undefined;
                const hasPositional = definition.positional !== undefined && 
                                    parsed.positional[definition.positional] !== undefined;
                
                if (!hasFlag && !hasOption && !hasPositional) {
                    parsed.errors.push(`Missing required argument: ${key}`);
                }
            }
            
            if (definition.type && parsed.options[key] !== undefined) {
                const value = parsed.options[key];
                if (!this.validateType(value, definition.type)) {
                    parsed.errors.push(`Invalid type for ${key}: expected ${definition.type}`);
                }
            }
        }
    }

    validateType(value, type) {
        switch (type) {
            case 'number':
                return !isNaN(Number(value));
            case 'integer':
                return Number.isInteger(Number(value));
            case 'boolean':
                return ['true', 'false', '1', '0'].includes(value.toLowerCase());
            case 'string':
                return typeof value === 'string';
            default:
                return true;
        }
    }

    // Output formatting functionality
    format(text, options = {}) {
        const {
            color = null,
            bold = false,
            italic = false,
            underline = false,
            indent = 0,
            prefix = '',
            suffix = ''
        } = options;

        let formatted = text;
        
        // Apply indentation
        if (indent > 0) {
            const indentStr = ' '.repeat(indent);
            formatted = formatted.split('\n').map(line => indentStr + line).join('\n');
        }
        
        // Apply prefix and suffix
        formatted = prefix + formatted + suffix;
        
        // Apply colors if enabled
        if (this.config.colorEnabled && color) {
            const colors = this.colorSchemes[this.config.currentColorScheme];
            const colorCode = colors[color] || color;
            formatted = colorCode + formatted + colors.reset;
        }
        
        // Apply text styles
        if (this.config.colorEnabled) {
            if (bold) formatted = '\u001b[1m' + formatted + '\u001b[22m';
            if (italic) formatted = '\u001b[3m' + formatted + '\u001b[23m';
            if (underline) formatted = '\u001b[4m' + formatted + '\u001b[24m';
        }
        
        return formatted;
    }

    formatTable(data, options = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        const {
            headers = null,
            maxWidth = 80,
            alignment = 'left',
            borderStyle = 'simple'
        } = options;

        const columns = headers || Object.keys(data[0]);
        const columnWidths = {};
        
        // Calculate column widths
        for (const col of columns) {
            columnWidths[col] = Math.max(
                col.length,
                ...data.map(row => String(row[col] || '').length)
            );
        }

        let result = '';
        
        // Add header if provided
        if (headers) {
            const headerRow = columns.map(col => 
                this.padString(col, columnWidths[col], alignment)
            ).join(' | ');
            
            result += this.format(headerRow, { color: 'highlight', bold: true }) + '\n';
            
            // Add separator
            const separator = columns.map(col => 
                '-'.repeat(columnWidths[col])
            ).join('-+-');
            result += separator + '\n';
        }
        
        // Add data rows
        for (const row of data) {
            const dataRow = columns.map(col => 
                this.padString(String(row[col] || ''), columnWidths[col], alignment)
            ).join(' | ');
            
            result += dataRow + '\n';
        }
        
        return result;
    }

    formatList(items, options = {}) {
        const {
            style = 'bullet',
            indent = 2,
            numbered = false
        } = options;

        const bullet = style === 'bullet' ? '•' : 
                      style === 'dash' ? '-' : 
                      style === 'arrow' ? '→' : '•';

        return items.map((item, index) => {
            const prefix = numbered ? 
                `${index + 1}.` : 
                bullet;
            
            return this.format(`${prefix} ${item}`, { indent });
        }).join('\n');
    }

    padString(str, width, alignment = 'left') {
        if (str.length >= width) return str;
        
        const padding = width - str.length;
        
        switch (alignment) {
            case 'right':
                return ' '.repeat(padding) + str;
            case 'center':
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
            default:
                return str + ' '.repeat(padding);
        }
    }

    // Progress and status functionality
    createProgressBar(options = {}) {
        const {
            total = 100,
            width = 40,
            char = '█',
            incomplete = '░',
            prefix = '',
            suffix = ''
        } = options;

        return {
            total,
            current: 0,
            update: (value) => {
                this.current = Math.min(value, total);
                const percentage = (this.current / total) * 100;
                const completed = Math.floor((this.current / total) * width);
                const remaining = width - completed;
                
                const bar = char.repeat(completed) + incomplete.repeat(remaining);
                const display = `${prefix}[${bar}] ${percentage.toFixed(1)}% ${suffix}`;
                
                return this.format(display, { color: 'info' });
            }
        };
    }

    showSpinner(message = 'Loading...') {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let frameIndex = 0;
        
        const interval = setInterval(() => {
            const frame = frames[frameIndex % frames.length];
            process.stdout.write(`\r${frame} ${message}`);
            frameIndex++;
        }, 100);
        
        return {
            stop: () => {
                clearInterval(interval);
                process.stdout.write('\r' + ' '.repeat(message.length + 2) + '\r');
            }
        };
    }

    // Paging functionality
    createPager(content, options = {}) {
        const {
            pageSize = this.config.pageSize,
            prompt = 'Press Enter for more, q to quit: '
        } = options;

        const lines = content.split('\n');
        let currentPage = 0;
        const totalPages = Math.ceil(lines.length / pageSize);

        return {
            show: () => {
                const start = currentPage * pageSize;
                const end = Math.min(start + pageSize, lines.length);
                const pageLines = lines.slice(start, end);
                
                console.log(pageLines.join('\n'));
                
                if (end < lines.length) {
                    const pageInfo = this.format(
                        `Page ${currentPage + 1}/${totalPages}`, 
                        { color: 'info' }
                    );
                    console.log(pageInfo);
                    return true; // More pages available
                }
                
                return false; // No more pages
            },
            next: () => {
                if ((currentPage + 1) * pageSize < lines.length) {
                    currentPage++;
                    return true;
                }
                return false;
            },
            previous: () => {
                if (currentPage > 0) {
                    currentPage--;
                    return true;
                }
                return false;
            },
            goToPage: (page) => {
                if (page >= 0 && page < totalPages) {
                    currentPage = page;
                    return true;
                }
                return false;
            }
        };
    }

    // Error handling and exit codes
    handleError(error, context = {}) {
        const errorMessage = this.format(`Error: ${error.message}`, { 
            color: 'error', 
            bold: true 
        });
        
        console.error(errorMessage);
        
        if (this.telemetry) {
            this.telemetry.logEvent('cli_error', {
                error: error.message,
                context,
                stack: error.stack
            });
        }
        
        // Return appropriate exit code
        if (error.code) {
            return error.code;
        }
        
        return this.exitCodes.GENERAL_ERROR;
    }

    formatHelp(command, description, options = {}) {
        let help = '';
        
        // Command header
        help += this.format(`${command}`, { color: 'highlight', bold: true }) + '\n\n';
        
        // Description
        help += this.format(description, { indent: 2 }) + '\n\n';
        
        // Usage
        if (options.usage) {
            help += this.format('USAGE:', { color: 'info', bold: true }) + '\n';
            help += this.format(options.usage, { indent: 4 }) + '\n\n';
        }
        
        // Options
        if (options.options && options.options.length > 0) {
            help += this.format('OPTIONS:', { color: 'info', bold: true }) + '\n';
            for (const option of options.options) {
                const optionLine = `${option.flags.padEnd(20)} ${option.description}`;
                help += this.format(optionLine, { indent: 4 }) + '\n';
            }
            help += '\n';
        }
        
        // Examples
        if (options.examples && options.examples.length > 0) {
            help += this.format('EXAMPLES:', { color: 'info', bold: true }) + '\n';
            for (const example of options.examples) {
                help += this.format(example, { indent: 4, color: 'success' }) + '\n';
            }
        }
        
        return help;
    }

    detectColorSupport() {
        // Check NO_COLOR environment variable
        if (typeof process !== 'undefined' && process.env && process.env.NO_COLOR) {
            return false;
        }
        
        // For web environment, assume color support
        if (typeof window !== 'undefined') {
            return true;
        }
        
        // For Node.js, check TTY and TERM
        if (typeof process !== 'undefined' && process.stdout && process.stdout.isTTY) {
            const term = process.env.TERM || '';
            return term !== 'dumb' && term !== '';
        }
        
        return false;
    }

    setColorScheme(scheme) {
        if (this.colorSchemes[scheme]) {
            this.config.currentColorScheme = scheme;
            return true;
        }
        return false;
    }

    enableColor(enabled) {
        this.config.colorEnabled = enabled;
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLICoreModule;
}
