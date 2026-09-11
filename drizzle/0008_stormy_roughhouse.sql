CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_companies_workspace_name` ON `companies` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_companies_workspace` ON `companies` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `pipeline_settings` (
	`company_id` text PRIMARY KEY NOT NULL,
	`labels_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `opportunities` ADD `company_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_opportunities_company_stage` ON `opportunities` (`company_id`,`stage`);