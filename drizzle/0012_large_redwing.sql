CREATE TABLE `studio_ai_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`request_key` text NOT NULL,
	`model` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`reserved_usd` real NOT NULL,
	`cost_usd` real,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `studio_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_studio_ai_request_key` ON `studio_ai_requests` (`project_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `idx_studio_ai_workspace_created` ON `studio_ai_requests` (`workspace_id`,`created_at`);