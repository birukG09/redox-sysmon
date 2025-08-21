/**
 * Ion Core Module - WALIA-RX Console Subsystem
 * Handles Ion shell functionality including parser, AST execution, builtins, and job control
 */

class IonCoreModule {
    constructor() {
        this.builtins = new Map();
        this.aliases = new Map();
        this.variables = new Map();
        this.history = [];
        this.jobs = new Map();
        this.currentJobId = 1;
        this.config = {
            maxHistorySize: 1000,
            maxJobCount: 100,
            enableJobControl: true,
            strictMode: false,
            pipefail: false,
            errexit: false
        };
        
        this.parser = new IonParser();
        this.executor = new IonExecutor();
        this.telemetry = null;
        
        this.initializeBuiltins();
        this.initializeVariables();
        
        console.log('Ion Core module initialized');
    }

    setTelemetry(telemetryModule) {
        this.telemetry = telemetryModule;
    }

    executeCommand(command) {
        const startTime = performance.now();
        
        try {
            // Add to history
            this.addToHistory(command);
            
            // Parse command
            const ast = this.parseCommand(command);
            
            if (!ast.valid) {
                return {
                    success: false,
                    output: `Parse error: ${ast.errors.join(', ')}`,
                    exitCode: 2
                };
            }
            
            // Execute parsed command
            const result = this.executor.execute(ast, this);
            
            const duration = performance.now() - startTime;
            
            if (this.telemetry) {
                this.telemetry.logEvent('ion_command_executed', {
                    command: command.split(' ')[0],
                    success: result.success,
                    duration,
                    exitCode: result.exitCode
                });
            }
            
            return result;
            
        } catch (error) {
            const duration = performance.now() - startTime;
            
            if (this.telemetry) {
                this.telemetry.logEvent('ion_command_error', {
                    error: error.message,
                    duration
                });
            }
            
            return {
                success: false,
                output: `Ion error: ${error.message}`,
                exitCode: 1
            };
        }
    }

    parseCommand(command) {
        return this.parser.parse(command);
    }

    validateSyntax(command) {
        const ast = this.parser.parse(command);
        return {
            valid: ast.valid,
            errors: ast.errors || []
        };
    }

    initializeBuiltins() {
        // Core navigation builtins
        this.builtins.set('cd', this.createCdBuiltin());
        this.builtins.set('pwd', this.createPwdBuiltin());
        
        // Output builtins
        this.builtins.set('echo', this.createEchoBuiltin());
        this.builtins.set('printf', this.createPrintfBuiltin());
        
        // Variable management
        this.builtins.set('set', this.createSetBuiltin());
        this.builtins.set('unset', this.createUnsetBuiltin());
        this.builtins.set('export', this.createExportBuiltin());
        
        // Testing and conditionals
        this.builtins.set('test', this.createTestBuiltin());
        this.builtins.set('[', this.createTestBuiltin());
        
        // History management
        this.builtins.set('history', this.createHistoryBuiltin());
        
        // Directory stack
        this.builtins.set('pushd', this.createPushdBuiltin());
        this.builtins.set('popd', this.createPopdBuiltin());
        this.builtins.set('dirs', this.createDirsBuiltin());
        
        // Alias management
        this.builtins.set('alias', this.createAliasBuiltin());
        this.builtins.set('unalias', this.createUnaliasBuiltin());
        
        // Job control
        this.builtins.set('jobs', this.createJobsBuiltin());
        this.builtins.set('fg', this.createFgBuiltin());
        this.builtins.set('bg', this.createBgBuiltin());
        this.builtins.set('kill', this.createKillBuiltin());
        
        // Shell control
        this.builtins.set('exit', this.createExitBuiltin());
        this.builtins.set('source', this.createSourceBuiltin());
        this.builtins.set('exec', this.createExecBuiltin());
    }

    initializeVariables() {
        this.variables.set('PWD', '/home/user');
        this.variables.set('HOME', '/home/user');
        this.variables.set('USER', 'user');
        this.variables.set('SHELL', '/bin/ion');
        this.variables.set('PATH', '/bin:/usr/bin:/usr/local/bin');
        this.variables.set('PS1', 'user@redox:~$ ');
        this.variables.set('HISTSIZE', '1000');
    }

    addToHistory(command) {
        if (command.trim() && command !== this.history[this.history.length - 1]) {
            this.history.push(command);
            
            if (this.history.length > this.config.maxHistorySize) {
                this.history = this.history.slice(-this.config.maxHistorySize / 2);
            }
        }
    }

    getVariable(name) {
        return this.variables.get(name);
    }

    setVariable(name, value, exported = false) {
        this.variables.set(name, value);
        if (exported) {
            this.variables.set(`__EXPORTED_${name}`, true);
        }
    }

    // Builtin implementations
    createCdBuiltin() {
        return {
            name: 'cd',
            description: 'Change the current directory',
            execute: (args) => {
                const target = args.length > 0 ? args[0] : this.getVariable('HOME');
                const oldPwd = this.getVariable('PWD');
                
                // Simulate directory change
                if (target === '-') {
                    const lastDir = this.getVariable('OLDPWD') || oldPwd;
                    this.setVariable('OLDPWD', oldPwd);
                    this.setVariable('PWD', lastDir);
                    return {
                        success: true,
                        output: lastDir,
                        exitCode: 0
                    };
                }
                
                // Basic path resolution
                let newPath;
                if (target.startsWith('/')) {
                    newPath = target;
                } else if (target === '..') {
                    const parts = oldPwd.split('/').filter(p => p);
                    parts.pop();
                    newPath = '/' + parts.join('/');
                } else {
                    newPath = oldPwd === '/' ? `/${target}` : `${oldPwd}/${target}`;
                }
                
                this.setVariable('OLDPWD', oldPwd);
                this.setVariable('PWD', newPath);
                
                return {
                    success: true,
                    output: '',
                    exitCode: 0
                };
            }
        };
    }

    createPwdBuiltin() {
        return {
            name: 'pwd',
            description: 'Print the current working directory',
            execute: (args) => ({
                success: true,
                output: this.getVariable('PWD'),
                exitCode: 0
            })
        };
    }

    createEchoBuiltin() {
        return {
            name: 'echo',
            description: 'Display a line of text',
            execute: (args) => {
                let output = args.join(' ');
                
                // Handle escape sequences
                if (args[0] === '-e') {
                    output = args.slice(1).join(' ');
                    output = output
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\r/g, '\r')
                        .replace(/\\\\/g, '\\');
                }
                
                // Handle no newline option
                if (args[0] === '-n') {
                    output = args.slice(1).join(' ');
                } else if (args[0] !== '-e') {
                    output += '\n';
                }
                
                return {
                    success: true,
                    output,
                    exitCode: 0
                };
            }
        };
    }

    createSetBuiltin() {
        return {
            name: 'set',
            description: 'Set shell variables and options',
            execute: (args) => {
                if (args.length === 0) {
                    // Display all variables
                    const vars = Array.from(this.variables.entries())
                        .map(([key, value]) => `${key}=${value}`)
                        .join('\n');
                    return {
                        success: true,
                        output: vars,
                        exitCode: 0
                    };
                }
                
                for (const arg of args) {
                    if (arg.includes('=')) {
                        const [name, ...valueParts] = arg.split('=');
                        const value = valueParts.join('=');
                        this.setVariable(name, value);
                    } else {
                        // Handle shell options
                        switch (arg) {
                            case '-e':
                            case 'errexit':
                                this.config.errexit = true;
                                break;
                            case '+e':
                                this.config.errexit = false;
                                break;
                            case '-x':
                            case 'xtrace':
                                this.config.xtrace = true;
                                break;
                            case '+x':
                                this.config.xtrace = false;
                                break;
                        }
                    }
                }
                
                return {
                    success: true,
                    output: '',
                    exitCode: 0
                };
            }
        };
    }

    createHistoryBuiltin() {
        return {
            name: 'history',
            description: 'Display command history',
            execute: (args) => {
                const count = args.length > 0 ? parseInt(args[0]) : this.history.length;
                const slice = this.history.slice(-count);
                
                const output = slice
                    .map((cmd, index) => `${this.history.length - slice.length + index + 1}  ${cmd}`)
                    .join('\n');
                
                return {
                    success: true,
                    output,
                    exitCode: 0
                };
            }
        };
    }

    createJobsBuiltin() {
        return {
            name: 'jobs',
            description: 'Display active jobs',
            execute: (args) => {
                if (this.jobs.size === 0) {
                    return {
                        success: true,
                        output: '',
                        exitCode: 0
                    };
                }
                
                const jobList = Array.from(this.jobs.entries())
                    .map(([id, job]) => `[${id}]${job.current ? '+' : '-'}  ${job.status}  ${job.command}`)
                    .join('\n');
                
                return {
                    success: true,
                    output: jobList,
                    exitCode: 0
                };
            }
        };
    }

    createAliasBuiltin() {
        return {
            name: 'alias',
            description: 'Create command aliases',
            execute: (args) => {
                if (args.length === 0) {
                    // Display all aliases
                    const aliasList = Array.from(this.aliases.entries())
                        .map(([name, command]) => `${name}='${command}'`)
                        .join('\n');
                    return {
                        success: true,
                        output: aliasList,
                        exitCode: 0
                    };
                }
                
                for (const arg of args) {
                    if (arg.includes('=')) {
                        const [name, command] = arg.split('=', 2);
                        this.aliases.set(name, command.replace(/^['"]|['"]$/g, ''));
                    }
                }
                
                return {
                    success: true,
                    output: '',
                    exitCode: 0
                };
            }
        };
    }

    // Simplified implementations for other builtins
    createPrintfBuiltin() {
        return {
            name: 'printf',
            description: 'Format and print data',
            execute: (args) => ({
                success: true,
                output: args.join(' '),
                exitCode: 0
            })
        };
    }

    createUnsetBuiltin() {
        return {
            name: 'unset',
            description: 'Unset variables',
            execute: (args) => {
                args.forEach(name => this.variables.delete(name));
                return { success: true, output: '', exitCode: 0 };
            }
        };
    }

    createExportBuiltin() {
        return {
            name: 'export',
            description: 'Export variables to environment',
            execute: (args) => {
                args.forEach(arg => {
                    if (arg.includes('=')) {
                        const [name, value] = arg.split('=', 2);
                        this.setVariable(name, value, true);
                    } else {
                        this.setVariable(`__EXPORTED_${arg}`, true);
                    }
                });
                return { success: true, output: '', exitCode: 0 };
            }
        };
    }

    createTestBuiltin() {
        return {
            name: 'test',
            description: 'Evaluate conditional expressions',
            execute: (args) => ({
                success: true,
                output: '',
                exitCode: Math.random() > 0.5 ? 0 : 1 // Simulate test result
            })
        };
    }

    createPushdBuiltin() {
        return {
            name: 'pushd',
            description: 'Push directory onto directory stack',
            execute: (args) => ({
                success: true,
                output: 'Directory pushed',
                exitCode: 0
            })
        };
    }

    createPopdBuiltin() {
        return {
            name: 'popd',
            description: 'Pop directory from directory stack',
            execute: (args) => ({
                success: true,
                output: 'Directory popped',
                exitCode: 0
            })
        };
    }

    createDirsBuiltin() {
        return {
            name: 'dirs',
            description: 'Display directory stack',
            execute: (args) => ({
                success: true,
                output: this.getVariable('PWD'),
                exitCode: 0
            })
        };
    }

    createUnaliasBuiltin() {
        return {
            name: 'unalias',
            description: 'Remove aliases',
            execute: (args) => {
                args.forEach(name => this.aliases.delete(name));
                return { success: true, output: '', exitCode: 0 };
            }
        };
    }

    createFgBuiltin() {
        return {
            name: 'fg',
            description: 'Bring job to foreground',
            execute: (args) => ({
                success: true,
                output: 'Job brought to foreground',
                exitCode: 0
            })
        };
    }

    createBgBuiltin() {
        return {
            name: 'bg',
            description: 'Put job in background',
            execute: (args) => ({
                success: true,
                output: 'Job put in background',
                exitCode: 0
            })
        };
    }

    createKillBuiltin() {
        return {
            name: 'kill',
            description: 'Send signal to process',
            execute: (args) => ({
                success: true,
                output: 'Signal sent',
                exitCode: 0
            })
        };
    }

    createExitBuiltin() {
        return {
            name: 'exit',
            description: 'Exit the shell',
            execute: (args) => ({
                success: true,
                output: 'Goodbye!',
                exitCode: parseInt(args[0]) || 0
            })
        };
    }

    createSourceBuiltin() {
        return {
            name: 'source',
            description: 'Execute commands from file',
            execute: (args) => ({
                success: true,
                output: 'File sourced',
                exitCode: 0
            })
        };
    }

    createExecBuiltin() {
        return {
            name: 'exec',
            description: 'Replace shell with command',
            execute: (args) => ({
                success: true,
                output: 'Command executed',
                exitCode: 0
            })
        };
    }
}

/**
 * Ion Parser - Handles parsing of Ion shell commands into AST
 */
class IonParser {
    constructor() {
        this.tokens = [];
        this.position = 0;
    }

    parse(command) {
        try {
            this.tokens = this.tokenize(command);
            this.position = 0;
            
            if (this.tokens.length === 0) {
                return {
                    valid: true,
                    type: 'empty',
                    command: null
                };
            }
            
            const ast = this.parseCommand();
            
            return {
                valid: true,
                type: 'command',
                ...ast
            };
            
        } catch (error) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }

    tokenize(command) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < command.length; i++) {
            const char = command[i];
            
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
            
            if (!inQuotes && ['|', '&', ';', '>', '<'].includes(char)) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push(char);
                continue;
            }
            
            current += char;
        }
        
        if (current) {
            tokens.push(current);
        }
        
        return tokens;
    }

    parseCommand() {
        const command = {
            name: this.tokens[this.position],
            args: [],
            redirections: [],
            pipeline: false,
            background: false
        };
        
        this.position++;
        
        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            
            if (token === '|') {
                command.pipeline = true;
                break;
            } else if (token === '&') {
                command.background = true;
                this.position++;
                break;
            } else if (token === '>') {
                this.position++;
                command.redirections.push({
                    type: 'stdout',
                    target: this.tokens[this.position]
                });
            } else if (token === '<') {
                this.position++;
                command.redirections.push({
                    type: 'stdin',
                    target: this.tokens[this.position]
                });
            } else {
                command.args.push(token);
            }
            
            this.position++;
        }
        
        return command;
    }
}

/**
 * Ion Executor - Handles execution of parsed commands
 */
class IonExecutor {
    execute(ast, ionCore) {
        if (ast.type === 'empty') {
            return {
                success: true,
                output: '',
                exitCode: 0
            };
        }
        
        const command = ast.name;
        const args = ast.args || [];
        
        // Check for alias
        if (ionCore.aliases.has(command)) {
            const aliasCommand = ionCore.aliases.get(command);
            return ionCore.executeCommand(aliasCommand + ' ' + args.join(' '));
        }
        
        // Check for builtin
        if (ionCore.builtins.has(command)) {
            const builtin = ionCore.builtins.get(command);
            return builtin.execute(args);
        }
        
        // External command simulation
        return this.executeExternal(command, args, ionCore);
    }

    executeExternal(command, args, ionCore) {
        // Simulate external command execution
        const commonCommands = {
            'ls': () => 'file1.txt  file2.txt  directory/',
            'ps': () => 'PID TTY          TIME CMD\n1234 pts/0    00:00:01 ion',
            'date': () => new Date().toString(),
            'whoami': () => ionCore.getVariable('USER'),
            'hostname': () => 'redox',
            'uptime': () => 'up 2:34, 1 user, load average: 0.1, 0.2, 0.3'
        };
        
        if (commonCommands[command]) {
            return {
                success: true,
                output: commonCommands[command](),
                exitCode: 0
            };
        }
        
        return {
            success: false,
            output: `ion: command not found: ${command}`,
            exitCode: 127
        };
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IonCoreModule;
}
