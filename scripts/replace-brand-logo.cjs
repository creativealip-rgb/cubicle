const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const source = '/root/.hermes/profiles/coder/cache/images/img_df05a5b2af0f.jpg';
const out = path.join(__dirname, '..', 'public');

async function transparent(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = min > 235 ? 0 : Math.max(0, Math.min(255, (255 - min) * 12));
  }
  return sharp(data, { raw: info });
}

async function main() {
  const horizontal = await transparent(source);
  const horizontalBuffer = await horizontal.clone().trim({ background: '#ffffff' }).png().toBuffer();
  const icon = await transparent(source);
  const iconBuffer = await icon
    .extract({ left: 30, top: 35, width: 370, height: 370 })
    .trim({ background: '#ffffff' })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await Promise.all([
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-header.png')),
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-header-transparent.png')),
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-full-cropped.png')),
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-name.png')),
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-name-original.png')),
    sharp(horizontalBuffer).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-full.png')),
    sharp(source).jpeg({ quality: 94 }).toFile(path.join(out, 'logo-source.jpg')),
    sharp(iconBuffer).resize(1024, 1024).png().toFile(path.join(out, 'logo-icon.png')),
    sharp(iconBuffer).resize(512, 512).png().toFile(path.join(out, 'icon-512.png')),
    sharp(iconBuffer).resize(192, 192).png().toFile(path.join(out, 'icon-192.png')),
    sharp(iconBuffer).resize(180, 180).png().toFile(path.join(out, 'apple-touch-icon.png')),
    sharp(iconBuffer).resize(512, 512).png().toFile(path.join(out, 'icon.png')),
    sharp(iconBuffer).resize(32, 32).png().toFile(path.join(out, 'icon-32.png')),
    sharp(iconBuffer).resize(16, 16).png().toFile(path.join(out, 'icon-16.png')),
    sharp(iconBuffer).resize(512, 512).png().toFile(path.join(out, 'favicon-512.png')),
    sharp(iconBuffer).resize(192, 192).png().toFile(path.join(out, 'favicon-192.png')),
    sharp(iconBuffer).resize(32, 32).png().toFile(path.join(out, 'favicon-32.png')),
    sharp(iconBuffer).resize(16, 16).png().toFile(path.join(out, 'favicon-16.png')),
    sharp(iconBuffer).resize(32, 32).png().toFile(path.join(out, 'favicon-32x32.png')),
    sharp(iconBuffer).resize(16, 16).png().toFile(path.join(out, 'favicon-16x16.png')),
    sharp({ create: { width: 1200, height: 630, channels: 4, background: '#ffffff' } })
      .composite([{ input: await sharp(horizontalBuffer).resize({ width: 820 }).png().toBuffer(), gravity: 'center' }])
      .png().toFile(path.join(out, 'og-image.png')),
  ]);

  const fullData = horizontalBuffer.toString('base64');
  const iconData = iconBuffer.toString('base64');
  fs.writeFileSync(path.join(out, 'logo-cubiqlo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><image width="1200" height="400" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${fullData}"/></svg>`);
  fs.writeFileSync(path.join(out, 'logo-icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/png;base64,${iconData}"/></svg>`);
}
main().catch((error) => { console.error(error); process.exit(1); });
