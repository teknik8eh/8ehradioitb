Berikut PRD lengkapnya untuk kedua fitur:

---

# 📄 Product Requirements Document (PRD)
## Fitur Live Chat & Request Lagu — Web 8EH Radio ITB

**Versi:** 1.0
**Tanggal:** 18 Juni 2026
**Author:** Manager Produk
**Status:** Draft

---

## 1. Overview

### 1.1 Latar Belakang
Web 8EH Radio ITB saat ini sudah memiliki fitur streaming audio live, podcast, blog, dan event. Namun belum ada mekanisme interaksi real-time antara penyiar dan pendengar selama siaran berlangsung. Dua fitur baru akan dibangun untuk mengisi gap ini: **Live Chat** dan **Request Lagu**.

### 1.2 Tujuan
- Meningkatkan engagement pendengar selama siaran live berlangsung
- Memberikan pengalaman interaktif tanpa barrier login yang tinggi
- Memperkuat hubungan antara penyiar dan komunitas pendengar 8EH ITB

### 1.3 Scope
Fitur ini **hanya aktif saat siaran sedang live** (`StreamConfig.onAir = true`). Di luar jam siaran, fitur tidak dapat diakses.

---

## 2. User & Roles

| Role | Deskripsi | Akses |
|---|---|---|
| **Guest / Pendengar** | Pengunjung web tanpa akun, hanya input nama panggilan | Kirim chat, lihat chat, request lagu, lihat queue |
| **Admin / Penyiar** | User dengan akun (NextAuth, whitelist) | Semua akses guest + moderasi chat + kelola request di dashboard |

---

## 3. Fitur A — Live Chat

### 3.1 Deskripsi
Fitur chat real-time yang bisa digunakan pendengar selama siaran live berlangsung. Tidak memerlukan akun — pendengar cukup input nama panggilan untuk mulai chatting.

### 3.2 User Stories

**Guest:**
- Saya ingin input nama panggilan sekali sebelum masuk chat agar bisa dikenali selama siaran
- Saya ingin nama saya tersimpan selama siaran berlangsung tanpa perlu input ulang
- Saya ingin melihat pesan chat dari pendengar lain secara real-time
- Saya ingin mengirim pesan chat selama siaran live
- Saya ingin melihat nama pengirim dan waktu pengiriman setiap pesan
- Saya ingin melihat berapa banyak pendengar yang sedang aktif
- Saya ingin mendapat notifikasi atau banner saat siaran dimulai
- Saya ingin menggunakan chat dengan nyaman di perangkat mobile

**Admin/Penyiar:**
- Saya ingin menghapus pesan yang tidak pantas secara real-time
- Saya ingin mute guest tertentu agar tidak bisa mengirim pesan lagi
- Saya ingin melihat log aktivitas moderasi (siapa yang dihapus/dimute, kapan)
- Saya ingin history chat setiap sesi siaran tersimpan dan bisa saya akses setelah siaran selesai

### 3.3 Functional Requirements

#### Guest Session
- Saat pertama kali membuka chat, sistem menampilkan modal input nama panggilan
- Nama panggilan wajib diisi, minimal 2 karakter, maksimal 30 karakter
- Setelah submit, sistem membuat `GuestSession` di database dan menyimpan `sessionId` di cookie browser (signed, encrypted menggunakan `iron-session`)
- Session berlaku selama siaran berlangsung dan expired otomatis saat siaran selesai
- Jika session sudah expired dan siaran baru dimulai, modal nama panggilan muncul kembali

#### Chat Room
- Setiap sesi siaran memiliki satu `ChatRoom` yang terikat ke `broadcastId`
- Room otomatis dibuat saat admin mengaktifkan siaran (`onAir = true`)
- Room otomatis ditutup dan diarsipkan saat siaran selesai (`onAir = false`)
- Guest tidak bisa mengirim pesan jika room tidak aktif

#### Mengirim & Menerima Pesan
- Pesan dikirim via `POST /api/live-chat/[roomId]/messages`
- Pesan di-broadcast secara real-time ke semua client yang terhubung menggunakan Pusher
- Panjang pesan maksimal 300 karakter
- Rate limit: maksimal 10 pesan per menit per `sessionId`
- Jika melebihi rate limit, tampilkan pesan error dengan cooldown timer

#### Moderasi
- Admin bisa menghapus pesan — pesan tidak hilang dari DB, hanya `isDeleted = true`, tampil sebagai *"Pesan ini dihapus oleh moderator"* di UI
- Admin bisa mute guest berdasarkan `sessionId` — `isMuted = true` di `GuestSession`, guest yang di-mute mendapat error 403 saat kirim pesan
- Semua aksi moderasi dicatat di audit log (field `deletedById`, `deletedAt`)

#### UI/UX
- Chat ditampilkan sebagai sidebar atau modal overlay di halaman utama saat siaran live
- Auto-scroll ke pesan terbaru saat pesan baru masuk
- Timestamp pesan ditampilkan dalam format relatif ("2 menit lalu"), tooltip absolut saat hover
- Counter jumlah pendengar aktif ditampilkan di header chat, update real-time
- Banner "🔴 Sedang Live!" muncul di halaman utama saat `onAir = true`
- Layout responsif untuk mobile (≤ 768px)

### 3.4 Non-Functional Requirements
- Mendukung minimal 100 koneksi concurrent tanpa degradasi performa
- Pesan harus muncul di semua client dalam waktu < 1 detik setelah dikirim
- History chat per sesi disimpan permanen di database

### 3.5 API Endpoints

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/live-chat/guest-session` | Buat guest session, set cookie | Public |
| GET | `/api/live-chat/[roomId]/messages` | Fetch history pesan | Guest Session Cookie |
| POST | `/api/live-chat/[roomId]/messages` | Kirim pesan baru | Guest Session Cookie |
| DELETE | `/api/live-chat/[roomId]/messages/[msgId]` | Hapus pesan | Admin only |
| POST | `/api/live-chat/[roomId]/mute/[sessionId]` | Mute guest | Admin only |
| GET | `/api/live-chat/[roomId]/stats` | Jumlah listener aktif | Public |

### 3.6 Out of Scope
- Emoji reactions pada pesan
- Reply/thread pesan
- Direct message antar pendengar
- Chat di luar jam siaran live
- Notifikasi push ke device (push notification)

---

## 4. Fitur B — Request Lagu

### 4.1 Deskripsi
Fitur yang memungkinkan pendengar mengajukan request lagu untuk diputarkan di siaran live. Admin/penyiar dapat melihat, mengelola, dan mengubah status request dari dashboard. Tidak memerlukan akun.

### 4.2 User Stories

**Guest:**
- Saya ingin input nama panggilan sekali sebelum bisa request lagu
- Saya ingin mencari lagu berdasarkan judul atau nama artis
- Saya ingin melihat detail lagu (cover art, judul, artis) sebelum merequest
- Saya ingin mengirim request lagu beserta pesan opsional untuk penyiar
- Saya ingin mendapat konfirmasi bahwa request saya sudah diterima
- Saya ingin melihat antrian lagu yang sudah direquest oleh pendengar lain
- Saya ingin melihat lagu request yang sedang diputar saat ini
- Saya ingin tahu sisa kuota request saya di sesi ini
- Saya ingin menggunakan fitur ini dengan nyaman di perangkat mobile

**Admin/Penyiar:**
- Saya ingin melihat semua request yang masuk di satu dashboard
- Saya ingin mengubah status request: Putar Sekarang, Tandai Selesai, Tolak
- Saya ingin menolak request dengan alasan yang akan ditampilkan ke pendengar
- Saya ingin memfilter dan mencari request berdasarkan status atau nama pendengar

### 4.3 Functional Requirements

#### Guest Session
- Berbagi mekanisme session yang sama dengan fitur Live Chat (`GuestSession` model)
- Jika pendengar sudah input nama di Live Chat, tidak perlu input ulang untuk Request Lagu (dan sebaliknya)
- `requestCount` di `GuestSession` di-increment setiap kali request berhasil disubmit

#### Pencarian Lagu
- Menggunakan endpoint iTunes API yang sudah ada di `/api/itunes/search`
- Hasil pencarian menampilkan: cover art, judul lagu, nama artis
- Jika pencarian tidak menemukan hasil, tampilkan opsi input manual (judul + artis bebas)
- Pencarian dilakukan dengan debounce 500ms untuk mengurangi API call

#### Submit Request
- Request dikirim via `POST /api/song-request`
- Payload: `songTitle`, `songArtist`, `songCoverUrl` (opsional), `itunesTrackId` (opsional), `message` (opsional, maks 200 karakter)
- Request hanya bisa dilakukan saat siaran live (`onAir = true`), jika tidak → error 403
- Batas maksimal **3 request per guest per sesi siaran** — jika melebihi → error 429 dengan pesan "Kamu sudah mencapai batas request untuk siaran ini"
- Duplikat lagu (judul + artis sama) dalam satu sesi ditolak dengan pesan informatif
- Setelah berhasil, tampilkan toast konfirmasi: *"Request kamu sudah masuk! 🎵"*

#### Status Request
Alur status request:

```
PENDING → QUEUED → NOW_PLAYING → DONE
                ↘ REJECTED
```

- `PENDING` — baru masuk, menunggu direview admin
- `QUEUED` — sudah dikonfirmasi admin, masuk antrian
- `NOW_PLAYING` — sedang diputar saat ini (hanya 1 request berstatus ini dalam satu waktu)
- `DONE` — sudah selesai diputar
- `REJECTED` — ditolak admin beserta alasan

#### Antrian (Queue)
- Endpoint `GET /api/song-request/queue` mengembalikan semua request berstatus `QUEUED` dan `NOW_PLAYING`, diurutkan berdasarkan `createdAt`
- Queue ditampilkan secara real-time ke pendengar menggunakan Pusher (update saat admin mengubah status)
- `NowPlayingRequest` — komponen khusus yang menampilkan lagu yang sedang diputar, terintegrasi dengan `RadioPlayer` yang sudah ada

#### Dashboard Admin
- Halaman khusus admin (route: `/dashboard/song-requests` atau tab di dashboard yang sudah ada)
- Tabel menampilkan: cover art, judul, artis, nama requester (guest name), pesan, status, waktu request
- Tombol aksi per baris: **"Putar Sekarang"**, **"Tandai Selesai"**, **"Tolak"** (dengan modal input alasan)
- Filter berdasarkan status, search berdasarkan nama guest atau judul lagu
- Badge counter di sidebar/nav untuk jumlah request `PENDING` yang belum diproses

#### UI/UX
- Komponen Request Lagu ditampilkan berdampingan atau di tab yang sama dengan Live Chat
- Sisa kuota ditampilkan di form: *"Sisa request: 2/3"*
- Request yang ditolak menampilkan alasan di antrian dengan badge merah
- Layout responsif untuk mobile (≤ 768px)

### 4.4 Non-Functional Requirements
- Perubahan status request harus ter-update di UI pendengar dalam waktu < 2 detik
- Query antrian harus < 100ms (dengan proper indexing pada `status`, `createdAt`, `broadcastId`)
- Sistem harus gracefully handle kondisi iTunes API down (fallback ke input manual)

### 4.5 API Endpoints

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/song-request/guest-session` | Buat/ambil guest session | Public |
| GET | `/api/song-request/search` | Cari lagu via iTunes API | Guest Session Cookie |
| POST | `/api/song-request` | Submit request lagu baru | Guest Session Cookie |
| GET | `/api/song-request/queue` | Ambil antrian request aktif | Public |
| GET | `/api/song-request/admin` | List semua request + filter | Admin only |
| PATCH | `/api/song-request/[id]/status` | Update status request | Admin only |
| POST | `/api/song-request/[id]/reject` | Tolak request + alasan | Admin only |

### 4.6 Out of Scope
- Voting/upvote request lagu dari pendengar lain
- Integrasi otomatis dengan software playout siaran
- History request lagu per pendengar lintas sesi
- Notifikasi ke pendengar saat request mereka diputar

---

## 5. Shared Infrastructure

### 5.1 Guest Session (Dipakai Kedua Fitur)
- Model `GuestSession` di MongoDB via Prisma
- Session ID dibuat menggunakan `nanoid`, disimpan di cookie dengan `iron-session`
- Satu session berlaku untuk **kedua fitur sekaligus** — pendengar cukup input nama satu kali
- Cookie expire mengikuti `expiresAt` di database, di-set saat siaran dimulai

### 5.2 Real-time (Pusher Channels)
- Semua event real-time menggunakan Pusher
- Channel naming convention:
  - `presence-chat-{broadcastId}` — untuk Live Chat (presence channel untuk counter listener)
  - `broadcast-{broadcastId}` — untuk update queue Request Lagu

### 5.3 Database Models Baru
- `GuestSession` — menyimpan data guest, session cookie, status mute, request count
- `ChatRoom` — satu room per sesi siaran
- `ChatMessage` — pesan chat dengan soft delete
- `SongRequest` — request lagu dengan state machine status

### 5.4 Environment Variables Baru
```
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER
GUEST_SESSION_SECRET
CHAT_RATE_LIMIT_PER_MINUTE
SONG_REQUEST_LIMIT_PER_SESSION
```

---

## 6. Constraints & Assumptions

| # | Constraint / Assumption |
|---|---|
| 1 | Hosting di Vercel (serverless) — WebSocket tidak didukung, real-time menggunakan Pusher |
| 2 | Kedua fitur hanya aktif saat `StreamConfig.onAir = true` |
| 3 | Guest tidak perlu akun, identitas berbasis session cookie |
| 4 | Admin/moderator adalah user yang sudah login via NextAuth dengan role yang sesuai |
| 5 | Integrasi pencarian lagu menggunakan iTunes API yang sudah tersedia di repo |
| 6 | Database MongoDB via Prisma — tidak ada migrasi skema, cukup `prisma generate` |
| 7 | Package manager yang digunakan adalah Bun |

---

## 7. Success Metrics

| Metrik | Target |
|---|---|
| Pesan chat terkirim dan muncul real-time | < 1 detik latency |
| Update status request muncul di queue | < 2 detik latency |
| Jumlah concurrent user yang didukung | ≥ 100 user |
| Query response time antrian | < 100ms |
| Zero downtime untuk fitur existing | Tidak ada breaking change |

---

## 8. Timeline

| Sprint | Minggu | Deliverable |
|---|---|---|
| Sprint 1 | Minggu 1 | Guest session flow, infrastruktur real-time, API dasar, komponen awal |
| Sprint 2 | Minggu 2 | Moderasi chat, dashboard admin request lagu |
| Sprint 3 | Minggu 3 | Notifikasi live, integrasi ke RadioPlayer, edge cases |
| Sprint 4 | Minggu 4 | Testing E2E, bug fix, deployment production |

---

*Dokumen ini menjadi acuan utama bagi Tim A (Live Chat) dan Tim B (Request Lagu) selama 4 sprint pengembangan.*
