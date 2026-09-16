ALTER TABLE `settings` ADD `tags_view` text DEFAULT 'grid' NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `icon` text DEFAULT 'tag-outline' NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `color` text DEFAULT '#6366F1' NOT NULL;--> statement-breakpoint
UPDATE `tags` SET `color` = CASE (`id` % 12) WHEN 0 THEN '#EF4444' WHEN 1 THEN '#F97316' WHEN 2 THEN '#EAB308' WHEN 3 THEN '#84CC16' WHEN 4 THEN '#22C55E' WHEN 5 THEN '#14B8A6' WHEN 6 THEN '#0EA5E9' WHEN 7 THEN '#6366F1' WHEN 8 THEN '#8B5CF6' WHEN 9 THEN '#EC4899' WHEN 10 THEN '#6B7280' WHEN 11 THEN '#0F172A' END;
