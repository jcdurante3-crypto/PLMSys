# PLMSys Portable Deployment Guide

This guide outlines the standard operating procedure for deploying and maintaining the Plate Lifecycle Monitoring System (`PLMSys`) in a Windows production environment.

---

## 1. System Requirements
- **Operating System:** Windows 10 or Windows 11 (64-bit).
- **Disk Space:** Minimum 200 MB free space for application binaries, logs, and database backups.
- **Permissions:** Read/write permissions on the deployment directory.

---

## 2. Installation & Portable Deployment

1. **Copy the Application Folder:**
   - Copy the `PLMSys` folder containing `PLMSys.exe` to your desired deployment location (e.g., `C:\PLMSys\` or `D:\Applications\PLMSys\`).
   - The application is entirely portable and does not require installation or administrator rights.

2. **First Launch:**
   - Double-click `PLMSys.exe`.
   - Upon first startup, the application automatically provisions the local directory structure:
     ```text
     PLMSys/
     ├── PLMSys.exe
     └── data/
         ├── database/
         │   └── plmsys.json
         ├── backups/
         ├── exports/
         ├── logs/
         └── settings/
     ```

3. **Data Portability:**
   - The primary database (`plmsys.json`), configuration settings, backups, and logs are strictly maintained inside the `data/` directory beside the executable.

---

## 3. Recommended Backup Procedure

1. **Automated / Manual Backups:**
   - Use the built-in Backup utility in PLMSys to generate timestamped JSON archives.
   - Backups are automatically saved to `data/backups/`.
2. **Disaster Recovery:**
   - In the event of system failure, copy the latest valid `.bak` or JSON archive from `data/backups/` into `data/database/plmsys.json` or use the in-app Restore module.

---

## 4. Network Synchronization Setup (Multi-PC)

1. **Shared Directory:**
   - Place the `PLMSys` folder on a shared network drive accessible by all authorized workstations (e.g., `\\Server01\PLMSys\`).
2. **Configuration:**
   - Configure network settings within the app to point to the shared database path.
   - The application manages revision control and transaction locking automatically to prevent concurrent write conflicts.

---

## 5. Folder Relocation

- You can move or copy the entire `PLMSys` folder to another drive or machine at any time without breaking paths or losing data, provided the `data/` directory remains intact beside `PLMSys.exe`.
