// lib/stickerMaker.js
// Helper buat ubah gambar (buffer) jadi stiker WebP + nempelin metadata (nama/pack)
const sharp = require('sharp');
const webp = require('node-webpmux');

/**
 * Convert buffer gambar (jpg/png/dll) jadi buffer WebP persegi 512x512,
 * lalu suntik metadata EXIF biar ada nama stiker & nama pack-nya.
 */
async function imageToWebpSticker(imageBuffer, { packname = 'MyBot', author = 'raditxss' } = {}) {
  // 1) Resize & convert ke webp pakai sharp
  const webpBuffer = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp()
    .toBuffer();

  // 2) Suntik metadata exif (pack name & author) biar muncul pas dibuka di WA
  const img = new webp.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': 'com.raditxss.wabot',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: ['😀'],
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);

  img.exif = exif;
  return await img.save(null);
}

module.exports = { imageToWebpSticker };
