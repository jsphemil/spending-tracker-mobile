ALTER TABLE `settings` ADD `app_lock_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `last_seen_version` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `dashboard_layout` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `hints_seen` text;