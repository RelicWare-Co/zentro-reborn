CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`inviter_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_uidx` ON `organization` (`slug`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	`active_organization_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `credit_account` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`interest_rate` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_org_customer_uidx` ON `credit_account` (`organization_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `credit_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`credit_account_id` text NOT NULL,
	`sale_id` text,
	`payment_id` text,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credit_account_id`) REFERENCES `credit_account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text DEFAULT 'natural' NOT NULL,
	`document_type` text,
	`document_number` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`city` text,
	`tax_regime` text,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_organizationId_idx` ON `customer` (`organization_id`);--> statement-breakpoint
CREATE INDEX `customer_document_idx` ON `customer` (`document_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_org_doc_uidx` ON `customer` (`organization_id`,`document_number`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `category_organizationId_idx` ON `category` (`organization_id`);--> statement-breakpoint
CREATE TABLE `inventory_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inv_mov_productId_idx` ON `inventory_movement` (`product_id`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`sku` text,
	`barcode` text,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0,
	`tax_rate` integer DEFAULT 0 NOT NULL,
	`is_modifier` integer DEFAULT false NOT NULL,
	`track_inventory` integer DEFAULT true NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_organizationId_idx` ON `product` (`organization_id`);--> statement-breakpoint
CREATE INDEX `product_categoryId_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_org_barcode_uidx` ON `product` (`organization_id`,`barcode`);--> statement-breakpoint
CREATE TABLE `cash_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`shift_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cash_mov_shiftId_idx` ON `cash_movement` (`shift_id`);--> statement-breakpoint
CREATE TABLE `shift` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`terminal_id` text,
	`terminal_name` text,
	`status` text DEFAULT 'open' NOT NULL,
	`starting_cash` integer DEFAULT 0 NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`notes` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shift_organizationId_idx` ON `shift` (`organization_id`);--> statement-breakpoint
CREATE TABLE `shift_closure` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`payment_method` text NOT NULL,
	`expected_amount` integer NOT NULL,
	`actual_amount` integer NOT NULL,
	`difference` integer NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shift_closure_shiftId_idx` ON `shift_closure` (`shift_id`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`sale_id` text,
	`shift_id` text NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_saleId_idx` ON `payment` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sale` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`shift_id` text NOT NULL,
	`customer_id` text,
	`user_id` text NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_organizationId_idx` ON `sale` (`organization_id`);--> statement-breakpoint
CREATE TABLE `sale_item` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tax_rate` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `saleItem_organizationId_idx` ON `sale_item` (`organization_id`);--> statement-breakpoint
CREATE TABLE `sale_item_modifier` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_item_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`modifier_product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`sale_item_id`) REFERENCES `sale_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`modifier_product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `saleItemModifier_organizationId_idx` ON `sale_item_modifier` (`organization_id`);