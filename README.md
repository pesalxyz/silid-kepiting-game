# Impostor Kepiting Game

Party word deduction game mobile-first (3-12 pemain), full client-side, offline-ready.

## Fitur Utama
- Peran: Warga, Impostor, Kepiting
- Long-press reveal (500ms) + vibration feedback
- Mode voting:
  - Pass & Vote (Secret)
  - Open Vote (counter langsung)
- Revote otomatis saat tie
- Mode game:
  - Elimination Mode
  - Fixed Rounds (3/5) + sudden death jika skor puncak tie
- Scoring kumulatif per ronde
- Anti-repeat pair kata (last N rounds)
- Custom pair kata
- History pair + clear history
- Dark/Light mode, spectator mode, quick reset, clear data
- Offline via service worker

## Struktur File
- `index.html`
- `styles.css`
- `app.js`
- `state.js`
- `logic.js`
- `ui.js`
- `online.js`
- `online-server.js`
- `wordbank.js`
- `service-worker.js`

## Menjalankan Lokal
### Opsi A: langsung
Buka `index.html` di browser. (Service worker kadang terbatas bila bukan via HTTP server)

### Opsi B: local server
```bash
npx serve .
```
Lalu buka URL lokal/IP LAN dari browser HP.

## Main Online (Realtime)
Fitur online memakai WebSocket room code (Host/JOIN).

Halaman online terpisah: `online.html` (bisa dibuka dari tombol `Main Online` di halaman utama).

1. Install dependency server:
```bash
npm install
```
2. Jalankan server online:
```bash
npm run online:server
```
3. Jalankan web app (contoh):
```bash
npx serve .
```
4. Buka game di beberapa device/browser, lalu:
- Isi `Server WebSocket` (default: `ws://localhost:8787` untuk lokal).
- Host klik `Buat Room`.
- Player lain isi `Room Code`, lalu klik `Join Room`.

### Deploy Gratis (Railway - Free Tier/Trial)
1. Push kode terbaru ke GitHub.
2. Buka Railway, klik `New Project` -> `Deploy from GitHub repo`.
3. Pilih repo game ini.
4. Railway akan menjalankan script `npm start` (server WebSocket).
5. Setelah deploy sukses, copy URL service (contoh: `https://xxxx.up.railway.app`).
6. Ubah ke WebSocket secure di game:
   - `wss://xxxx.up.railway.app`
7. Isi URL `wss://...` itu di field `Server WebSocket`, lalu buat/join room.

Catatan: free tier bisa sleep/limit, jadi untuk main rutin dan stabil biasanya perlu plan berbayar.

## Deploy GitHub Pages
1. Push project ke repo GitHub.
2. Masuk `Settings` -> `Pages`.
3. `Source`: Deploy from a branch.
4. Pilih `main` dan folder `/(root)`.
5. Save, tunggu build selesai, akses URL Pages.

## Deploy Vercel
1. Push repo ke GitHub.
2. Login [Vercel](https://vercel.com/) dan `New Project`.
3. Import repo.
4. Framework preset: `Other` (static).
5. Deploy.

## Catatan Fair Play
- Navigasi back diblok selama ronde aktif agar info rahasia tidak bocor.
- Disarankan main di orientasi portrait.
