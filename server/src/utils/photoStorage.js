import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function getProjectDir(projectId) {
  const dir = path.join(UPLOAD_DIR, 'projects', String(projectId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function savePhotoFile(projectId, fileId, buffer, ext) {
  const dir = getProjectDir(projectId);
  const filename = `${fileId}${ext}`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  return `projects/${projectId}/${filename}`;
}

export function getPhotoPath(storagePath) {
  return path.join(UPLOAD_DIR, storagePath);
}

export async function deletePhotoFile(storagePath) {
  const filepath = path.join(UPLOAD_DIR, storagePath);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

export async function deleteProjectPhotos(projectId) {
  const dir = path.join(UPLOAD_DIR, 'projects', String(projectId));
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Convert base64 data URL to buffer for saving
export function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || !dataUrl.includes(',')) return null;
  const base64Data = dataUrl.split(',')[1];
  return Buffer.from(base64Data, 'base64');
}

// Get mime type from data URL
export function getMimeFromDataUrl(dataUrl) {
  if (!dataUrl) return 'image/jpeg';
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

// Get file extension from mime type
export function getExtFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
  };
  return map[mime] || '.jpg';
}
