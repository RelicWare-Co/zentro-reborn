CREATE TABLE `organization_join_link` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`label` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`last_used_by_user_id` text,
	`revoked_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`last_used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_join_link_token_unique` ON `organization_join_link` (`token`);--> statement-breakpoint
CREATE INDEX `organizationJoinLink_organizationId_idx` ON `organization_join_link` (`organization_id`);--> statement-breakpoint
CREATE INDEX `organizationJoinLink_createdByUserId_idx` ON `organization_join_link` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `organizationJoinLink_lastUsedByUserId_idx` ON `organization_join_link` (`last_used_by_user_id`);