CREATE TABLE `studio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`briefing` text DEFAULT '' NOT NULL,
	`reference_url` text DEFAULT '' NOT NULL,
	`file_key` text DEFAULT '' NOT NULL,
	`file_name` text DEFAULT '' NOT NULL,
	`html` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`messages_json` text DEFAULT '[]' NOT NULL,
	`lock_token` text DEFAULT '' NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_studio_projects_workspace_updated` ON `studio_projects` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `studio_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `studio_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_studio_versions_project_revision` ON `studio_versions` (`project_id`,`revision`);