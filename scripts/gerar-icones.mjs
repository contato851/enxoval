// Gera os PNGs do PWA a partir de public/icons/icon.svg. Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icons/icon.svg");
const fundo = { r: 0x4a, g: 0x6a, b: 0x4d, alpha: 1 };

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svg).resize(180, 180).flatten({ background: fundo }).png().toFile("public/icons/apple-touch-icon.png");
// Maskable: o desenho fica dentro da "zona segura" (80% central) sobre fundo cheio.
const miolo = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: fundo } })
  .composite([{ input: miolo, gravity: "center" }])
  .png()
  .toFile("public/icons/maskable-512.png");
console.log("ícones gerados");
