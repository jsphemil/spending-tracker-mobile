-- Backfills existing rows to the new default (hidden) for devices that
-- ran migration 0010 before its default was corrected from false to
-- true. Harmless no-op on fresh installs, which already get true from
-- 0010 directly.
UPDATE `settings` SET `net_worth_hidden` = 1;
