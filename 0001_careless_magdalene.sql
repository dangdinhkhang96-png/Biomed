CREATE TABLE `qr_public_links` (
	`device_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_public_links_token_unique` ON `qr_public_links` (`token`);