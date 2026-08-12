# Changelog

All notable changes to the Plate Lifecycle Monitoring System (PLMSys) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.1.0] - 2026-08-12

### NEW
- **Multi-PC Local Network Collaboration**: Added LAN mode enabling multiple computers to run PLMSys simultaneously against a shared dataset on a common network share (`\\SERVER\PLMSysData\` or `Z:\PLMSysData\`).
- **Real-Time Synchronisation**: Implemented event-driven change broadcasting to propagate production and plate changes across connected PCs instantly without requiring application restarts.
- **Revision Control & Conflict Protection**: Added database revision sequencing and conflict detection to prevent silent overwrites and race conditions during concurrent writes.
- **Network Status Bar Indicator**: Integrated live visual status indicators (`● Connected`, `● Synchronizing`, `● Offline`, `● Reconnecting`, `● Conflict`, `● Version Mismatch`).
- **Automatic Application Auto-Updater**: Built a full application update system supporting Windows Portable and Linux AppImage packages.
- **Real Progress Update UI**: Implemented update UI displaying actual download percentage, byte progress, and progress stage indicators.
- **Pre-Update Verified Safety Backup**: Automatic verification and creation of database safety backups prior to applying updates.
- **First-Start Post-Update Release Notes**: Interactive post-update welcome screen displaying release highlights upon first launch after updating.

### IMPROVED
- **Safe Transaction Engine**: Atomic double-buffered database writes with verified temp files and automatic rollback on failure.
- **Startup Performance**: Parallelized database load operations for faster app initialization.
- **Theme-Matched Scrollbar**: Custom industrial dark scrollbar styling across WebKit and Firefox browsers.
- **Text Wrapping**: Global CSS overflow protection preventing long remarks and audit logs from clipping.

### FIXED
- **Daily Production Calendar Reset**: Corrected cycle resetting logic so today's production resets to 0 when transitioning to a new calendar day.
- **Title Standardization**: Standardized application title to "Plate Lifecycle Monitoring System" across all navigation and window titles.

### SECURITY
- **Maintained Context Isolation**: Sandboxed Electron IPC architecture with `contextIsolation: true` and `nodeIntegration: false`.
- **Local Network Binding**: LAN synchronization service restricted strictly to local subnet interfaces without internet exposure.

### PERFORMANCE
- **Incremental Diff Propagation**: Real-time sync transmits target record updates rather than re-downloading entire databases.

### BREAKING CHANGES
- None. Full backward compatibility maintained for existing `data/` local database files and backups.

---

## [v1.0.0] - 2026-08-01

### NEW
- **Initial Industrial Production Release**: Core Plate Lifecycle Monitoring System (PLMSys).
- **Set & Position Lifecycle Tracking**: Multi-set management with 11 positions per set and automated cycle logging.
- **Plate Installation & Removal Ledgers**: Comprehensive historical logs for active, removed, rejected, and retired plates.
- **Job Order Management**: Work order tracking linked directly to daily production runs.
- **Role-Based Authorization**: Operator and Supervisor access controls with password sign-off.
- **Audit Logs & Snapshots**: Automated activity logging and local JSON database export/import backups.
