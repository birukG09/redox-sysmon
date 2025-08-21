// Additional advanced modules for Redox OS Console Dashboard
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

pub fn draw_package_manager<B: Backend>(f: &mut Frame<B>, _system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(12), Constraint::Min(0)].as_ref())
        .split(area);

    // Package Status Table
    let header_cells = ["Package", "Version", "Status", "Size", "Dependencies", "Update Available"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let packages_data = vec![
        ("redox-kernel", "0.8.5", "INSTALLED", "12.3MB", "3", "0.8.6"),
        ("ion-shell", "1.0.5", "INSTALLED", "2.1MB", "5", "-"),
        ("netstack", "0.3.2", "INSTALLED", "8.7MB", "12", "0.3.3"),
        ("orbital", "0.5.1", "INSTALLED", "15.2MB", "8", "-"),
        ("pkg-manager", "0.4.8", "INSTALLED", "1.8MB", "2", "0.4.9"),
        ("rust-std", "1.75.0", "INSTALLED", "45.1MB", "0", "1.76.0"),
    ];

    let rows = packages_data.iter().map(|(name, version, status, size, deps, update)| {
        let status_color = if *status == "INSTALLED" { Color::Green } else { Color::Red };
        let update_color = if *update == "-" { Color::Green } else { Color::Red };
        
        let cells = vec![
            Cell::from(*name).style(Style::default().fg(Color::Green)),
            Cell::from(*version).style(Style::default().fg(Color::Green)),
            Cell::from(*status).style(Style::default().fg(status_color)),
            Cell::from(*size).style(Style::default().fg(Color::Green)),
            Cell::from(*deps).style(Style::default().fg(Color::Green)),
            Cell::from(*update).style(Style::default().fg(update_color)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Package Manager (pkg)").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(15),
            Constraint::Length(8),
            Constraint::Length(10),
            Constraint::Length(8),
            Constraint::Length(12),
            Constraint::Length(15),
        ]);

    f.render_widget(table, chunks[0]);

    // Package Actions and Repository Status
    let package_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let package_actions = vec![
        "[i] Install Package",
        "[u] Update Package",
        "[r] Remove Package", 
        "[s] Search Packages",
        "[l] List All Packages",
        "[c] Clean Cache",
        "[d] Show Dependencies",
    ];

    let action_items: Vec<ListItem> = package_actions
        .iter()
        .map(|action| {
            ListItem::new(vec![Spans::from(Span::styled(
                *action,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let actions_list = List::new(action_items)
        .block(Block::default().borders(Borders::ALL).title("Package Actions").style(Style::default().fg(Color::Green)));

    f.render_widget(actions_list, package_chunks[0]);

    let mut rng = rand::thread_rng();
    let repo_text = format!(
        "Repository Status:\n\n• Official Repo: ONLINE\n• Community Repo: ONLINE\n• Local Cache: VALID\n\nTotal Packages: {}\nInstalled: {}\nUpdates Available: 3\nCache Size: {:.1} MB\n\nLast Update: 2025-08-21 10:30\nNext Check: Auto (6h)",
        rng.gen_range(850..1200),
        packages_data.len(),
        rng.gen_range(45.0..85.0)
    );

    let repo_para = Paragraph::new(repo_text)
        .block(Block::default().borders(Borders::ALL).title("Repository Status").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(repo_para, package_chunks[1]);
}

pub fn draw_developer_tools<B: Backend>(f: &mut Frame<B>, _system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(8), Constraint::Length(8), Constraint::Min(0)].as_ref())
        .split(area);

    // Development Tools
    let dev_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[0]);

    let dev_tools = vec![
        "[g] Attach GDB Debugger",
        "[r] Run Unit Tests",
        "[b] Build Project",
        "[t] Run Integration Tests",
        "[p] Profile Performance",
        "[h] Hot Reload Plugin",
    ];

    let tool_items: Vec<ListItem> = dev_tools
        .iter()
        .map(|tool| {
            ListItem::new(vec![Spans::from(Span::styled(
                *tool,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let tools_list = List::new(tool_items)
        .block(Block::default().borders(Borders::ALL).title("Development Tools").style(Style::default().fg(Color::Green)));

    f.render_widget(tools_list, dev_chunks[0]);

    let mut rng = rand::thread_rng();
    let debug_sessions = vec![
        format!("GDB Session #1 - PID {} (ion)", rng.gen_range(100..999)),
        format!("LLDB Session #2 - PID {} (editor)", rng.gen_range(100..999)),
        "Valgrind - Memory analysis running".to_string(),
        "Perf profiler - CPU sampling active".to_string(),
    ];

    let debug_items: Vec<ListItem> = debug_sessions
        .iter()
        .map(|session| {
            ListItem::new(vec![Spans::from(Span::styled(
                session.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let debug_list = List::new(debug_items)
        .block(Block::default().borders(Borders::ALL).title("Active Debug Sessions").style(Style::default().fg(Color::Green)));

    f.render_widget(debug_list, dev_chunks[1]);

    // Test Results
    let test_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let test_results = vec![
        "✓ kernel/scheduler: 24/24 passed",
        "✓ fs/redoxfs: 18/18 passed",
        "✗ network/tcp: 12/15 passed (3 failed)",
        "✓ drivers/audio: 8/8 passed", 
        "⚠ memory/alloc: 5/6 passed (1 timeout)",
    ];

    let test_items: Vec<ListItem> = test_results
        .iter()
        .map(|result| {
            let color = if result.contains("✓") { Color::Green } 
                       else if result.contains("✗") { Color::Red }
                       else { Color::Red };
            
            ListItem::new(vec![Spans::from(Span::styled(
                *result,
                Style::default().fg(color),
            ))])
        })
        .collect();

    let test_list = List::new(test_items)
        .block(Block::default().borders(Borders::ALL).title("Test Results").style(Style::default().fg(Color::Green)));

    f.render_widget(test_list, test_chunks[0]);

    let build_info = vec![
        format!("Build Status: SUCCESS"),
        format!("Build Time: {:.1}s", rng.gen_range(15.0..45.0)),
        format!("Warnings: {}", rng.gen_range(2..12)),
        format!("Binary Size: {:.1} MB", rng.gen_range(8.0..25.0)),
        format!("Debug Symbols: ENABLED"),
    ];

    let build_items: Vec<ListItem> = build_info
        .iter()
        .map(|info| {
            ListItem::new(vec![Spans::from(Span::styled(
                info.clone(),
                Style::default().fg(Color::Green),
            ))])
        })
        .collect();

    let build_list = List::new(build_items)
        .block(Block::default().borders(Borders::ALL).title("Build Information").style(Style::default().fg(Color::Green)));

    f.render_widget(build_list, test_chunks[1]);

    // Code Analysis
    let analysis_text = format!(
        "Code Analysis Dashboard:\n\n🔧 Static Analysis:\n• Clippy warnings: {}\n• Unsafe blocks: {}\n• TODO comments: {}\n• Code coverage: {:.1}%\n\n🚀 Performance:\n• Hot paths identified: {}\n• Memory leaks: 0\n• Deadlock potential: LOW\n\n📊 Metrics:\n• Lines of code: {}\n• Cyclomatic complexity: {:.1}\n• Technical debt: {:.1}h",
        rng.gen_range(5..25),
        rng.gen_range(2..8),
        rng.gen_range(15..45),
        rng.gen_range(75.0..95.0),
        rng.gen_range(3..12),
        rng.gen_range(25000..85000),
        rng.gen_range(2.1..5.8),
        rng.gen_range(8.0..24.0)
    );

    let analysis_para = Paragraph::new(analysis_text)
        .block(Block::default().borders(Borders::ALL).title("Code Analysis").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(analysis_para, chunks[2]);
}

pub fn draw_plugin_system<B: Backend>(f: &mut Frame<B>, _system: &SystemState, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)].as_ref())
        .split(area);

    // Plugin Status Table
    let header_cells = ["Plugin", "Version", "Status", "Type", "Memory", "Hooks"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let plugins_data = vec![
        ("metrics-exporter", "1.2.0", "ACTIVE", "Native", "2.1MB", "4"),
        ("wasm-runner", "0.8.5", "ACTIVE", "WASM", "1.8MB", "2"),
        ("log-aggregator", "2.1.1", "ACTIVE", "Native", "3.2MB", "6"),
        ("network-monitor", "1.0.3", "PAUSED", "WASM", "0.9MB", "3"),
        ("custom-dashboard", "0.5.2", "ACTIVE", "JSON", "0.5MB", "1"),
    ];

    let rows = plugins_data.iter().map(|(name, version, status, ptype, memory, hooks)| {
        let status_color = match *status {
            "ACTIVE" => Color::Green,
            "PAUSED" => Color::Red,
            _ => Color::Red,
        };
        
        let cells = vec![
            Cell::from(*name).style(Style::default().fg(Color::Green)),
            Cell::from(*version).style(Style::default().fg(Color::Green)),
            Cell::from(*status).style(Style::default().fg(status_color)),
            Cell::from(*ptype).style(Style::default().fg(Color::Green)),
            Cell::from(*memory).style(Style::default().fg(Color::Green)),
            Cell::from(*hooks).style(Style::default().fg(Color::Green)),
        ];
        Row::new(cells).height(1)
    });

    let table = Table::new(rows)
        .header(header)
        .block(Block::default().borders(Borders::ALL).title("Plugin System Manager").style(Style::default().fg(Color::Green)))
        .widths(&[
            Constraint::Length(18),
            Constraint::Length(8),
            Constraint::Length(8),
            Constraint::Length(8),
            Constraint::Length(8),
            Constraint::Length(6),
        ]);

    f.render_widget(table, chunks[0]);

    // Plugin Management and Registry
    let plugin_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
        .split(chunks[1]);

    let plugin_actions = vec![
        "[l] Load Plugin",
        "[u] Unload Plugin",
        "[r] Reload Plugin", 
        "[c] Configure Plugin",
        "[e] Enable/Disable Plugin",
        "[d] Debug Plugin",
        "[i] Install from Registry",
    ];

    let action_items: Vec<ListItem> = plugin_actions
        .iter()
        .map(|action| {
            ListItem::new(vec![Spans::from(Span::styled(
                *action,
                Style::default().fg(Color::Red),
            ))])
        })
        .collect();

    let actions_list = List::new(action_items)
        .block(Block::default().borders(Borders::ALL).title("Plugin Actions").style(Style::default().fg(Color::Green)));

    f.render_widget(actions_list, plugin_chunks[0]);

    let mut rng = rand::thread_rng();
    let registry_text = format!(
        "Plugin Registry & System:\n\n📦 Registry Status:\n• Official plugins: {}\n• Community plugins: {}\n• Local plugins: {}\n\n🔧 System Features:\n• Hot reloading: ENABLED\n• Sandboxing: ENABLED\n• WASM support: ENABLED\n• JSON configs: ENABLED\n\n📊 Resource Usage:\n• Total memory: {:.1} MB\n• CPU overhead: {:.1}%\n• Active hooks: {}\n\n🚀 Experimental:\n• Quantum scheduler plugin\n• IPC graph visualizer\n• Syscall replay engine",
        rng.gen_range(15..35),
        rng.gen_range(45..85),
        plugins_data.len(),
        rng.gen_range(8.0..16.0),
        rng.gen_range(2.0..8.0),
        plugins_data.iter().map(|p| p.5.parse::<i32>().unwrap_or(0)).sum::<i32>()
    );

    let registry_para = Paragraph::new(registry_text)
        .block(Block::default().borders(Borders::ALL).title("Plugin Registry").style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::Green))
        .wrap(Wrap { trim: true });

    f.render_widget(registry_para, plugin_chunks[1]);
}