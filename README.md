[README_performance.md](https://github.com/user-attachments/files/29468257/README_performance.md)
# Performance Sheet Rollover Automation 📊
> Automasi rollover bulanan file Performance Sheet cabang  
> — 108 file di 5 region selesai dalam kurang dari 1 jam.

## Problem
Setiap bulan, 108 file Google Sheets cabang di 5 region harus diperbarui secara manual:

- Buka dan copy file satu per satu (~3.5 menit per file karena data yang berat)
- Rename file sesuai format bulan target
- Copy semua permission editor/viewer ke file baru
- Pindahkan ke folder region yang sesuai
- Update dashboard pusat (Mondash) dengan URL file baru

Dengan 108 file, proses ini memakan **~6.3 jam setiap bulan** — repetitif, melelahkan, dan rentan human error.

## Solution
Mengidentifikasi pola repetitif dan membangun automasi via Google Apps Script:

1. Loop semua 108 file cabang di 5 region
2. Copy file ke folder bulan target dengan nama yang sudah disesuaikan
3. Transfer semua permission (editor/viewer) tanpa mengirim notifikasi email
4. Update dashboard pusat (Mondash) dengan URL file baru secara otomatis
5. Skip file yang sudah diproses — aman dijalankan ulang tanpa duplikasi

User hanya perlu update config bulanan (bulan sumber/target + Folder ID) lalu klik **Run**.

Catatan: Google Apps Script memiliki batas waktu eksekusi per run, sehingga script perlu dijalankan beberapa kali hingga seluruh 108 file selesai diproses.

## Impact
| Metrik | Manual | Automated |
|--------|--------|-----------|
| File diproses | 108 files | 108 files |
| Waktu per file | ~3.5 menit | — |
| Total waktu/bulan | ~6.3 jam | < 1 jam |
| Waktu dihemat | — | **5.3+ jam/bulan (85%+)** |
| Risiko file terlewat | Tinggi | Eliminated (skip logic) |

## Tech Stack
- Google Apps Script (JavaScript)
- Google Drive API — copy file & manajemen permission
- Google Sheets API — auto-update dashboard pusat

## How It Works
```
CONFIG (update tiap bulan)
  ├── SOURCE_MONTH = '08'
  ├── TARGET_MONTH = '09'
  └── REGIONS (5x source + target Folder ID)
          ↓
  rolloverAllRegions()
          ↓
  Per region:
    └── Scan folder source
          ↓
        Skip jika sudah ada di target (aman diulang)
          ↓
        Copy file → rename → folder target
          ↓
        Copy permission (tanpa notifikasi email)
          ↓
        Update Mondash dengan URL baru
          ↓
  Log: SELESAI | copied: 108 | skipped: 0 | no match: 0
```

## Cara Penggunaan
1. Buka [Google Apps Script](https://script.google.com)
2. Paste kode `performance_rollover.gs` ke project baru
3. Aktifkan **Drive API** di bagian Services
4. Update bagian `CONFIG` di atas script sesuai bulan yang diproses
5. Jalankan fungsi `rolloverAllRegions()`
6. Pantau execution log — ulangi run hingga semua file selesai
