-- +goose Up
CREATE TABLE items (
  id CHAR(36) NOT NULL,
  type ENUM('lost', 'found') NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(32) NOT NULL,
  location VARCHAR(200) NOT NULL,
  occurred_at DATETIME(3) NOT NULL COMMENT 'When the item was lost/found (UTC)',
  contact_name VARCHAR(100) NOT NULL,
  contact_info VARCHAR(200) NOT NULL,
  image_key VARCHAR(255) NULL COMMENT 'Object key in S3-compatible storage',
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_items_type_status (type, status),
  KEY idx_items_created_at (created_at),
  KEY idx_items_image_key (image_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- +goose Down
DROP TABLE items;
