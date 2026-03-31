-- ClawOperations MySQL Schema
-- Character set: utf8mb4

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  avatar VARCHAR(1024) NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  douyin_open_id VARCHAR(128) NULL,
  douyin_nickname VARCHAR(255) NULL,
  douyin_avatar VARCHAR(1024) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_douyin_open_id (douyin_open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_auth_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_key VARCHAR(256) NULL,
  client_secret VARCHAR(512) NULL,
  redirect_uri VARCHAR(1024) NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  open_id VARCHAR(128) NULL,
  expires_at BIGINT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_user_id (user_id),
  CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creation_tasks (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  task_type ENUM('draft','history') NOT NULL DEFAULT 'draft',
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  requirement TEXT NULL,
  content_type VARCHAR(32) NULL,
  analysis LONGTEXT NULL,
  content LONGTEXT NULL,
  copywriting LONGTEXT NULL,
  publish_result LONGTEXT NULL,
  progress INT NOT NULL DEFAULT 0,
  current_step_message VARCHAR(1000) NULL,
  error_message TEXT NULL,
  can_resume TINYINT(1) NOT NULL DEFAULT 1,
  last_completed_step INT NOT NULL DEFAULT 0,
  reference_image_url VARCHAR(2048) NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_tasks_type_updated (task_type, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creation_templates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  requirement TEXT NOT NULL,
  content_type VARCHAR(32) NULL,
  tags LONGTEXT NULL,
  reference_image_url VARCHAR(2048) NULL,
  usage_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_config (
  config_key VARCHAR(128) NOT NULL PRIMARY KEY,
  config_value LONGTEXT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
