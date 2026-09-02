ALTER TABLE `settings` ADD `expense_reminder_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `expense_reminder_time` text DEFAULT '20:00' NOT NULL;