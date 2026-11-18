-- =========================================================
-- 李氏家谱 · Cloudflare D1 数据库初始化脚本
-- 版本: v1.0
-- 包含：族人表、谱页表、修订历史表、会话表、备份事件表及核心索引
-- =========================================================

-- 1. 族人档案表 (family_persons)
CREATE TABLE IF NOT EXISTS family_persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'male',
  generation INTEGER NOT NULL DEFAULT 1,
  father_id TEXT,
  mother_id TEXT,
  courtesy_name TEXT NOT NULL DEFAULT '',
  art_name TEXT NOT NULL DEFAULT '',
  aliases TEXT NOT NULL DEFAULT '[]',
  birth TEXT,
  death TEXT,
  is_alive INTEGER NOT NULL DEFAULT 0,
  spouse TEXT NOT NULL DEFAULT '',
  native_place TEXT NOT NULL DEFAULT '',
  residence TEXT NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recorded',
  hidden INTEGER NOT NULL DEFAULT 0,
  source_page_id TEXT,
  original TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 2. 原谱数字化影像与照录表 (family_source_pages)
CREATE TABLE IF NOT EXISTS family_source_pages (
  id TEXT PRIMARY KEY,
  volume INTEGER NOT NULL,
  page_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unrecorded',
  transcription TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 3. 编修修订快照表 (family_revisions)
CREATE TABLE IF NOT EXISTS family_revisions (
  id TEXT PRIMARY KEY,
  person_id TEXT,
  name TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

-- 4. 服务端安全会话表 (family_sessions)
CREATE TABLE IF NOT EXISTS family_sessions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- 5. 备份与恢复事件日志表 (family_backup_events)
CREATE TABLE IF NOT EXISTS family_backup_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- =========================================================
-- 核心索引优化
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_family_persons_gen ON family_persons (generation);
CREATE INDEX IF NOT EXISTS idx_family_persons_father ON family_persons (father_id);
CREATE INDEX IF NOT EXISTS idx_family_persons_mother ON family_persons (mother_id);
CREATE INDEX IF NOT EXISTS idx_family_source_pages_vol ON family_source_pages (volume, page_no);
CREATE INDEX IF NOT EXISTS idx_family_revisions_created ON family_revisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_sessions_expires ON family_sessions (expires_at);
