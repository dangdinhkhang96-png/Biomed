CREATE TABLE `registration_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`notification_code` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sends` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_requests_username_unique` ON `registration_requests` (`username`);--> statement-breakpoint
CREATE TABLE `team_login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_started` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `team_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `team_sessions_user` ON `team_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `team_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`must_change` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_users_username_unique` ON `team_users` (`username`);--> statement-breakpoint
CREATE TABLE `tender_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tender_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`step` text NOT NULL,
	`submitted_on` text NOT NULL,
	`recipient` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `tender_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tender_submissions_history` ON `tender_submissions` (`package_id`,`created_at`);