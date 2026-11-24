// index.js
// Bot WhatsApp sederhana: kirim gambar + caption ".sticker" (atau "s") -> dibales stiker.
// Dipakai dengan @whiskeysockets/baileys (library open-source WA Web multi-device).

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const express = require('express');
const { imageToWebpSticker } = require('./lib/stickerMaker');

// Daftar command yang dikenali buat bikin stiker (bisa prefix titik atau tanpa)
const STICKER_COMMANDS = ['s', 'sticker', 's-image', 's-images', 'stiker'];

// Simpen QR terbaru di memori, biar bisa diakses lewat browser (/qr)
// -- kenapa: log terminal Railway sering motong/bungkus ASCII QR jadi gak kebaca
let latestQR = null;
let isConnected = false;

// Server kecil cuma buat nampilin status & QR code sebagai gambar
const app = express();
app.get('/', (req, res) => {
  if (isConnected) return res.send('✅ Bot sudah konek ke WhatsApp.');
  if (!latestQR) return res.send('⏳ Belum ada QR, tunggu beberapa detik lalu refresh...');
  res.send(`
    <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111">
      <div style="text-align:center;color:#fff;font-family:sans-serif">
        <p>Scan QR ini pakai WhatsApp &rarr; Perangkat Tertaut</p>
        <img src="/qr.png" style="width:300px;height:300px;background:#fff;padding:8px;border-radius:8px" />
        <p><small>Halaman ini auto-refresh tiap 5 detik</small></p>
      </div>
      <script>setTimeout(() => location.reload(), 5000)</script>
    </body></html>
  `);
});
app.get('/qr.png', async (req, res) => {
  if (!latestQR) return res.status(404).send('No QR yet');
  res.setHeader('Content-Type', 'image/png');
  QRCode.toFileStream(res, latestQR, { width: 300 });
});
app.listen(process.env.PORT || 3000, () => {
  console.log('Web server buat QR jalan di port', process.env.PORT || 3000);
});

async function startBot() {
  // Sesi login disimpan di folder ./session biar gak perlu scan QR tiap restart
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      console.log('QR baru dibuat. Buka URL service ini di browser buat scan (lihat tab Settings > Networking > Domain).');
    }

    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi putus, reconnect:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      isConnected = true;
      latestQR = null;
      console.log('Bot WhatsApp sudah konek!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const m = msg.message;

    // Ambil teks: bisa dari caption gambar, atau pesan teks biasa
    const text = (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      ''
    )
      .trim()
      .toLowerCase();

    const command = text.replace(/^[.!/]/, ''); // buang prefix . ! / kalau ada

    try {
      // --- Command bikin stiker dari gambar ---
      if (STICKER_COMMANDS.includes(command) && m.imageMessage) {
        await sock.sendMessage(from, { text: '⏳ Lagi bikin stiker...' });

        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const stickerBuffer = await imageToWebpSticker(buffer, {
          packname: 'Bot Dayat',
          author: 'raditxss',
        });

        await sock.sendMessage(from, { sticker: stickerBuffer });
        return;
      }

      // --- Command reply gambar lalu ketik "s" terpisah ---
      const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
      if (STICKER_COMMANDS.includes(command) && quoted?.imageMessage) {
        await sock.sendMessage(from, { text: '⏳ Lagi bikin stiker dari gambar yang di-reply...' });

        const fakeMsg = {
          key: {
            remoteJid: from,
            id: msg.key.id,
            participant: msg.key.participant,
          },
          message: quoted,
        };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
        const stickerBuffer = await imageToWebpSticker(buffer, {
          packname: 'Bot Dayat',
          author: 'raditxss',
        });

        await sock.sendMessage(from, { sticker: stickerBuffer });
        return;
      }

      // --- Command bantuan ---
      if (command === 'menu' || command === 'help') {
        await sock.sendMessage(from, {
          text:
            '*Menu Bot Stiker*\n\n' +
            '📸 Kirim/reply gambar + caption *s* atau *.sticker* → jadi stiker\n' +
            'ℹ️ *.menu* → nampilin pesan ini',
        });
      }
    } catch (err) {
      console.error('Error pas proses command:', err);
      await sock.sendMessage(from, { text: '❌ Gagal bikin stiker, coba lagi ya.' });
    }
  });
}

startBot();
