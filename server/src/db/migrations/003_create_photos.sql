-- Photos table (file references, not base64 blobs)
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File storage
  file_id VARCHAR(100) UNIQUE NOT NULL,
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(50),
  storage_path VARCHAR(500),

  -- Photo metadata (mirrors frontend photo object)
  photo_index INTEGER,
  room VARCHAR(100),
  component VARCHAR(100),
  side VARCHAR(50),
  condition VARCHAR(50),
  category VARCHAR(100),
  caption TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_file_id ON photos(file_id);
