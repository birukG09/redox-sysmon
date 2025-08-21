use crate::system::SystemState;
use crate::{modules, advanced_modules};
use tui::{
    backend::Backend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Span, Spans},
    widgets::{
        Block, Borders, Cell, Gauge, List, ListItem, Paragraph, Row, Sparkline, Table,
        Tabs, Wrap,
    },
    Frame,
};

pub struct TabsState {
    pub titles: Vec<String>,
    pub index: usize,
}

impl TabsState {
    pub fn new(titles: Vec<String>) -> TabsState {
        TabsState { titles, index: 0 }
    }
    pub fn next(&mut self) {
        self.index = (self.index + 1) % self.titles.len();
    }

    pub fn previous(&mut self) {
        if self.index > 0 {
            self.index -= 1;
        } else {
            self.index = self.titles.len() - 1;
        }
    }
}

pub struct Tab {
    pub title: String,
    pub content: String,
}

pub struct App {
    pub tabs: TabsState,
    pub system: SystemState,
    pub enhanced_view: bool,
}

impl App {
    pub fn new() -> App {
        App {
            tabs: TabsState::new(vec![
                "Overview".to_string(),
                "Kernel".to_string(),
                "Filesystem".to_string(),
                "Processes".to_string(),
                "Network".to_string(),
                "Security".to_string(),
                "Packages".to_string(),
                "DevTools".to_string(),
                "Plugins".to_string(),
                "Config".to_string(),
            ]),
            system: SystemState::new(),
            enhanced_view: true,
        }
    }

    pub fn next_tab(&mut self) {
        self.tabs.next();
    }

    pub fn previous_tab(&mut self) {
        self.tabs.previous();
    }

    pub fn on_tick(&mut self) {
        self.system.update();
    }
}

pub fn draw<B: Backend>(f: &mut Frame<B>, app: &mut App) {
    let size = f.size();
    
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(12), // Header with ASCII art
            Constraint::Length(3),  // Tabs
            Constraint::Min(0),     // Content
            Constraint::Length(3),  // Footer
        ].as_ref())
        .split(size);

    draw_header(f, chunks[0]);
    draw_tabs(f, app, chunks[1]);
    draw_content(f, app, chunks[2]);
    draw_footer(f, chunks[3]);
}

fn draw_header<B: Backend>(f: &mut Frame<B>, area: Rect) {
    let ascii_art = vec![
        "    ██████╗ ███████╗██████╗  ██████╗ ██╗  ██╗    ██████╗ ███████╗",
        "    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝   ██╔═══██╗██╔════╝",
        "    ██████╔╝█████╗  ██║  ██║██║   ██║ ╚███╔╝    ██║   ██║███████╗",
        "    ██╔══██╗██╔══╝  ██║  ██║██║   ██║ ██╔██╗    ██║   ██║╚════██║",
        "    ██║  ██║███████╗██████╔╝╚██████╔╝██╔╝ ██╗   ╚██████╔╝███████║",
        "    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝    ╚═════╝ ╚══════╝",
        "    ╔═══════════════════════════════════════════════════════════╗",
        "    ║         Advanced Microkernel Subsystem Monitor         ║",
        "    ╚═══════════════════════════════════════════════════════════╝",
        "         Rust • Memory Safe • Concurrent • High Performance    ",
    ];

    let header = Paragraph::new(ascii_art.iter().enumerate().map(|(i, &line)| {
        let color = if i < 6 { Color::Green } else if i >= 6 && i < 9 { Color::Red } else { Color::Green };
        Spans::from(vec![
            Span::styled(line, Style::default().fg(color).add_modifier(Modifier::BOLD))
        ])
    }).collect::<Vec<_>>())
    .block(Block::default().borders(Borders::ALL)
        .title("Redox OS Console")
        .style(Style::default().fg(Color::Green)))
    .alignment(Alignment::Center);

    f.render_widget(header, area);
}

fn draw_tabs<B: Backend>(f: &mut Frame<B>, app: &App, area: Rect) {
    let titles = app
        .tabs
        .titles
        .iter()
        .map(|t| {
            let (first, rest) = t.split_at(1);
            Spans::from(vec![
                Span::styled(first, Style::default().fg(Color::Red)),
                Span::styled(rest, Style::default().fg(Color::Green)),
            ])
        })
        .collect();
        
    let tabs = Tabs::new(titles)
        .block(Block::default().borders(Borders::ALL).title("Navigation [1-9,0] or ←/→").style(Style::default().fg(Color::Green)))
        .select(app.tabs.index)
        .style(Style::default().fg(Color::Green))
        .highlight_style(
            Style::default()
                .add_modifier(Modifier::BOLD)
                .bg(Color::Black)
                .fg(Color::Red),
        );
    f.render_widget(tabs, area);
}

fn draw_content<B: Backend>(f: &mut Frame<B>, app: &mut App, area: Rect) {
    match app.tabs.index {
        0 => draw_overview(f, &app.system, area),
        1 => modules::draw_kernel_monitor(f, &app.system, area),
        2 => modules::draw_filesystem_inspector(f, &app.system, area),
        3 => draw_processes(f, &app.system, area),
        4 => draw_network(f, &app.system, area),
        5 => modules::draw_security_audit(f, &app.system, area),
        6 => advanced_modules::draw_package_manager(f, &app.system, area),
        7 => advanced_modules::draw_developer_tools(f, &app.system, area),
        8 => advanced_modules::draw_plugin_system(f, &app.system, area),
        9 => draw_config(f, &app.system, area),
        _ => {}
    }
}

fn draw_overview<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(8), Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // System info
    let system_info = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[0]);

    draw_system_status(f, system, system_info[0]);
    draw_resource_metrics(f, system, system_info[1]);

    // Subsystems
    let subsystem_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    draw_kernel_status(f, system, subsystem_chunks[0]);
    draw_subsystem_status(f, system, subsystem_chunks[1]);

    // Quick stats
    draw_quick_stats(f, system, chunks[2]);
}

fn draw_system_status<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let items = vec![
        format!("Boot Time: {}", system.boot_time.format("%Y-%m-%d %H:%M:%S")),
        format!("Uptime: {}", system.get_uptime_string()),
        format!("CPU Usage: {:.1}%", system.cpu_usage),
        format!("Memory: {:.1}/{:.1} GB ({:.0}%)", 
            system.memory_used, system.memory_total, 
            (system.memory_used / system.memory_total) * 100.0),
        format!("Load Avg: {:.2} {:.2} {:.2}", 
            system.load_average[0], system.load_average[1], system.load_average[2]),
    ];

    let list_items: Vec<ListItem> = items
        .iter()
        .map(|item| {
            ListItem::new(vec![Spans::from(Span::styled(
                item.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let list = List::new(list_items)
        .block(Block::default().borders(Borders::ALL).title("System Status").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green));

    f.render_widget(list, area);
}

fn draw_resource_metrics<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Length(3), Constraint::Min(0)].as_ref())
        .split(area);

    // CPU Gauge
    let cpu_gauge = Gauge::default()
        .block(Block::default().borders(Borders::ALL).title("CPU Usage").style(Style::default().fg(Color::Green)))
        .gauge_style(Style::default().fg(if system.cpu_usage > 80.0 { Color::Red } else { Color::Green }))
        .ratio((system.cpu_usage / 100.0) as f64)
        .label(format!("{:.1}%", system.cpu_usage));

    f.render_widget(cpu_gauge, chunks[0]);

    // Memory Gauge
    let memory_ratio = system.memory_used / system.memory_total;
    let memory_gauge = Gauge::default()
        .block(Block::default().borders(Borders::ALL).title("Memory").style(Style::default().fg(Color::Green)))
        .gauge_style(Style::default().fg(if memory_ratio > 0.9 { Color::Red } else { Color::Green }))
        .ratio(memory_ratio as f64)
        .label(format!("{:.1}/{:.1} GB", system.memory_used, system.memory_total));

    f.render_widget(memory_gauge, chunks[1]);

    // I/O Stats
    let io_info = vec![
        format!("IPC: {}/sec", system.ipc_messages),
        format!("FS Read: {}/sec", system.fs_reads),
        format!("FS Write: {}/sec", system.fs_writes),
        format!("Net RX: {} KB", system.network_rx / 1024),
        format!("Net TX: {} KB", system.network_tx / 1024),
    ];

    let io_items: Vec<ListItem> = io_info
        .iter()
        .map(|item| {
            ListItem::new(vec![Spans::from(Span::styled(
                item.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let io_list = List::new(io_items)
        .block(Block::default().borders(Borders::ALL).title("I/O Statistics").style(Style::default().fg(Color::Green)));

    f.render_widget(io_list, chunks[2]);
}

fn draw_kernel_status<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let items: Vec<ListItem> = system
        .kernel_status
        .iter()
        .map(|(name, status)| {
            let color = if status == "ONLINE" { Color::Green } else { Color::Red };
            ListItem::new(vec![Spans::from(vec![
                Span::styled(format!("{:<18}: ", name), Style::default().fg(Color::Green)),
                Span::styled(status.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD)),
            ])])
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Kernel Components"));

    f.render_widget(list, area);
}

fn draw_subsystem_status<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let items: Vec<ListItem> = system
        .subsystem_status
        .iter()
        .map(|(name, status)| {
            let color = if status == "ONLINE" { Color::Green } else { Color::Red };
            ListItem::new(vec![Spans::from(vec![
                Span::styled(format!("{:<18}: ", name), Style::default().fg(Color::Green)),
                Span::styled(status.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD)),
            ])])
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Subsystems [n=Network, o=Orbital]"));

    f.render_widget(list, area);
}

fn draw_quick_stats<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(33), Constraint::Percentage(33), Constraint::Percentage(34)].as_ref())
        .split(area);

    // Processes
    let process_text = format!(
        "Total Processes: {}\nKernel Threads: {}\nUser Processes: {}",
        system.processes.len(),
        system.kernel_threads,
        system.user_processes
    );

    let process_para = Paragraph::new(process_text)
        .block(Block::default().borders(Borders::ALL).title("Process Count"))
        .style(Style::default().fg(Color::Yellow));

    f.render_widget(process_para, chunks[0]);

    // Filesystems
    let online_fs = system.filesystems.iter().filter(|fs| fs.status == "ONLINE").count();
    let total_fs = system.filesystems.len();

    let fs_text = format!(
        "Mounted: {}/{}\nTotal Used: 3.5 GB\nTotal Free: 9.7 GB",
        online_fs, total_fs
    );

    let fs_para = Paragraph::new(fs_text)
        .block(Block::default().borders(Borders::ALL).title("Filesystem"))
        .style(Style::default().fg(Color::Magenta));

    f.render_widget(fs_para, chunks[1]);

    // Security
    let security_text = format!(
        "Sandbox: ACTIVE\nAudit Logs: 247\nFailed Logins: 0\nActive Sessions: 2"
    );

    let security_para = Paragraph::new(security_text)
        .block(Block::default().borders(Borders::ALL).title("Security"))
        .style(Style::default().fg(Color::Green));

    f.render_widget(security_para, chunks[2]);
}

fn draw_processes<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let header_cells = ["PID", "Name", "User", "Status", "CPU%", "Memory", "Command"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let rows = system.processes.iter().map(|process| {
        let cells = vec![
            Cell::from(process.pid.to_string()).style(Style::default().fg(Color::Green)),
            Cell::from(process.name.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(process.user.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(process.status.clone()).style(Style::default().fg(
                if process.status == "Running" { Color::Green } else { Color::Yellow }
            )),
            Cell::from(format!("{:.1}", process.cpu)).style(Style::default().fg(
                if process.cpu > 2.0 { Color::Red } else if process.cpu > 1.0 { Color::Yellow } else { Color::Green }
            )),
            Cell::from(process.memory.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(process.command.clone()).style(Style::default().fg(Color::Green)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Process Manager").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(6),
            Constraint::Length(15),
            Constraint::Length(8),
            Constraint::Length(10),
            Constraint::Length(6),
            Constraint::Length(8),
            Constraint::Min(20),
        ]);

    f.render_widget(table, area);
}

fn draw_filesystem<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)].as_ref())
        .split(area);

    // Filesystem table
    let header_cells = ["Mount", "Type", "Status", "Used", "Free", "Usage%"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let rows = system.filesystems.iter().map(|fs| {
        let cells = vec![
            Cell::from(fs.mount.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(fs.fs_type.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(fs.status.clone()).style(Style::default().fg(
                if fs.status == "ONLINE" { Color::Green } else { Color::Red }
            )),
            Cell::from(fs.used.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(fs.free.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(format!("{}%", fs.usage_percent)).style(Style::default().fg(
                if fs.usage_percent > 90 { Color::Red } 
                else if fs.usage_percent > 70 { Color::Yellow } 
                else { Color::Green }
            )),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Filesystem Manager").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(12),
            Constraint::Length(10),
            Constraint::Length(8),
            Constraint::Length(10),
            Constraint::Length(10),
            Constraint::Length(8),
        ]);

    f.render_widget(table, chunks[0]);

    // Filesystem usage bars
    let fs_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(25); 4].as_ref())
        .split(chunks[1]);

    for (i, fs) in system.filesystems.iter().enumerate() {
        if i < 4 {
            let usage_ratio = fs.usage_percent as f64 / 100.0;
            let gauge = Gauge::default()
                .block(Block::default().borders(Borders::ALL).title(fs.mount.clone()))
                .gauge_style(Style::default().fg(
                    if fs.usage_percent > 90 { Color::Red }
                    else if fs.usage_percent > 70 { Color::Yellow }
                    else { Color::Green }
                ))
                .ratio(usage_ratio)
                .label(format!("{}%", fs.usage_percent));

            f.render_widget(gauge, fs_chunks[i]);
        }
    }
}

fn draw_network<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // Network interfaces table
    let header_cells = ["Interface", "Status", "IP Address", "RX Bytes", "TX Bytes", "RX Packets", "TX Packets"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let rows = system.network_interfaces.iter().map(|interface| {
        let cells = vec![
            Cell::from(interface.name.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(interface.status.clone()).style(Style::default().fg(
                if interface.status == "UP" { Color::Green } else { Color::Red }
            )),
            Cell::from(interface.ip.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(format!("{}", interface.rx_bytes)).style(Style::default().fg(Color::Green)),
            Cell::from(format!("{}", interface.tx_bytes)).style(Style::default().fg(Color::Green)),
            Cell::from(format!("{}", interface.rx_packets)).style(Style::default().fg(Color::Green)),
            Cell::from(format!("{}", interface.tx_packets)).style(Style::default().fg(Color::Green)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Network Interfaces [n=Toggle Network]").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(12),
            Constraint::Length(8),
            Constraint::Length(15),
            Constraint::Length(10),
            Constraint::Length(10),
            Constraint::Length(12),
            Constraint::Length(12),
        ]);

    f.render_widget(table, chunks[0]);

    // Network statistics
    let net_stats_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let rx_text = format!(
        "Network Receive Statistics:\n\nTotal RX: {} KB\nPackets: {}\nErrors: 0\nDropped: 0",
        system.network_rx / 1024,
        system.network_interfaces.iter().map(|i| i.rx_packets).sum::<u64>()
    );

    let rx_para = Paragraph::new(rx_text)
        .block(Block::default().borders(Borders::ALL).title("RX Statistics").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(rx_para, net_stats_chunks[0]);

    let tx_text = format!(
        "Network Transmit Statistics:\n\nTotal TX: {} KB\nPackets: {}\nErrors: 0\nDropped: 0",
        system.network_tx / 1024,
        system.network_interfaces.iter().map(|i| i.tx_packets).sum::<u64>()
    );

    let tx_para = Paragraph::new(tx_text)
        .block(Block::default().borders(Borders::ALL).title("TX Statistics").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(tx_para, net_stats_chunks[1]);
}

fn draw_services<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let header_cells = ["Service", "Status", "Uptime", "Description"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let rows = system.services.iter().map(|service| {
        let cells = vec![
            Cell::from(service.name.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(service.status.clone()).style(Style::default().fg(
                if service.status == "RUNNING" { Color::Green } else { Color::Red }
            )),
            Cell::from(service.uptime.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(service.description.clone()).style(Style::default().fg(Color::Green)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Service Manager").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(15),
            Constraint::Length(10),
            Constraint::Length(10),
            Constraint::Min(30),
        ]);

    f.render_widget(table, area);
}

fn draw_logs<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let items: Vec<ListItem> = system
        .logs
        .iter()
        .rev()
        .map(|log| {
            let color = match log.level.as_str() {
                "ERROR" => Color::Red,
                "WARN" => Color::Yellow,
                "INFO" => Color::Green,
                "DEBUG" => Color::Gray,
                _ => Color::White,
            };

            ListItem::new(vec![Spans::from(vec![
                Span::styled(
                    format!("{} ", log.timestamp.format("%H:%M:%S")),
                    Style::default().fg(Color::Green),
                ),
                Span::styled(
                    format!("[{}] ", log.level),
                    Style::default().fg(color).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    format!("{}: ", log.source),
                    Style::default().fg(Color::Green),
                ),
                Span::styled(
                    log.message.clone(),
                    Style::default().fg(Color::Green),
                ),
            ])])
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("System Logs").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green));

    f.render_widget(list, area);
}

fn draw_performance<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(8), Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // CPU sparkline
    let cpu_data: Vec<u64> = system.cpu_history.iter().map(|&x| x as u64).collect();
    let cpu_sparkline = Sparkline::default()
        .block(Block::default().borders(Borders::ALL).title("CPU Usage History").style(Style::default().fg(Color::Green)))
        .data(&cpu_data)
        .style(Style::default().fg(Color::Red));

    f.render_widget(cpu_sparkline, chunks[0]);

    // Memory sparkline  
    let memory_data: Vec<u64> = system.memory_history.iter().map(|&x| (x * 100.0) as u64).collect();
    let memory_sparkline = Sparkline::default()
        .block(Block::default().borders(Borders::ALL).title("Memory Usage History").style(Style::default().fg(Color::Green)))
        .data(&memory_data)
        .style(Style::default().fg(Color::Red));

    f.render_widget(memory_sparkline, chunks[1]);

    // Performance stats
    let perf_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(33), Constraint::Percentage(33), Constraint::Percentage(34)].as_ref())
        .split(chunks[2]);

    let cpu_text = format!(
        "CPU Performance:\n\nCurrent: {:.1}%\nAverage: {:.1}%\nPeak: {:.1}%\nCores: 4\nThreads: 8",
        system.cpu_usage,
        system.cpu_history.iter().sum::<f32>() / system.cpu_history.len() as f32,
        system.cpu_history.iter().fold(0.0_f32, |a, &b| a.max(b))
    );

    let cpu_para = Paragraph::new(cpu_text)
        .block(Block::default().borders(Borders::ALL).title("CPU Stats").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green));

    f.render_widget(cpu_para, perf_chunks[0]);

    let memory_text = format!(
        "Memory Performance:\n\nUsed: {:.1} GB\nFree: {:.1} GB\nCached: 0.8 GB\nBuffers: 0.2 GB\nSwap: {:.1} GB",
        system.memory_used,
        system.memory_free,
        system.swap_used
    );

    let memory_para = Paragraph::new(memory_text)
        .block(Block::default().borders(Borders::ALL).title("Memory Stats").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green));

    f.render_widget(memory_para, perf_chunks[1]);

    let io_text = format!(
        "I/O Performance:\n\nIPC: {}/s\nDisk Read: {}/s\nDisk Write: {}/s\nNet RX: {} KB/s\nNet TX: {} KB/s",
        system.ipc_messages,
        system.fs_reads,
        system.fs_writes,
        system.network_rx / 1024,
        system.network_tx / 1024
    );

    let io_para = Paragraph::new(io_text)
        .block(Block::default().borders(Borders::ALL).title("I/O Stats").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green));

    f.render_widget(io_para, perf_chunks[2]);
}

fn draw_config<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let boot_time = format!("  • Boot Time: {}", system.boot_time.format("%Y-%m-%d %H:%M:%S"));
    let uptime = format!("  • System Uptime: {}", system.get_uptime_string());
    let cpu_usage = format!("  • CPU Usage: {:.1}%", system.cpu_usage);
    let memory_usage = format!("  • Memory Usage: {:.1}/{:.1} GB", system.memory_used, system.memory_total);

    let config_lines = vec![
        "████ Redox OS Advanced Console Configuration ████",
        "",
        "System Information:",
        &boot_time,
        &uptime,
        &cpu_usage,
        &memory_usage,
        "",
        "Kernel Configuration:",
        "  • Memory Protection: ENABLED",
        "  • Address Sanitizer: ENABLED", 
        "  • Debug Symbols: ENABLED",
        "  • Optimization Level: -O2",
        "",
        "Runtime Configuration:",
        "  • Max Processes: 1024",
        "  • Max File Descriptors: 4096",
        "  • Stack Size: 8MB",
        "  • Heap Size: Unlimited",
        "",
        "Security Configuration:",
        "  • Sandbox: ENABLED",
        "  • ASLR: ENABLED",
        "  • DEP/NX: ENABLED",
        "  • Stack Canaries: ENABLED",
        "",
        "Network Configuration:",
        "  • IPv4: ENABLED",
        "  • IPv6: DISABLED",
        "  • TCP Window: 64KB",
        "  • Max Connections: 1000",
        "",
        "Controls:",
        "  [r] Refresh System  [n] Toggle Network  [o] Toggle Orbital",
        "  [q] Quit Console    [ESC] Exit          [Tab] Next Tab",
    ];

    let items: Vec<ListItem> = config_lines
        .iter()
        .map(|&line| {
            let style = if line.starts_with("████") {
                Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)
            } else if line.ends_with(":") && !line.starts_with("  ") {
                Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)
            } else if line.starts_with("  •") {
                Style::default().fg(Color::Green)
            } else if line.starts_with("  [") {
                Style::default().fg(Color::Red)
            } else {
                Style::default().fg(Color::Green)
            };

            ListItem::new(vec![Spans::from(Span::styled(line, style))])
        })
        .collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("System Configuration & Controls").style(Style::default().fg(Color::Green)));

    f.render_widget(list, area);
}

fn draw_footer<B: Backend>(f: &mut Frame<B>, area: Rect) {
    let footer_text = vec![
        Spans::from(vec![
            Span::styled("Redox OS Console v2.0", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
            Span::styled(" | ", Style::default().fg(Color::Green)),
            Span::styled("Built with Rust", Style::default().fg(Color::Green)),
            Span::styled(" | ", Style::default().fg(Color::Green)),
            Span::styled("Memory Safe • Concurrent • Fast", Style::default().fg(Color::Red)),
        ])
    ];

    let footer = Paragraph::new(footer_text)
        .block(Block::default().borders(Borders::ALL).style(Style::default().fg(Color::Green)))
        .alignment(Alignment::Center);

    f.render_widget(footer, area);
}