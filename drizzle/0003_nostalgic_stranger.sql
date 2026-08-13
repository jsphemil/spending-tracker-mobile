ALTER TABLE `recurring_rules` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_rules` ADD `supersedes_rule_id` integer REFERENCES recurring_rules(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `occurrence_date` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_recurring_generated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_recurring_exception` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_occurrence_idx` ON `transactions` (`recurring_rule_id`,`occurrence_date`);