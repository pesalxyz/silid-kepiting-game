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
