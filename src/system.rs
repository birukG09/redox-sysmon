use chrono::{DateTime, Local};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Process {
    pub pid: u32,
    pub name: String,
    pub user: String,
    pub cpu: f32,
    pub memory: String,
    pub status: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSystem {
    pub mount: String,
    pub fs_type: String,
    pub status: String,
    pub used: String,
    pub free: String,
    pub usage_percent: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Local>,
    pub level: String,
    pub source: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String,
    pub uptime: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub status: String,
    pub ip: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
}

#[derive(Debug, Clone)]
pub struct SystemState {
    pub boot_time: DateTime<Local>,
    pub uptime: std::time::Duration,
    pub cpu_usage: f32,
    pub memory_used: f32,
    pub memory_total: f32,
    pub memory_free: f32,
    pub swap_used: f32,
    pub swap_total: f32,
    pub load_average: [f32; 3],
    pub kernel_threads: u32,
    pub user_processes: u32,
    pub ipc_messages: u32,
    pub fs_reads: u32,
    pub fs_writes: u32,
    pub network_rx: u64,
    pub network_tx: u64,
    
    // System status
    pub kernel_status: HashMap<String, String>,
    pub subsystem_status: HashMap<String, String>,
    
    // Collections
    pub processes: Vec<Process>,
    pub filesystems: Vec<FileSystem>,
    pub logs: Vec<LogEntry>,
    pub services: Vec<ServiceStatus>,
    pub network_interfaces: Vec<NetworkInterface>,
    
    // Performance history
    pub cpu_history: Vec<f32>,
    pub memory_history: Vec<f32>,
    pub network_history: Vec<(u64, u64)>,
}

impl SystemState {
    pub fn new() -> Self {
        let boot_time = Local::now() - chrono::Duration::minutes(rand::thread_rng().gen_range(10..120));
        let mut kernel_status = HashMap::new();
        kernel_status.insert("Scheduler".to_string(), "ONLINE".to_string());
        kernel_status.insert("Memory Manager".to_string(), "ONLINE".to_string());
        kernel_status.insert("Syscall Layer".to_string(), "ONLINE".to_string());
        kernel_status.insert("Driver Framework".to_string(), "ONLINE".to_string());
        kernel_status.insert("Network Stack".to_string(), "OFFLINE".to_string());
        kernel_status.insert("Security Sandbox".to_string(), "ONLINE".to_string());
        kernel_status.insert("VFS Layer".to_string(), "ONLINE".to_string());
        kernel_status.insert("Process Manager".to_string(), "ONLINE".to_string());

        let mut subsystem_status = HashMap::new();
        subsystem_status.insert("Ion Shell".to_string(), "ONLINE".to_string());
        subsystem_status.insert("Package Manager".to_string(), "ONLINE".to_string());
        subsystem_status.insert("NetStack Daemon".to_string(), "OFFLINE".to_string());
        subsystem_status.insert("GUI Orbital".to_string(), "OFFLINE".to_string());
        subsystem_status.insert("Userland Services".to_string(), "ONLINE".to_string());
        subsystem_status.insert("Audio Daemon".to_string(), "ONLINE".to_string());
        subsystem_status.insert("Display Manager".to_string(), "OFFLINE".to_string());

        let processes = vec![
            Process {
                pid: 1,
                name: "init".to_string(),
                user: "root".to_string(),
                cpu: 0.1,
                memory: "12 MB".to_string(),
                status: "Running".to_string(),
                command: "/bin/init".to_string(),
            },
            Process {
                pid: 42,
                name: "ion".to_string(),
                user: "bura".to_string(),
                cpu: 1.2,
                memory: "45 MB".to_string(),
                status: "Running".to_string(),
                command: "/bin/ion".to_string(),
            },
            Process {
                pid: 56,
                name: "pkg".to_string(),
                user: "root".to_string(),
                cpu: 0.3,
                memory: "20 MB".to_string(),
                status: "Sleeping".to_string(),
                command: "/usr/bin/pkg daemon".to_string(),
            },
            Process {
                pid: 78,
                name: "editor".to_string(),
                user: "bura".to_string(),
                cpu: 2.1,
                memory: "73 MB".to_string(),
                status: "Running".to_string(),
                command: "/usr/bin/nano /home/bura/code.rs".to_string(),
            },
            Process {
                pid: 102,
                name: "driver:disk".to_string(),
                user: "root".to_string(),
                cpu: 0.1,
                memory: "8 MB".to_string(),
                status: "Running".to_string(),
                command: "[kernel driver]".to_string(),
            },
        ];

        let filesystems = vec![
            FileSystem {
                mount: "/".to_string(),
                fs_type: "RedoxFS".to_string(),
                status: "ONLINE".to_string(),
                used: "1.3 GB".to_string(),
                free: "3.7 GB".to_string(),
                usage_percent: 26,
            },
            FileSystem {
                mount: "/usr".to_string(),
                fs_type: "RedoxFS".to_string(),
                status: "ONLINE".to_string(),
                used: "2.1 GB".to_string(),
                free: "5.0 GB".to_string(),
                usage_percent: 30,
            },
            FileSystem {
                mount: "/tmp".to_string(),
                fs_type: "RamFS".to_string(),
                status: "ONLINE".to_string(),
                used: "45 MB".to_string(),
                free: "955 MB".to_string(),
                usage_percent: 4,
            },
            FileSystem {
                mount: "/mnt/net".to_string(),
                fs_type: "NetFS".to_string(),
                status: "OFFLINE".to_string(),
                used: "-".to_string(),
                free: "-".to_string(),
                usage_percent: 0,
            },
        ];

        let logs = vec![
            LogEntry {
                timestamp: Local::now() - chrono::Duration::minutes(5),
                level: "WARN".to_string(),
                source: "NetFS".to_string(),
                message: "NetFS not mounted – subsystem offline".to_string(),
            },
            LogEntry {
                timestamp: Local::now() - chrono::Duration::minutes(10),
                level: "INFO".to_string(),
                source: "Security".to_string(),
                message: "Memory sandbox initialized and active".to_string(),
            },
            LogEntry {
                timestamp: Local::now() - chrono::Duration::minutes(15),
                level: "INFO".to_string(),
                source: "TTY".to_string(),
                message: "User 'bura' logged in from tty0".to_string(),
            },
            LogEntry {
                timestamp: Local::now() - chrono::Duration::hours(1),
                level: "INFO".to_string(),
                source: "Kernel".to_string(),
                message: "Boot sequence completed successfully".to_string(),
            },
        ];

        let services = vec![
            ServiceStatus {
                name: "redoxd".to_string(),
                status: "RUNNING".to_string(),
                uptime: "2h 15m".to_string(),
                description: "Core system daemon".to_string(),
            },
            ServiceStatus {
                name: "audiod".to_string(),
                status: "RUNNING".to_string(),
                uptime: "2h 14m".to_string(),
                description: "Audio subsystem daemon".to_string(),
            },
            ServiceStatus {
                name: "netstack".to_string(),
                status: "STOPPED".to_string(),
                uptime: "-".to_string(),
                description: "Network stack service".to_string(),
            },
            ServiceStatus {
                name: "orbital".to_string(),
                status: "STOPPED".to_string(),
                uptime: "-".to_string(),
                description: "GUI display server".to_string(),
            },
        ];

        let network_interfaces = vec![
            NetworkInterface {
                name: "eth0".to_string(),
                status: "DOWN".to_string(),
                ip: "0.0.0.0".to_string(),
                rx_bytes: 0,
                tx_bytes: 0,
                rx_packets: 0,
                tx_packets: 0,
            },
            NetworkInterface {
                name: "lo".to_string(),
                status: "UP".to_string(),
                ip: "127.0.0.1".to_string(),
                rx_bytes: 1024,
                tx_bytes: 1024,
                rx_packets: 12,
                tx_packets: 12,
            },
        ];

        Self {
            boot_time,
            uptime: Local::now().signed_duration_since(boot_time).to_std().unwrap_or_default(),
            cpu_usage: 24.5,
            memory_used: 1.2,
            memory_total: 4.0,
            memory_free: 2.8,
            swap_used: 0.1,
            swap_total: 2.0,
            load_average: [0.85, 1.12, 0.93],
            kernel_threads: 142,
            user_processes: 56,
            ipc_messages: 984,
            fs_reads: 812,
            fs_writes: 203,
            network_rx: 1024,
            network_tx: 2048,
            kernel_status,
            subsystem_status,
            processes,
            filesystems,
            logs,
            services,
            network_interfaces,
            cpu_history: vec![20.0, 22.0, 24.5],
            memory_history: vec![1.0, 1.1, 1.2],
            network_history: vec![(800, 1200), (900, 1800), (1024, 2048)],
        }
    }

    pub fn update(&mut self) {
        let mut rng = rand::thread_rng();
        
        // Update CPU usage
        self.cpu_usage += rng.gen_range(-3.0..3.0);
        self.cpu_usage = self.cpu_usage.clamp(1.0, 95.0);
        
        // Update memory
        self.memory_used += rng.gen_range(-0.1..0.2);
        self.memory_used = self.memory_used.clamp(0.8, 3.8);
        self.memory_free = self.memory_total - self.memory_used;
        
        // Update I/O
        self.ipc_messages = (self.ipc_messages as i32 + rng.gen_range(-50..100)).max(500) as u32;
        self.fs_reads = (self.fs_reads as i32 + rng.gen_range(-30..50)).max(200) as u32;
        self.fs_writes = (self.fs_writes as i32 + rng.gen_range(-20..30)).max(50) as u32;
        
        // Update network
        self.network_rx += rng.gen_range(0..100);
        self.network_tx += rng.gen_range(0..200);
        
        // Update process CPU usage
        for process in &mut self.processes {
            process.cpu += rng.gen_range(-0.5..0.5);
            process.cpu = process.cpu.clamp(0.0, 10.0);
        }
        
        // Update uptime
        self.uptime = Local::now().signed_duration_since(self.boot_time).to_std().unwrap_or_default();
        
        // Update history
        self.cpu_history.push(self.cpu_usage);
        if self.cpu_history.len() > 60 {
            self.cpu_history.remove(0);
        }
        
        self.memory_history.push(self.memory_used);
        if self.memory_history.len() > 60 {
            self.memory_history.remove(0);
        }
        
        self.network_history.push((self.network_rx, self.network_tx));
        if self.network_history.len() > 60 {
            self.network_history.remove(0);
        }
    }

    pub fn refresh(&mut self) {
        // Force refresh - could reload from actual system
        self.update();
    }

    pub fn toggle_network(&mut self) {
        let new_status = if self.kernel_status.get("Network Stack") == Some(&"OFFLINE".to_string()) {
            "ONLINE"
        } else {
            "OFFLINE"
        };
        
        self.kernel_status.insert("Network Stack".to_string(), new_status.to_string());
        self.subsystem_status.insert("NetStack Daemon".to_string(), new_status.to_string());
        
        if new_status == "ONLINE" {
            for interface in &mut self.network_interfaces {
                if interface.name == "eth0" {
                    interface.status = "UP".to_string();
                    interface.ip = "192.168.1.100".to_string();
                }
            }
        } else {
            for interface in &mut self.network_interfaces {
                if interface.name == "eth0" {
                    interface.status = "DOWN".to_string();
                    interface.ip = "0.0.0.0".to_string();
                }
            }
        }
    }

    pub fn toggle_orbital(&mut self) {
        let new_status = if self.subsystem_status.get("GUI Orbital") == Some(&"OFFLINE".to_string()) {
            "ONLINE"
        } else {
            "OFFLINE"
        };
        
        self.subsystem_status.insert("GUI Orbital".to_string(), new_status.to_string());
        self.subsystem_status.insert("Display Manager".to_string(), new_status.to_string());
        
        for service in &mut self.services {
            if service.name == "orbital" {
                service.status = if new_status == "ONLINE" { "RUNNING" } else { "STOPPED" }.to_string();
                service.uptime = if new_status == "ONLINE" { "0m" } else { "-" }.to_string();
            }
        }
    }

    pub fn get_uptime_string(&self) -> String {
        let total_seconds = self.uptime.as_secs();
        let hours = total_seconds / 3600;
        let minutes = (total_seconds % 3600) / 60;
        let seconds = total_seconds % 60;
        format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
    }
}