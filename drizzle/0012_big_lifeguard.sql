CREATE TABLE `funds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_amount_minor` integer NOT NULL,
	`target_date` integer,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE TABLE `fund_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fund_id` integer NOT NULL,
	`amount_minor` integer NOT NULL,
	`date` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fund_allocations_fund_id_idx` ON `fund_allocations` (`fund_id`);--> statement-breakpoint
CREATE INDEX `fund_allocations_date_idx` ON `fund_allocations` (`date`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `fund_id` integer REFERENCES funds(id);--> statement-breakpoint
CREATE INDEX `transactions_fund_id_idx` ON `transactions` (`fund_id`);
