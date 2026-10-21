-- +goose Up
ALTER TABLE items
  ADD COLUMN resolved_by VARCHAR(100) NULL COMMENT 'Who collected or claimed the item',
  ADD COLUMN resolution_note VARCHAR(500) NULL,
  ADD COLUMN resolved_at DATETIME(3) NULL COMMENT 'When the item was marked resolved (UTC)';

-- +goose Down
ALTER TABLE items
  DROP COLUMN resolved_by,
  DROP COLUMN resolution_note,
  DROP COLUMN resolved_at;
