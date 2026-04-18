import { query } from '../../db/connection.js';
import { getPhotoPath, deletePhotoFile } from '../../utils/photoStorage.js';
import fs from 'fs';

export async function downloadPhoto(req, res) {
  const photoId = parseInt(req.params.photoId);
  const userId = req.user.userId;

  // Verify user owns the photo's project
  const result = await query(
    `SELECT p.storage_path, p.mime_type, p.original_filename
     FROM photos p
     JOIN projects pr ON pr.id = p.project_id
     WHERE p.id = $1 AND pr.user_id = $2 AND pr.is_deleted = false`,
    [photoId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Photo not found', code: 'NOT_FOUND' });
  }

  const photo = result.rows[0];
  const filepath = getPhotoPath(photo.storage_path);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Photo file not found', code: 'FILE_NOT_FOUND' });
  }

  res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(filepath).pipe(res);
}

export async function deletePhoto(req, res) {
  const photoId = parseInt(req.params.photoId);
  const projectId = parseInt(req.params.projectId);
  const userId = req.user.userId;

  // Verify ownership
  const result = await query(
    `SELECT p.id, p.storage_path
     FROM photos p
     JOIN projects pr ON pr.id = p.project_id
     WHERE p.id = $1 AND p.project_id = $2 AND pr.user_id = $3`,
    [photoId, projectId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Photo not found', code: 'NOT_FOUND' });
  }

  const photo = result.rows[0];

  // Delete file
  await deletePhotoFile(photo.storage_path);

  // Delete record
  await query('DELETE FROM photos WHERE id = $1', [photoId]);

  res.json({ success: true });
}

export async function listPhotos(req, res) {
  const projectId = parseInt(req.params.projectId);
  const userId = req.user.userId;

  // Verify ownership
  const proj = await query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [projectId, userId]
  );
  if (proj.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }

  const result = await query(
    `SELECT id, file_id, photo_index, room, component, side, condition, category, caption, mime_type, created_at
     FROM photos WHERE project_id = $1 ORDER BY photo_index`,
    [projectId]
  );

  res.json({
    photos: result.rows.map(p => ({
      id: p.id,
      fileId: p.file_id,
      photoIndex: p.photo_index,
      room: p.room,
      component: p.component,
      side: p.side,
      condition: p.condition,
      category: p.category,
      caption: p.caption,
      mimeType: p.mime_type,
      downloadUrl: `/api/photos/${p.id}/download`,
      createdAt: p.created_at,
    })),
  });
}
