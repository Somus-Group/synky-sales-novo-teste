CREATE TABLE `imported_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`niche` text NOT NULL,
	`template` text NOT NULL,
	`content_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_imported_templates_workspace_updated` ON `imported_templates` (`workspace_id`,`updated_at`);