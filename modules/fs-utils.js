/**
 * FS Utils Module - WALIA-RX Console Subsystem
 * Handles filesystem operations with unified CLI behaviors and consistent UX
 */

class FSUtilsModule {
    constructor() {
        this.tools = {
            ls: this.createLsTool(),
            cp: this.createCpTool(),
            mv: this.createMvTool(),
            rm: this.createRmTool(),
            mkdir: this.createMkdirTool(),
            rmdir: this.createRmdirTool(),
            cat: this.createCatTool(),
            head: this.createHeadTool(),
            tail: this.createTailTool(),
            find: this.createFindTool(),
            stat: this.createStatTool(),
            du: this.createDuTool(),
            df: this.createDfTool(),
            touch: this.createTouchTool(),
            ln: this.createLnTool()
        };
        
        this.fileSystem = this.createMockFileSystem();
        this.currentDirectory = '/';
        this.telemetry = null;
        
        console.log('FS Utils module initialized');
    }

    setTelemetry(telemetryModule) {
        this.telemetry = telemetryModule;
    }

    executeCommand(command) {
        const startTime = performance.now();
        
        try {
            const [toolName, ...args] = command.trim().split(/\s+/);
            const tool = this.tools[toolName];
            
            if (!tool) {
                return {
                    success: false,
                    exitCode: 127,
                    output: `Command not found: ${toolName}`,
                    error: `Unknown filesystem tool: ${toolName}`
                };
            }

            const result = tool.execute(args);
            const duration = performance.now() - startTime;
            
            if (this.telemetry) {
                this.telemetry.logEvent('fs_command_executed', {
                    tool: toolName,
                    args: args.length,
                    success: result.success,
                    duration
                });
            }
            
            return result;
            
        } catch (error) {
            const duration = performance.now() - startTime;
            
            if (this.telemetry) {
                this.telemetry.logEvent('fs_command_error', {
                    error: error.message,
                    duration
                });
            }
            
            return {
                success: false,
                exitCode: 1,
                output: `Error: ${error.message}`,
                error: error.message
            };
        }
    }

    getHelp(toolName) {
        const tool = this.tools[toolName];
        if (!tool) {
            return `Unknown tool: ${toolName}`;
        }
        return tool.help;
    }

    createMockFileSystem() {
        return {
            '/': {
                type: 'directory',
                created: new Date('2024-01-01'),
                modified: new Date(),
                permissions: 'rwxr-xr-x',
                owner: 'root',
                group: 'root',
                size: 4096,
                children: {
                    'home': {
                        type: 'directory',
                        created: new Date('2024-01-01'),
                        modified: new Date(),
                        permissions: 'rwxr-xr-x',
                        owner: 'root',
                        group: 'root',
                        size: 4096,
                        children: {
                            'user': {
                                type: 'directory',
                                created: new Date('2024-01-01'),
                                modified: new Date(),
                                permissions: 'rwxr-xr-x',
                                owner: 'user',
                                group: 'user',
                                size: 4096,
                                children: {
                                    'documents': {
                                        type: 'directory',
                                        created: new Date('2024-01-01'),
                                        modified: new Date(),
                                        permissions: 'rwxr-xr-x',
                                        owner: 'user',
                                        group: 'user',
                                        size: 4096,
                                        children: {
                                            'readme.txt': {
                                                type: 'file',
                                                content: 'Welcome to WALIA-RX Console Subsystem\nThis is a production-grade console for Redox OS.',
                                                created: new Date('2024-01-01'),
                                                modified: new Date(),
                                                permissions: 'rw-r--r--',
                                                owner: 'user',
                                                group: 'user',
                                                size: 85
                                            }
                                        }
                                    },
                                    'projects': {
                                        type: 'directory',
                                        created: new Date('2024-01-01'),
                                        modified: new Date(),
                                        permissions: 'rwxr-xr-x',
                                        owner: 'user',
                                        group: 'user',
                                        size: 4096,
                                        children: {}
                                    }
                                }
                            }
                        }
                    },
                    'tmp': {
                        type: 'directory',
                        created: new Date(),
                        modified: new Date(),
                        permissions: 'rwxrwxrwt',
                        owner: 'root',
                        group: 'root',
                        size: 4096,
                        children: {}
                    },
                    'etc': {
                        type: 'directory',
                        created: new Date('2024-01-01'),
                        modified: new Date(),
                        permissions: 'rwxr-xr-x',
                        owner: 'root',
                        group: 'root',
                        size: 4096,
                        children: {
                            'passwd': {
                                type: 'file',
                                content: 'root:x:0:0:root:/root:/bin/ion\nuser:x:1000:1000:user:/home/user:/bin/ion',
                                created: new Date('2024-01-01'),
                                modified: new Date(),
                                permissions: 'rw-r--r--',
                                owner: 'root',
                                group: 'root',
                                size: 77
                            }
                        }
                    },
                    'var': {
                        type: 'directory',
                        created: new Date('2024-01-01'),
                        modified: new Date(),
                        permissions: 'rwxr-xr-x',
                        owner: 'root',
                        group: 'root',
                        size: 4096,
                        children: {
                            'log': {
                                type: 'directory',
                                created: new Date('2024-01-01'),
                                modified: new Date(),
                                permissions: 'rwxr-xr-x',
                                owner: 'root',
                                group: 'root',
                                size: 4096,
                                children: {}
                            }
                        }
                    }
                }
            }
        };
    }

    // Utility methods for filesystem operations
    resolvePath(path) {
        if (path.startsWith('/')) {
            return path;
        }
        return this.currentDirectory === '/' ? 
            `/${path}` : 
            `${this.currentDirectory}/${path}`;
    }

    getFileSystemNode(path) {
        const resolved = this.resolvePath(path);
        const parts = resolved.split('/').filter(p => p);
        
        let current = this.fileSystem['/'];
        
        for (const part of parts) {
            if (!current.children || !current.children[part]) {
                return null;
            }
            current = current.children[part];
        }
        
        return current;
    }

    formatFileSize(bytes) {
        const units = ['B', 'K', 'M', 'G', 'T'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(unitIndex > 0 ? 1 : 0)}${units[unitIndex]}`;
    }

    formatPermissions(perms) {
        return perms;
    }

    formatDate(date) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    // Tool implementations
    createLsTool() {
        return {
            help: `ls - list directory contents

USAGE:
    ls [OPTION]... [FILE]...

OPTIONS:
    -l, --long      use a long listing format
    -a, --all       do not ignore entries starting with .
    -h, --human     with -l, print human readable sizes
    -R, --recursive list subdirectories recursively
    -t, --time      sort by time, newest first
    --help          display this help and exit

EXAMPLES:
    ls -la          # long format including hidden files
    ls -lh /etc     # human readable sizes for /etc`,

            execute: (args) => {
                const options = this.parseBasicOptions(args, ['l', 'a', 'h', 'R', 't']);
                const paths = options.positional.length > 0 ? options.positional : ['.'];
                
                let output = '';
                
                for (const path of paths) {
                    const node = this.getFileSystemNode(path);
                    
                    if (!node) {
                        return {
                            success: false,
                            exitCode: 2,
                            output: `ls: cannot access '${path}': No such file or directory`,
                            error: `File not found: ${path}`
                        };
                    }
                    
                    if (node.type === 'file') {
                        if (options.flags.l) {
                            output += `${node.permissions} 1 ${node.owner} ${node.group} `;
                            output += options.flags.h ? 
                                this.formatFileSize(node.size) : 
                                node.size.toString();
                            output += ` ${this.formatDate(node.modified)} ${path}\n`;
                        } else {
                            output += `${path}\n`;
                        }
                    } else {
                        const children = Object.keys(node.children || {});
                        
                        if (!options.flags.a) {
                            children.filter(name => !name.startsWith('.'));
                        }
                        
                        if (options.flags.t) {
                            children.sort((a, b) => {
                                const aNode = node.children[a];
                                const bNode = node.children[b];
                                return bNode.modified - aNode.modified;
                            });
                        } else {
                            children.sort();
                        }
                        
                        if (options.flags.l) {
                            for (const child of children) {
                                const childNode = node.children[child];
                                output += `${childNode.permissions} 1 ${childNode.owner} ${childNode.group} `;
                                output += options.flags.h ? 
                                    this.formatFileSize(childNode.size) : 
                                    childNode.size.toString();
                                output += ` ${this.formatDate(childNode.modified)} ${child}\n`;
                            }
                        } else {
                            output += children.join('  ') + '\n';
                        }
                    }
                }
                
                return {
                    success: true,
                    exitCode: 0,
                    output: output || ''
                };
            }
        };
    }

    createCatTool() {
        return {
            help: `cat - concatenate files and print on the standard output

USAGE:
    cat [OPTION]... [FILE]...

OPTIONS:
    -n, --number    number all output lines
    -b, --number-nonblank  number nonempty output lines, overrides -n
    -E, --show-ends display $ at end of each line
    -T, --show-tabs display TAB characters as ^I
    --help          display this help and exit

EXAMPLES:
    cat file.txt           # display file contents
    cat -n file.txt        # display with line numbers
    cat file1 file2        # concatenate multiple files`,

            execute: (args) => {
                const options = this.parseBasicOptions(args, ['n', 'b', 'E', 'T']);
                
                if (options.positional.length === 0) {
                    return {
                        success: false,
                        exitCode: 1,
                        output: 'cat: missing file operand',
                        error: 'No files specified'
                    };
                }
                
                let output = '';
                let lineNumber = 1;
                
                for (const path of options.positional) {
                    const node = this.getFileSystemNode(path);
                    
                    if (!node) {
                        return {
                            success: false,
                            exitCode: 2,
                            output: `cat: ${path}: No such file or directory`,
                            error: `File not found: ${path}`
                        };
                    }
                    
                    if (node.type !== 'file') {
                        return {
                            success: false,
                            exitCode: 1,
                            output: `cat: ${path}: Is a directory`,
                            error: `${path} is not a file`
                        };
                    }
                    
                    const lines = node.content.split('\n');
                    
                    for (const line of lines) {
                        let formattedLine = line;
                        
                        if (options.flags.T) {
                            formattedLine = formattedLine.replace(/\t/g, '^I');
                        }
                        
                        if (options.flags.E) {
                            formattedLine += '$';
                        }
                        
                        if (options.flags.n || (options.flags.b && line.trim())) {
                            formattedLine = `${lineNumber.toString().padStart(6)}  ${formattedLine}`;
                            lineNumber++;
                        }
                        
                        output += formattedLine + '\n';
                    }
                }
                
                return {
                    success: true,
                    exitCode: 0,
                    output
                };
            }
        };
    }

    createCpTool() {
        return {
            help: `cp - copy files or directories

USAGE:
    cp [OPTION]... SOURCE... DEST

OPTIONS:
    -r, --recursive copy directories recursively
    -f, --force     remove and retry if dest exists
    -i, --interactive  prompt before overwrite
    -v, --verbose   explain what is being done
    --help          display this help and exit

EXAMPLES:
    cp file1 file2         # copy file1 to file2
    cp -r dir1 dir2        # copy directory recursively
    cp file1 file2 dir/    # copy multiple files to directory`,

            execute: (args) => {
                const options = this.parseBasicOptions(args, ['r', 'f', 'i', 'v']);
                
                if (options.positional.length < 2) {
                    return {
                        success: false,
                        exitCode: 1,
                        output: 'cp: missing file operand',
                        error: 'Insufficient arguments'
                    };
                }
                
                // Simulate copy operation
                const sources = options.positional.slice(0, -1);
                const dest = options.positional[options.positional.length - 1];
                
                let output = '';
                
                for (const source of sources) {
                    const sourceNode = this.getFileSystemNode(source);
                    
                    if (!sourceNode) {
                        return {
                            success: false,
                            exitCode: 2,
                            output: `cp: cannot stat '${source}': No such file or directory`,
                            error: `Source not found: ${source}`
                        };
                    }
                    
                    if (options.flags.v) {
                        output += `'${source}' -> '${dest}'\n`;
                    }
                }
                
                if (output === '') {
                    output = `Copied ${sources.length} item(s) to ${dest}`;
                }
                
                return {
                    success: true,
                    exitCode: 0,
                    output
                };
            }
        };
    }

    createStatTool() {
        return {
            help: `stat - display file or file system status

USAGE:
    stat [OPTION]... FILE...

OPTIONS:
    -c, --format=FORMAT  use the specified FORMAT instead of the default
    -f, --file-system    display file system status instead of file status
    -L, --dereference    follow links
    --help               display this help and exit

EXAMPLES:
    stat file.txt          # show file statistics
    stat -f /              # show filesystem statistics`,

            execute: (args) => {
                const options = this.parseBasicOptions(args, ['f', 'L']);
                
                if (options.positional.length === 0) {
                    return {
                        success: false,
                        exitCode: 1,
                        output: 'stat: missing operand',
                        error: 'No files specified'
                    };
                }
                
                let output = '';
                
                for (const path of options.positional) {
                    const node = this.getFileSystemNode(path);
                    
                    if (!node) {
                        return {
                            success: false,
                            exitCode: 2,
                            output: `stat: cannot stat '${path}': No such file or directory`,
                            error: `File not found: ${path}`
                        };
                    }
                    
                    output += `  File: ${path}\n`;
                    output += `  Size: ${node.size}\t${node.type}\n`;
                    output += `Access: ${node.permissions}\n`;
                    output += `Access: ${this.formatDate(node.created)}\n`;
                    output += `Modify: ${this.formatDate(node.modified)}\n`;
                    output += `Change: ${this.formatDate(node.modified)}\n`;
                    output += '\n';
                }
                
                return {
                    success: true,
                    exitCode: 0,
                    output
                };
            }
        };
    }

    // Additional tool creators (simplified for brevity)
    createMvTool() {
        return {
            help: 'mv - move (rename) files',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Moved ${args.join(' ')}`
            })
        };
    }

    createRmTool() {
        return {
            help: 'rm - remove files and directories',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Removed ${args.join(' ')}`
            })
        };
    }

    createMkdirTool() {
        return {
            help: 'mkdir - make directories',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Created directories: ${args.join(' ')}`
            })
        };
    }

    createRmdirTool() {
        return {
            help: 'rmdir - remove empty directories',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Removed directories: ${args.join(' ')}`
            })
        };
    }

    createHeadTool() {
        return {
            help: 'head - output the first part of files',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: 'First 10 lines of file(s)'
            })
        };
    }

    createTailTool() {
        return {
            help: 'tail - output the last part of files',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: 'Last 10 lines of file(s)'
            })
        };
    }

    createFindTool() {
        return {
            help: 'find - search for files and directories',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: 'Search results for: ' + args.join(' ')
            })
        };
    }

    createDuTool() {
        return {
            help: 'du - estimate file space usage',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: '4.0K\t.\n8.0K\ttotal'
            })
        };
    }

    createDfTool() {
        return {
            help: 'df - display filesystem disk space usage',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: 'Filesystem      1K-blocks    Used Available Use% Mounted on\n/dev/root       1048576   524288    524288  50% /'
            })
        };
    }

    createTouchTool() {
        return {
            help: 'touch - change file timestamps',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Touched: ${args.join(' ')}`
            })
        };
    }

    createLnTool() {
        return {
            help: 'ln - make links between files',
            execute: (args) => ({
                success: true,
                exitCode: 0,
                output: `Created link: ${args.join(' -> ')}`
            })
        };
    }

    parseBasicOptions(args, validFlags) {
        const result = {
            flags: {},
            positional: []
        };
        
        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                const flags = arg.startsWith('--') ? 
                    [arg.substring(2)] : 
                    arg.substring(1).split('');
                
                for (const flag of flags) {
                    if (validFlags.includes(flag)) {
                        result.flags[flag] = true;
                    }
                }
            } else {
                result.positional.push(arg);
            }
        }
        
        return result;
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FSUtilsModule;
}
