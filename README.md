# WA Sticker Bot

Bot WhatsApp buat bikin stiker dari gambar, pakai [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) (library WA Web yang gratis & open-source, bukan API berbayar).

## Install

```bash
npm install
```

## Jalankan

```bash
npm start
```

Nanti muncul QR code di terminal → buka WhatsApp di HP → **Perangkat Tertaut (Linked Devices)** → scan. Sesi login disimpan di folder `session/` biar gak perlu scan ulang tiap restart.

## Command

| Command | Cara pakai | Fungsi |
|---|---|---|
| `s`, `.sticker`, `s-images`, `stiker` | Kirim gambar dengan caption itu, ATAU reply gambar lalu ketik commandnya | Ubah gambar jadi stiker WebP |
| `.menu` / `.help` | Ketik langsung | Nampilin daftar command |

Nama command di `STICKER_COMMANDS` (file `index.js`) bisa ditambah/ubah sesuka lo — misal mau nambah alias `wa-s` atau `.stick` tinggal masukin ke array itu.

## Struktur

```
wa-sticker-bot/
├── index.js              # logic utama bot & handler pesan
├── lib/stickerMaker.js   # convert gambar -> webp + suntik metadata pack/author
├── package.json
└── session/              # auto-generate pas pertama login (JANGAN di-share, isinya sesi WA lo)
```

## Pengembangan lanjutan (ide)

- Tambah command `.toimg` buat convert stiker balik jadi gambar (pakai `sharp` baca webp).
- Dukung video pendek / GIF → stiker animasi (butuh `ffmpeg` buat convert ke webp animasi).
- Simpan daftar command di file config terpisah biar gampang di-edit tanpa nyentuh `index.js`.

## Catatan

- Ini pakai nomor WhatsApp pribadi/lo sendiri yang di-link sebagai perangkat — bukan WhatsApp Business API resmi. Jangan dipakai buat spam/broadcast massal, karena bisa kena banned oleh WhatsApp.
- Folder `session/` isinya kredensial login — jangan di-commit ke git publik.
