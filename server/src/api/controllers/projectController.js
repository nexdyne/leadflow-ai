import { query, withTransaction } from '../../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import {
  dataUrlToBuffer, getMimeFromDataUrl, getExtFromMime,
  savePhotoFile, deleteProjectPhotos
} from '../../utils/photoStorage.js';

export async function listProjects(req, res) {
  const userId = req.user.userId;
  const skip = parseInt(req.query.skip) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const search = req.query.search || '';

  let queryText = `
    SELECT id, project_name, property_address, city, state_code, inspection_date,
           inspection_type, program_type, is_draft, created_at, updated_at
    FROM projects
    WHERE user_id = $1 AND is_deleted = false
  `;
  const params = [userId];

  if (search) {
    queryText += ` AND (property_address ILIKE $${params.length + 1} OR project_name ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  queryText += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, skip);

  const result = await query(queryText, params);

  // Get total count
  let countText = 'SELECT COUNT(*) FROM projects WHERE user_id = $1 AND is_deleted = false';
  const countParams = [userId];
  if (search) {
    countText += ` AND (property_address ILIKE $2 OR project_name ILIKE $2)`;
    countParams.push(`%${search}%`);
  }
  const countResult = await query(countText, countParams);

  res.json({
    projects: result.rows.map(r => ({
      id: r.id,
      projectName: r.project_name,
      propertyAddress: r.property_address,
      city: r.city,
      stateCode: r.state_code,
      inspectionDate: r.inspection_date,
      inspectionType: r.inspection_type,
      programType: r.program_type,
      isDraft: r.is_draft,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total: parseInt(countResult.rows[0].count),
  });
}

export async function createProject(req, res) {
  const userId = req.user.userId;
  const { projectName, stateData, isDraft } = req.body;

  if (!projectName || !stateData) {
    return res.status(400).json({ error: 'projectName and stateData are required', code: 'VALIDATION_ERROR' });
  }

  const pi = stateData.projectInfo || {};

  // Extract photos from state before saving (photos stored separately)
  const photos = stateData.photos || [];
  const stateWithoutPhotos = { ...stateData, photos: [] };

  const result = await withTransaction(async (client) => {
    // Insert project
    const projResult = await client.query(
      `INSERT INTO projects (user_id, project_name, property_address, city, state_code, zip,
       year_built, inspection_date, inspection_type, program_type, state_data, is_draft)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, project_name, created_at`,
      [
        userId, projectName, pi.propertyAddress || null, pi.city || null,
        pi.state || null, pi.zip || null, pi.yearBuilt ? parseInt(pi.yearBuilt) : null,
        pi.inspectionDate || null, pi.inspectionType || null, pi.programType || null,
        JSON.stringify(stateWithoutPhotos), isDraft !== false,
      ]
    );

    const projectId = projResult.rows[0].id;

    // Save photos to file system and insert records
    let photoCount = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.dataUrl) continue;

      const fileId = uuidv4();
      const mime = getMimeFromDataUrl(photo.dataUrl);
      const ext = getExtFromMime(mime);
      const buffer = dataUrlToBuffer(photo.dataUrl);

      if (!buffer) continue;

      const storagePath = await savePhotoFile(projectId, fileId, buffer, ext);

      await client.query(
        `INSERT INTO photos (project_id, file_id, original_filename, file_size, mime_type,
         storage_path, photo_index, room, component, side, condition, category, caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          projectId, fileId, photo.fileName || null, buffer.length, mime,
          storagePath, i, photo.room || null, photo.component || null,
          photo.side || null, photo.condition || null, photo.category || null,
          photo.caption || null,
        ]
      );
      photoCount++;
    }

    return { ...projResult.rows[0], photoCount };
  });

  res.status(201).json({
    id: result.id,
    projectName: result.project_name,
    createdAt: result.created_at,
    photoCount: result.photoCount,
  });
}

export async function getProject(req, res) {
  const userId = req.user.userId;
  const projectId = parseInt(req.params.projectId);

  const result = await query(
    `SELECT id, project_name, state_data, is_draft, created_at, updated_at
     FROM projects WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }

  const project = result.rows[0];

  // Get photo metadata (without file data)
  const photosResult = await query(
    `SELECT id, file_id, photo_index, room, component, side, condition, category, caption, mime_type
     FROM photos WHERE project_id = $1 ORDER BY photo_index`,
    [projectId]
  );

  // Reconstruct photos array with download URLs instead of dataUrls
  const photos = photosResult.rows.map(p => ({
    id: p.id,
    fileId: p.file_id,
    room: p.room,
    component: p.component,
    side: p.side,
    condition: p.condition,
    category: p.category,
    caption: p.caption,
    dataUrl: null, // Will be fetched on demand
    downloadUrl: `/api/photos/${p.id}/download`,
  }));

  // Merge photos back into state
  const stateData = project.state_data;
  stateData.photos = photos;

  res.json({
    id: project.id,
    projectName: project.project_name,
    stateData,
    isDraft: project.is_draft,
    photoCount: photos.length,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  });
}

export async function updateProject(req, res) {
  const userId = req.user.userId;
  const projectId = parseInt(req.params.projectId);
  const { projectName, stateData, isDraft } = req.body;

  // Verify ownership
  const existing = await query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [projectId, userId]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (projectName !== undefined) {
    updates.push(`project_name = $${paramIndex++}`);
    params.push(projectName);
  }
  if (stateData !== undefined) {
    const pi = stateData.projectInfo || {};
    const stateWithoutPhotos = { ...stateData, photos: [] };
    updates.push(`state_data = $${paramIndex++}`);
    params.push(JSON.stringify(stateWithoutPhotos));
    updates.push(`property_address = $${paramIndex++}`);
    params.push(pi.propertyAddress || null);
    updates.push(`city = $${paramIndex++}`);
    params.push(pi.city || null);
    updates.push(`inspection_type = $${paramIndex++}`);
    params.push(pi.inspectionType || null);
    updates.push(`program_type = $${paramIndex++}`);
    params.push(pi.programType || null);
  }
  if (isDraft !== undefined) {
    updates.push(`is_draft = $${paramIndex++}`);
    params.push(isDraft);
  }

  updates.push(`updated_at = NOW()`);
  params.push(projectId);

  await query(
    `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  res.json({ id: projectId, updatedAt: new Date().toISOString() });
}

export async function deleteProject(req, res) {
  const userId = req.user.userId;
  const projectId = parseInt(req.params.projectId);

  const result = await query(
    'UPDATE projects SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [projectId, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  }

  res.json({ success: true });
}
