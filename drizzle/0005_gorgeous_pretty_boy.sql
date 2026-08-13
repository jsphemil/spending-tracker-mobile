ALTER TABLE `settings` ADD `onboarding_completed` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- Any install that already has at least one account was clearly already
-- past onboarding (or predates onboarding entirely) — never send existing
-- users with real data back through the first-run flow.
UPDATE `settings` SET `onboarding_completed` = 1 WHERE EXISTS (SELECT 1 FROM `accounts`);