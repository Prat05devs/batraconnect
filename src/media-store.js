import { mkdir, writeFile, rename, unlink, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { ApiError } from './validation.js';

sharp.cache(false);
sharp.concurrency(2);
const accepted = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);

/**
 * Fully decodes the upload (rejecting truncated or disguised files), applies EXIF orientation,
 * strips all metadata including GPS, bounds the size and re-encodes as JPEG.
 */
export async function normalizeImage(bytes) {
  let meta;
  try {
    meta = await sharp(bytes, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata();
  } catch {
    meta = null;
  }
  if (!meta || !accepted.has(meta.format))
    throw new ApiError(400, 'INVALID_PHOTO', 'Use a JPEG, PNG, WebP or AVIF photo up to 10 MB.');
  try {
    const { data, info } = await sharp(bytes, { failOn: 'error', limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, mimeType: 'image/jpeg', width: info.width, height: info.height };
  } catch {
    throw new ApiError(400, 'INVALID_PHOTO', 'This photo could not be read. Try another photo.');
  }
}

export async function createMediaStore({ mediaDir, s3 }) {
  if (s3) {
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
      await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: s3.forcePathStyle,
      credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
    });
    return {
      kind: 's3',
      put: (key, data, type) =>
        client.send(
          new PutObjectCommand({
            Bucket: s3.bucket,
            Key: key,
            Body: data,
            ContentType: type,
            ServerSideEncryption: s3.endpoint ? undefined : 'AES256',
          }),
        ),
      get: async key => {
        try {
          const out = await client.send(new GetObjectCommand({ Bucket: s3.bucket, Key: key }));
          return Buffer.from(await out.Body.transformToByteArray());
        } catch (e) {
          if (e.name === 'NoSuchKey') return null;
          throw e;
        }
      },
      delete: key => client.send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: key })),
    };
  }
  const root = resolve(mediaDir);
  await mkdir(root, { recursive: true });
  const path = key => {
    const file = resolve(root, key);
    if (!file.startsWith(root + '/')) throw new Error('Invalid media key');
    return file;
  };
  return {
    kind: 'filesystem',
    put: async (key, data) => {
      const temp = path(`${key}.tmp`);
      await writeFile(temp, data, { flag: 'wx', mode: 0o600 });
      await rename(temp, path(key));
    },
    get: key =>
      readFile(path(key)).catch(e => {
        if (e.code === 'ENOENT') return null;
        throw e;
      }),
    delete: key =>
      unlink(path(key)).catch(e => {
        if (e.code !== 'ENOENT') throw e;
      }),
  };
}
