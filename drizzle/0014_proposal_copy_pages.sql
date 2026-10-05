CREATE TABLE `proposal_copy_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`html` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_proposal_copy_pages_slug` ON `proposal_copy_pages` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_proposal_copy_pages_workspace` ON `proposal_copy_pages` (`workspace_id`);
