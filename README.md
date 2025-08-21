# Redox Sysmon
is a production-grade console subsystem for Redox OS, designed for systems engineers and power users. It provides:

Advanced terminal emulation and shell capabilities

Real-time observability and resource metrics

Modular, reliable subsystem management

Integration with Redox OS microkernel via standard PTY/TTY

🖥️ Dashboard Overview
Kernel Status
Component	Status
Boot Time	2925:08-21 14:20:11
Scheduler	ONLINE
Memory Manager	ONLINE
Syscall Layer	ONLINE
Driver Framework	ONLINE
Network Stack	OFFLINE
Security Sandbox	ONLINE
Resource Metrics
Metric	Value
CPU Usage	23.7%
Kernel Threads	142
User Processes	56
Memory Allocated	1.2 GB
IPC Messages	984/sec
FS Reads/sec	812
FS Writes/sec	203
Filesystem & Storage
Mount	Type	Status	Used	Free
/	RedoxFS	ONLINE	1.3 GB	3.7 GB
/usr	RedoxFS	ONLINE	2.1 GB	5.0 GB
/tmp	RamFS	ONLINE	45 MB	955 MB
/mnt/net	NetFS	OFFLINE	-	-
Subsystems
Subsystem	Status
Ion Shell	ONLINE
PkgMgr (pkg)	ONLINE
NetStack Daemon	OFFLINE
GUI Orbital	OFFLINE
Userland Services	ONLINE
Process Table Snapshot
PID	Name	User	CPU%	Mem
1	init	root	0.2	12 MB
42	ion	bura	1.3	45 MB
56	pkg	root	0.5	20 MB
78	editor	bura	2.1	73 MB
102	driver:disk	root	0.1	8 MB
Security & Logs

[WARN] NetFS not mounted – subsystem offline.

[OK] Memory sandbox active.

[INFO] Last login from tty0 – user bura

Control Menu

Process Manager – Inspect & kill processes

Filesystem – Mount, unmount, and check disk health

Networking – Start/stop NetStack, monitor connections

Security – Sandbox status, audit logs, user management

Subsystems – Toggle Ion, GUI Orbital, Daemons

⚡ Features

Modular frontend and backend design

Real-time telemetry, logging, and observability

VT100/ANSI terminal emulation with scrollback and clipboard

Ion shell integration for full command execution

Resource-efficient with low-overhead operations

Fully configurable per module with runtime options

📂 Getting Started

Clone the repository:

git clone https://github.com/birukG09/Redox Sysmon.git
cd walia-rx


Install Rust and Cargo:
https://www.rust-lang.org/tools/install

Build the project:

cargo build --release


Run WALIA-RX:

cargo run

📝 Contributing

Fork the repository

Create a branch for your feature/bugfix

Submit a pull request with a clear description

📄 License

Distributed under MIT License. See LICENSE for details.

