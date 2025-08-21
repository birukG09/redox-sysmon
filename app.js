/**
 * WALIA-RX Console Subsystem - Main Application
 * Production-grade console subsystem for Redox OS
 */

class WaliaRXApp {
    constructor() {
        this.currentView = 'terminal';
        this.modules = {};
        this.metrics = {
            inputLatency: 2.1,
            memoryRss: 8.4,
            uptime: 0
        };
        
        this.initializeModules();
        this.setupEventListeners();
        this.startMetricsUpdater();
        this.renderArchitectureDiagram();
    }

    initializeModules() {
        // Initialize all WALIA-RX modules
        this.modules.telemetry = new TelemetryModule();
        this.modules.ttyPty = new TTYPtyModule();
        this.modules.cliCore = new CLICoreModule();
        this.modules.fsUtils = new FSUtilsModule();
        this.modules.termCore = new TermCoreModule();
        this.modules.ionCore = new IonCoreModule();

        // Connect modules
        this.modules.termCore.setTelemetry(this.modules.telemetry);
        this.modules.ionCore.setTelemetry(this.modules.telemetry);
        this.modules.fsUtils.setTelemetry(this.modules.telemetry);

        console.log('WALIA-RX modules initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Terminal input
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleTerminalCommand(e.target.value);
                    e.target.value = '';
                }
            });

            terminalInput.addEventListener('input', () => {
                this.updateInputLatency();
            });
        }

        // Terminal controls
        document.getElementById('clear-terminal')?.addEventListener('click', () => {
            this.clearTerminal();
        });

        document.getElementById('toggle-replay')?.addEventListener('click', () => {
            this.toggleReplay();
        });

        document.getElementById('export-session')?.addEventListener('click', () => {
            this.exportSession();
        });

        // Shell parser
        document.getElementById('parse-command')?.addEventListener('click', () => {
            this.parseShellCommand();
        });

        document.getElementById('validate-syntax')?.addEventListener('click', () => {
            this.validateSyntax();
        });

        // Filesystem tools
        document.querySelectorAll('.fs-tool').forEach(tool => {
            tool.addEventListener('click', (e) => {
                this.selectFsTool(e.target.closest('.fs-tool'));
            });
        });

        document.getElementById('execute-fs-command')?.addEventListener('click', () => {
            this.executeFsCommand();
        });

        document.getElementById('show-help')?.addEventListener('click', () => {
            this.showFsHelp();
        });

        // Log filtering
        document.getElementById('log-level')?.addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            }
        });

        this.currentView = viewName;
        this.modules.telemetry.logEvent('view_switch', { view: viewName });

        // Load view-specific content
        if (viewName === 'observability') {
            this.initializeObservabilityCharts();
        }
    }

    handleTerminalCommand(command) {
        const startTime = performance.now();
        
        if (!command.trim()) return;

        // Add command to terminal output
        this.addTerminalOutput(`user@redox:~$ ${command}`);

        // Process command through Ion shell
        const result = this.modules.ionCore.executeCommand(command);
        
        // Add result to terminal output
        this.addTerminalOutput(result.output);
        
        // Update metrics
        const latency = performance.now() - startTime;
        this.metrics.inputLatency = latency;
        
        // Log telemetry
        this.modules.telemetry.logEvent('command_executed', {
            command: command.split(' ')[0],
            latency: latency,
            success: result.success
        });

        this.updateTerminalStatus();
    }

    addTerminalOutput(text) {
        const output = document.getElementById('terminal-output');
        const line = document.createElement('div');
        line.textContent = text;
        output.appendChild(line);
        
        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
        
        // Update line count
        const lineCount = output.children.length;
        document.getElementById('line-count').textContent = lineCount;
        
        // Update scrollback size (rough estimate)
        const scrollbackSize = Math.round(output.textContent.length / 1024);
        document.getElementById('scrollback-size').textContent = `${scrollbackSize}KB`;
    }

    clearTerminal() {
        document.getElementById('terminal-output').innerHTML = '';
        this.updateTerminalStatus();
        this.modules.telemetry.logEvent('terminal_cleared');
    }

    toggleReplay() {
        const button = document.getElementById('toggle-replay');
        const icon = button.querySelector('i');
        
        if (icon.classList.contains('fa-play')) {
            // Start replay
            icon.className = 'fas fa-pause';
            button.innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.startReplay();
        } else {
            // Stop replay
            icon.className = 'fas fa-play';
            button.innerHTML = '<i class="fas fa-play"></i> Replay';
            this.stopReplay();
        }
    }

    startReplay() {
        // Simulate deterministic replay
        const commands = [
            'ls -la',
            'cd /tmp',
            'echo "Hello from WALIA-RX"',
            'ps aux',
            'df -h'
        ];
        
        let index = 0;
        this.replayInterval = setInterval(() => {
            if (index < commands.length) {
                this.handleTerminalCommand(commands[index]);
                index++;
            } else {
                this.toggleReplay(); // Stop when done
            }
        }, 1500);
    }

    stopReplay() {
        if (this.replayInterval) {
            clearInterval(this.replayInterval);
            this.replayInterval = null;
        }
    }

    exportSession() {
        const output = document.getElementById('terminal-output');
        const sessionData = {
            timestamp: new Date().toISOString(),
            version: '1.0.0-PRD',
            lines: Array.from(output.children).map(line => line.textContent),
            metrics: this.metrics
        };
        
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], 
                             { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `walia-rx-session-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.modules.telemetry.logEvent('session_exported');
    }

    parseShellCommand() {
        const input = document.getElementById('shell-input').value;
        const result = this.modules.ionCore.parseCommand(input);
        
        const output = document.getElementById('parser-output');
        output.innerHTML = `
            <div class="alert alert-info">
                <h6>Parse Result</h6>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
        `;
    }

    validateSyntax() {
        const input = document.getElementById('shell-input').value;
        const validation = this.modules.ionCore.validateSyntax(input);
        
        const output = document.getElementById('parser-output');
        const alertClass = validation.valid ? 'alert-success' : 'alert-danger';
        output.innerHTML = `
            <div class="alert ${alertClass}">
                <h6>Syntax Validation</h6>
                <p><strong>Valid:</strong> ${validation.valid}</p>
                ${validation.errors.length > 0 ? 
                  `<ul>${validation.errors.map(err => `<li>${err}</li>`).join('')}</ul>` : 
                  ''}
            </div>
        `;
    }

    selectFsTool(toolElement) {
        // Remove previous selection
        document.querySelectorAll('.fs-tool').forEach(tool => {
            tool.classList.remove('selected');
        });
        
        // Select current tool
        toolElement.classList.add('selected');
        
        const toolName = toolElement.getAttribute('data-tool');
        document.getElementById('selected-tool').textContent = toolName;
        
        // Update command input with tool
        const commandInput = document.getElementById('fs-command');
        commandInput.value = toolName + ' ';
        commandInput.focus();
    }

    executeFsCommand() {
        const command = document.getElementById('fs-command').value;
        const result = this.modules.fsUtils.executeCommand(command);
        
        const output = document.getElementById('fs-output');
        output.innerHTML = `<pre>${result.output}</pre>`;
        
        this.modules.telemetry.logEvent('fs_command_executed', {
            command: command.split(' ')[0],
            success: result.success
        });
    }

    showFsHelp() {
        const selectedTool = document.getElementById('selected-tool').textContent;
        if (selectedTool === 'None') {
            alert('Please select a filesystem tool first');
            return;
        }
        
        const help = this.modules.fsUtils.getHelp(selectedTool);
        const output = document.getElementById('fs-output');
        output.innerHTML = `<pre>${help}</pre>`;
    }

    updateInputLatency() {
        // Simulate input latency measurement
        const latency = 1.5 + Math.random() * 3; // 1.5-4.5ms
        this.metrics.inputLatency = Math.round(latency * 10) / 10;
        document.getElementById('input-latency').textContent = `${this.metrics.inputLatency}ms`;
    }

    updateTerminalStatus() {
        const lineCount = document.getElementById('terminal-output').children.length;
        document.getElementById('line-count').textContent = lineCount;
    }

    startMetricsUpdater() {
        setInterval(() => {
            // Update uptime
            this.metrics.uptime++;
            const hours = Math.floor(this.metrics.uptime / 3600);
            const minutes = Math.floor((this.metrics.uptime % 3600) / 60);
            const seconds = this.metrics.uptime % 60;
            const uptimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            document.getElementById('uptime').textContent = uptimeStr;
            
            // Update memory (simulate gradual increase)
            this.metrics.memoryRss += (Math.random() - 0.5) * 0.1;
            this.metrics.memoryRss = Math.max(8.0, Math.min(15.0, this.metrics.memoryRss));
            document.getElementById('memory-rss').textContent = `${this.metrics.memoryRss.toFixed(1)}MB`;
            
            // Update logs
            this.updateLogs();
        }, 1000);
    }

    initializeObservabilityCharts() {
        const ctx = document.getElementById('latency-chart');
        if (!ctx || ctx.chart) return; // Don't recreate if already exists
        
        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 20}, (_, i) => i * 100),
                datasets: [{
                    label: 'Input Latency (ms)',
                    data: Array.from({length: 20}, () => 2 + Math.random() * 2),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Update chart data periodically
        setInterval(() => {
            const chart = ctx.chart;
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(this.metrics.inputLatency);
            chart.update('none');
        }, 1000);
    }

    updateLogs() {
        const logOutput = document.getElementById('log-output');
        if (!logOutput) return;
        
        const logs = this.modules.telemetry.getRecentLogs(5);
        logOutput.innerHTML = logs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="log-timestamp">${log.timestamp}</span>
                <span class="log-level">${log.level}</span>
                ${log.message}
            </div>
        `).join('');
        
        // Auto-scroll to bottom
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    filterLogs(level) {
        const logEntries = document.querySelectorAll('.log-entry');
        logEntries.forEach(entry => {
            if (level === 'all' || entry.classList.contains(level)) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    renderArchitectureDiagram() {
        const svg = document.getElementById('architecture-svg');
        if (!svg) return;

        const modules = [
            { name: 'ion-core', x: 200, y: 100, width: 120, height: 60 },
            { name: 'term-core', x: 50, y: 200, width: 120, height: 60 },
            { name: 'fs-utils', x: 350, y: 200, width: 120, height: 60 },
            { name: 'fs-core', x: 500, y: 300, width: 120, height: 60 },
            { name: 'cli-core', x: 200, y: 300, width: 120, height: 60 },
            { name: 'tty-pty', x: 50, y: 400, width: 120, height: 60 },
            { name: 'telemetry', x: 650, y: 100, width: 120, height: 60 },
            { name: 'sdk-ffi', x: 500, y: 100, width: 120, height: 60 }
        ];

        // Clear existing content
        svg.innerHTML = '';

        // Draw module boxes
        modules.forEach(module => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('data-module', module.name);
            group.style.cursor = 'pointer';

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', module.x);
            rect.setAttribute('y', module.y);
            rect.setAttribute('width', module.width);
            rect.setAttribute('height', module.height);
            rect.setAttribute('class', 'module-box');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', module.x + module.width / 2);
            text.setAttribute('y', module.y + module.height / 2);
            text.setAttribute('class', 'module-text');
            text.textContent = module.name;

            group.appendChild(rect);
            group.appendChild(text);
            svg.appendChild(group);

            // Add click handler
            group.addEventListener('click', () => this.showModuleDetails(module.name));
        });

        // Draw interface connections
        const connections = [
            { from: 'ion-core', to: 'cli-core' },
            { from: 'term-core', to: 'tty-pty' },
            { from: 'fs-utils', to: 'fs-core' },
            { from: 'fs-utils', to: 'cli-core' },
            { from: 'telemetry', to: 'ion-core' },
            { from: 'telemetry', to: 'term-core' },
            { from: 'telemetry', to: 'fs-utils' }
        ];

        connections.forEach(conn => {
            const fromModule = modules.find(m => m.name === conn.from);
            const toModule = modules.find(m => m.name === conn.to);
            
            if (fromModule && toModule) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromModule.x + fromModule.width / 2);
                line.setAttribute('y1', fromModule.y + fromModule.height / 2);
                line.setAttribute('x2', toModule.x + toModule.width / 2);
                line.setAttribute('y2', toModule.y + toModule.height / 2);
                line.setAttribute('class', 'interface-line');
                svg.appendChild(line);
            }
        });
    }

    showModuleDetails(moduleName) {
        const moduleInfo = {
            'ion-core': {
                responsibilities: ['Parser/lexer', 'AST/exec engine', 'Builtins', 'Pipelines/Redirections', 'Job control'],
                interfaces: ['ion-cli', 'ion-plugins', 'telemetry']
            },
            'term-core': {
                responsibilities: ['VT emulation', 'Renderer', 'Input handling', 'Scrollback', 'Replay', 'Clipboard API'],
                interfaces: ['tty-pty', 'telemetry', 'ui-skins']
            },
            'fs-utils': {
                responsibilities: ['Unified CLI behaviors', 'Common I/O abstractions', 'Zero-copy paths', 'Error model'],
                interfaces: ['fs-core', 'cli-core', 'telemetry']
            },
            'cli-core': {
                responsibilities: ['Arg parsing', 'Formatting', 'Progress/pager', 'Color/style', 'Consistent exit codes'],
                interfaces: ['ion-core', 'fs-utils', 'term-core']
            },
            'telemetry': {
                responsibilities: ['Structured logging', 'Counters/gauges/histograms', 'Trace spans', 'Toggle policy'],
                interfaces: ['all modules']
            }
        };

        const info = moduleInfo[moduleName] || { responsibilities: [], interfaces: [] };
        
        document.getElementById('module-info').innerHTML = `
            <h6>${moduleName}</h6>
            <p><strong>Responsibilities:</strong></p>
            <ul>${info.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
            <p><strong>Interfaces:</strong></p>
            <ul>${info.interfaces.map(i => `<li>${i}</li>`).join('')}</ul>
        `;

        // Highlight selected module
        document.querySelectorAll('.module-box').forEach(box => {
            box.classList.remove('selected');
        });
        
        const selectedModule = document.querySelector(`[data-module="${moduleName}"] .module-box`);
        if (selectedModule) {
            selectedModule.classList.add('selected');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.waliaRX = new WaliaRXApp();
});
