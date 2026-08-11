# PLMSys Release Notes (v1.0.0)

**Release Date:** August 11, 2026  
**Application Name:** Plate Lifecycle Monitoring System (PLMSys)  
**Version:** 1.0.0  
**Artifact:** `PLMSys.exe` (Windows x64 Portable)

---

## Major Features & Capabilities

1. **Plate Lifecycle Management**:
   - Complete tracking of plate sets, installation records, production history, removals, replacements, and audit logs.
2. **Robust Production Logging & Batch Undo**:
   - Record production cycles with automated cycle count updates.
   - Batch production logging with transactional rollback / undo capabilities that correctly restore cycle counts and audit trails.
3. **Durable Portable Database Persistence**:
   - Local JSON-based database stored securely beside the executable in `data/database/plmsys.json`, ensuring data remains portable and never lost to browser cache clears or AppData relocations.
4. **Safety Backup & Factory Reset Protection**:
   - Manual and automated backup creation, validation, and restoration.
   - Mandatory safety-backup validation prior to Factory Reset (aborts automatically if the backup fails validation).
5. **Multi-User Network Synchronization**:
   - Real-time file/network synchronization supporting multiple workstations.
   - Revision control, active transaction locking, and conflict protection to prevent silent data overwrites.
   - Graceful disconnect recovery preventing empty database generation during network loss.
6. **Security & Authorization**:
   - Secure credential hashing and authentication handled strictly within the Electron main process.
   - IPC authorization guards preventing unauthorized rendering of destructive operations (Factory Reset, Restore, etc.).
7. **Automated Update Checking**:
   - Semantic versioning checks against official release sources with pre-update backup safety validation.

---

## Known Limitations
- Network synchronization relies on shared network paths or directory access across connected client machines.
- Portable execution requires read/write access to the application directory for local database and log persistence.
