import "server-only";
import sharp, { type Metadata } from "sharp";

export const MAX_BYTES_ORIGEM = 10 * 1024 * 1024;
const FORMATOS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff", "heif"]);

export class ImagemInvalida extends Error {}

/** Normaliza qualquer imagem aceita para WebP, no máximo 1200px, girada certo e sem metadados (EXIF/GPS). */
export async function processarImagem(entrada: Buffer): Promise<Buffer> {
  let meta: Metadata;
  try {
    meta = await sharp(entrada, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImagemInvalida("formato");
  }
  if (!meta.format || !FORMATOS.has(meta.format)) throw new ImagemInvalida("formato");

  try {
    return await sharp(entrada, { limitInputPixels: 50_000_000, animated: false })
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ImagemInvalida("formato");
  }
}
