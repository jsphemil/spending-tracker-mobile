ALTER TABLE `categories` ADD `budget_period` text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `fy_start_month` integer DEFAULT 4 NOT NULL;