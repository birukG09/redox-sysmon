use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use std::{
    io,
    time::{Duration, Instant},
};
use tui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    symbols,
    text::{Span, Spans},
    widgets::{
        Block, Borders, Cell, Clear, Gauge, List, ListItem, Paragraph, Row, Table, Tabs, Wrap,
    },
    Frame, Terminal,
};

mod system;
mod ui;
mod modules;
mod advanced_modules;

use system::SystemState;
use ui::{App, Tab};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app and run
    let app = App::new();
    let res = run_app(&mut terminal, app);

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    if let Err(err) = res {
        println!("{:?}", err)
    }

    Ok(())
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, mut app: App) -> io::Result<()> {
    let mut last_tick = Instant::now();
    let tick_rate = Duration::from_millis(250);

    loop {
        terminal.draw(|f| ui::draw(f, &mut app))?;

        let timeout = tick_rate
            .checked_sub(last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));

        if crossterm::event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    match key.code {
                        KeyCode::Char('q') => return Ok(()),
                        KeyCode::Char('1') => app.tabs.index = 0,
                        KeyCode::Char('2') => app.tabs.index = 1,
                        KeyCode::Char('3') => app.tabs.index = 2,
                        KeyCode::Char('4') => app.tabs.index = 3,
                        KeyCode::Char('5') => app.tabs.index = 4,
                        KeyCode::Char('6') => app.tabs.index = 5,
                        KeyCode::Char('7') => app.tabs.index = 6,
                        KeyCode::Char('8') => app.tabs.index = 7,
                        KeyCode::Char('9') => app.tabs.index = 8,
                        KeyCode::Char('0') => app.tabs.index = 9,
                        KeyCode::Tab => app.next_tab(),
                        KeyCode::BackTab => app.previous_tab(),
                        KeyCode::Right => app.next_tab(),
                        KeyCode::Left => app.previous_tab(),
                        KeyCode::Char('r') => app.system.refresh(),
                        KeyCode::Char('n') => app.system.toggle_network(),
                        KeyCode::Char('o') => app.system.toggle_orbital(),
                        KeyCode::Esc => return Ok(()),
                        _ => {}
                    }
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            app.on_tick();
            last_tick = Instant::now();
        }
    }
}