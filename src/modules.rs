// Advanced module functions for Redox OS Console Dashboard
use crate::system::SystemState;
use tui::{
    backend::Backend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Span, Spans},
    widgets::{
        Block, Borders, List, ListItem, Paragraph, Table, Row, Cell, Gauge, Wrap,
    },
    Frame,
};
use rand::Rng;

pub fn draw_kernel_monitor<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(8), Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // Kernel Metrics
    let kernel_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[0]);

    let mut rng = rand::thread_rng();
    let syscalls_per_sec = rng.gen_range(800..1200);
    let context_switches = rng.gen_range(400..800);
    let scheduler_queue_depth = rng.gen_range(2..8);

    let kernel_metrics = vec![
        format!("Syscalls/sec: {}", syscalls_per_sec),
        format!("Context Switches/sec: {}", context_switches),
        format!("Scheduler Queue Depth: {}", scheduler_queue_depth),
        format!("Kernel Panic Count: 0"),
        format!("Uptime: {}", system.get_uptime_string()),
    ];

    let kernel_items: Vec<ListItem> = kernel_metrics
        .iter()
        .map(|item| {
            ListItem::new(vec![Spans::from(Span::styled(
                item.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let kernel_list = List::new(kernel_items)
        .block(Block::default().borders(Borders::ALL).title("Kernel Metrics").style(Style::default().fg(Color::Green)));

    f.render_widget(kernel_list, kernel_chunks[0]);

    // Interactive Actions
    let actions = vec![
        "[k] View Kernel Panic Trace",
        "[s] Toggle Scheduler Visualizer", 
        "[d] Dump Kernel Debug Info",
        "[m] Monitor Memory Allocator",
        "[i] Inspect IPC Channels",
    ];

    let action_items: Vec<ListItem> = actions
        .iter()
        .map(|action| {
            ListItem::new(vec![Spans::from(Span::styled(
                *action,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let actions_list = List::new(action_items)
        .block(Block::default().borders(Borders::ALL).title("Kernel Actions").style(Style::default().fg(Color::Green)));

    f.render_widget(actions_list, kernel_chunks[1]);

    // Scheduler Visualization
    let scheduler_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(25); 4].as_ref())
        .split(chunks[1]);

    for i in 0..4 {
        let core_load = rng.gen_range(10..90) as f64 / 100.0;
        let gauge = Gauge::default()
            .block(Block::default().borders(Borders::ALL).title(format!("Core {}", i)).style(Style::default().fg(Color::Green)))
            .gauge_style(Style::default().fg(if core_load > 0.8 { Color::Red } else { Color::Green }))
            .ratio(core_load)
            .label(format!("{:.1}%", core_load * 100.0));

        f.render_widget(gauge, scheduler_chunks[i]);
    }

    // System Call Monitor
    let syscall_text = format!(
        "Recent System Calls:\n\n• sys_open: {}/s\n• sys_read: {}/s\n• sys_write: {}/s\n• sys_close: {}/s\n• sys_fork: {}/s\n• sys_exec: {}/s\n\nTotal syscalls: {} million\nAverage latency: 0.8μs",
        rng.gen_range(100..200),
        rng.gen_range(300..500),
        rng.gen_range(200..400),
        rng.gen_range(80..150),
        rng.gen_range(5..20),
        rng.gen_range(2..10),
        rng.gen_range(500..1000)
    );

    let syscall_para = Paragraph::new(syscall_text)
        .block(Block::default().borders(Borders::ALL).title("System Call Statistics").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(syscall_para, chunks[2]);
}

pub fn draw_filesystem_inspector<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // RedoxFS Metrics Table
    let header_cells = ["Mount", "Type", "Read Latency", "Write Latency", "Hash Status", "Snapshots"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let mut rng = rand::thread_rng();
    let rows = system.filesystems.iter().map(|fs| {
        let read_latency = format!("{:.2}ms", rng.gen_range(0.1..2.0));
        let write_latency = format!("{:.2}ms", rng.gen_range(0.5..3.0));
        let hash_status = if rng.gen_bool(0.9) { "VERIFIED" } else { "PENDING" };
        let snapshots = rng.gen_range(3..15);

        let cells = vec![
            Cell::from(fs.mount.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(fs.fs_type.clone()).style(Style::default().fg(Color::Green)),
            Cell::from(read_latency).style(Style::default().fg(Color::Green)),
            Cell::from(write_latency).style(Style::default().fg(Color::Green)),
            Cell::from(hash_status).style(Style::default().fg(
                if hash_status == "VERIFIED" { Color::Green } else { Color::Red }
            )),
            Cell::from(snapshots.to_string()).style(Style::default().fg(Color::Green)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("RedoxFS Inspector").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(12),
            Constraint::Length(10),
            Constraint::Length(12),
            Constraint::Length(13),
            Constraint::Length(12),
            Constraint::Length(10),
        ]);

    f.render_widget(table, chunks[0]);

    // FS Actions
    let fs_actions_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let actions = vec![
        "[c] Create Snapshot",
        "[r] Rollback to Snapshot",
        "[i] Run Integrity Scan",
        "[d] Defragment Filesystem",
        "[v] Verify Hash Trees",
    ];

    let action_items: Vec<ListItem> = actions
        .iter()
        .map(|action| {
            ListItem::new(vec![Spans::from(Span::styled(
                *action,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let actions_list = List::new(action_items)
        .block(Block::default().borders(Borders::ALL).title("FS Actions").style(Style::default().fg(Color::Green)));

    f.render_widget(actions_list, fs_actions_chunks[0]);

    // FS Performance
    let perf_metrics = vec![
        format!("Total I/O Operations: {}/s", system.fs_reads + system.fs_writes),
        format!("Cache Hit Ratio: {:.1}%", rng.gen_range(85.0..98.0)),
        format!("Free Space: {:.1} GB", rng.gen_range(10.0..50.0)),
        format!("Fragmentation: {:.1}%", rng.gen_range(5.0..25.0)),
        format!("Active Transactions: {}", rng.gen_range(0..10)),
    ];

    let perf_items: Vec<ListItem> = perf_metrics
        .iter()
        .map(|item| {
            ListItem::new(vec![Spans::from(Span::styled(
                item.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let perf_list = List::new(perf_items)
        .block(Block::default().borders(Borders::ALL).title("FS Performance").style(Style::default().fg(Color::Green)));

    f.render_widget(perf_list, fs_actions_chunks[1]);

    // Snapshot Manager
    let snapshot_text = format!(
        "Snapshot Management:\n\n• snapshot_001 (2025-08-20 14:30) - 2.1GB\n• snapshot_002 (2025-08-21 09:15) - 2.3GB\n• snapshot_003 (2025-08-21 13:45) - 2.4GB\n\nAuto-snapshots: ENABLED\nRetention policy: 30 days\nCompression: LZ4\n\nDisk usage by snapshots: {:.1}GB\nDeduplication ratio: {:.1}%",
        rng.gen_range(15.0..30.0),
        rng.gen_range(60.0..85.0)
    );

    let snapshot_para = Paragraph::new(snapshot_text)
        .block(Block::default().borders(Borders::ALL).title("Snapshot Manager").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(snapshot_para, chunks[2]);
}

pub fn draw_security_audit<B: Backend>(f: &mut Frame<B>, system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(12), Constraint::Min(0)].as_ref())
        .split(area);

    // Security Status Table
    let header_cells = ["Process", "PID", "Capabilities", "Sandbox", "Violations", "Risk Level"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let mut rng = rand::thread_rng();
    let security_data = vec![
        ("init", "1", "CAP_SYS_ADMIN", "DISABLED", "0", "LOW"),
        ("ion", "42", "CAP_NET_BIND", "ENABLED", "0", "LOW"),
        ("webserver", "156", "CAP_NET_BIND", "ENABLED", "2", "MEDIUM"),
        ("editor", "78", "CAP_DAC_OVERRIDE", "ENABLED", "0", "LOW"),
        ("unknown_proc", "234", "CAP_SYS_PTRACE", "DISABLED", "5", "HIGH"),
    ];

    let rows = security_data.iter().map(|(name, pid, caps, sandbox, violations, risk)| {
        let risk_color = match *risk {
            "LOW" => Color::Green,
            "MEDIUM" => Color::Red,
            "HIGH" => Color::Red,
            _ => Color::Green,
        };
        
        let cells = vec![
            Cell::from(*name).style(Style::default().fg(Color::Green)),
            Cell::from(*pid).style(Style::default().fg(Color::Green)),
            Cell::from(*caps).style(Style::default().fg(Color::Green)),
            Cell::from(*sandbox).style(Style::default().fg(
                if *sandbox == "ENABLED" { Color::Green } else { Color::Red }
            )),
            Cell::from(*violations).style(Style::default().fg(
                if *violations == "0" { Color::Green } else { Color::Red }
            )),
            Cell::from(*risk).style(Style::default().fg(risk_color).add_modifier(Modifier::BOLD)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Security Audit Dashboard").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(12),
            Constraint::Length(6),
            Constraint::Length(16),
            Constraint::Length(10),
            Constraint::Length(10),
            Constraint::Length(10),
        ]);

    f.render_widget(table, chunks[0]);

    // Security Actions and Alerts
    let security_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let security_actions = vec![
        "[a] View Audit Logs",
        "[r] Revoke Capability",
        "[s] Sandbox Process",
        "[k] Kill Suspicious Process",
        "[n] Notify Administrator",
        "[q] Quarantine Process",
    ];

    let action_items: Vec<ListItem> = security_actions
        .iter()
        .map(|action| {
            ListItem::new(vec![Spans::from(Span::styled(
                *action,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let actions_list = List::new(action_items)
        .block(Block::default().borders(Borders::ALL).title("Security Actions").style(Style::default().fg(Color::Green)));

    f.render_widget(actions_list, security_chunks[0]);

    let security_alerts = vec![
        "⚠ HIGH: Process 234 using suspicious syscalls",
        "⚠ MEDIUM: Webserver has 2 capability violations", 
        "✓ INFO: All critical processes sandboxed",
        "⚠ LOW: 3 processes without proper capabilities",
        "✓ INFO: No kernel privilege escalations detected",
        "⚠ MEDIUM: Unusual network activity detected",
    ];

    let alert_items: Vec<ListItem> = security_alerts
        .iter()
        .map(|alert| {
            let color = if alert.contains("HIGH") { Color::Red }
                       else if alert.contains("MEDIUM") { Color::Red } 
                       else { Color::Green };
            
            ListItem::new(vec![Spans::from(Span::styled(
                *alert,
                Style::default().fg(color),
            ))])
        })
        .collect();

    let alerts_list = List::new(alert_items)
        .block(Block::default().borders(Borders::ALL).title("Security Alerts").style(Style::default().fg(Color::Green)));

    f.render_widget(alerts_list, security_chunks[1]);
}