CREATE TABLE `organization_module_entitlement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`module_key` text NOT NULL,
	`status` text DEFAULT 'granted' NOT NULL,
	`updated_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `orgModuleEntitlement_organizationId_idx` ON `organization_module_entitlement` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orgModuleEntitlement_org_module_uidx` ON `organization_module_entitlement` (`organization_id`,`module_key`);--> statement-breakpoint
CREATE TABLE `restaurant_area` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `restaurantArea_organizationId_idx` ON `restaurant_area` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurantArea_org_name_uidx` ON `restaurant_area` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `restaurant_kitchen_ticket` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`order_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`printed_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `restaurant_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `restaurantKitchenTicket_organizationId_idx` ON `restaurant_kitchen_ticket` (`organization_id`);--> statement-breakpoint
CREATE INDEX `restaurantKitchenTicket_orderId_idx` ON `restaurant_kitchen_ticket` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurantKitchenTicket_order_sequence_uidx` ON `restaurant_kitchen_ticket` (`order_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `restaurant_order` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`table_id` text NOT NULL,
	`opened_by_user_id` text NOT NULL,
	`closed_by_user_id` text,
	`sale_id` text,
	`order_number` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`guest_count` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_id`) REFERENCES `restaurant_table`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opened_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `restaurantOrder_organizationId_idx` ON `restaurant_order` (`organization_id`);--> statement-breakpoint
CREATE INDEX `restaurantOrder_tableId_idx` ON `restaurant_order` (`table_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurantOrder_org_number_uidx` ON `restaurant_order` (`organization_id`,`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurantOrder_saleId_uidx` ON `restaurant_order` (`sale_id`);--> statement-breakpoint
CREATE TABLE `restaurant_order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`order_id` text NOT NULL,
	`kitchen_ticket_id` text,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`tax_rate` integer DEFAULT 0 NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sent_at` integer,
	`ready_at` integer,
	`served_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `restaurant_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kitchen_ticket_id`) REFERENCES `restaurant_kitchen_ticket`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `restaurantOrderItem_organizationId_idx` ON `restaurant_order_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `restaurantOrderItem_orderId_idx` ON `restaurant_order_item` (`order_id`);--> statement-breakpoint
CREATE INDEX `restaurantOrderItem_ticketId_idx` ON `restaurant_order_item` (`kitchen_ticket_id`);--> statement-breakpoint
CREATE TABLE `restaurant_order_item_modifier` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`modifier_product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `restaurant_order_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`modifier_product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `restaurantOrderItemModifier_organizationId_idx` ON `restaurant_order_item_modifier` (`organization_id`);--> statement-breakpoint
CREATE INDEX `restaurantOrderItemModifier_orderItemId_idx` ON `restaurant_order_item_modifier` (`order_item_id`);--> statement-breakpoint
CREATE TABLE `restaurant_table` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`area_id` text NOT NULL,
	`name` text NOT NULL,
	`seats` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `restaurant_area`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `restaurantTable_organizationId_idx` ON `restaurant_table` (`organization_id`);--> statement-breakpoint
CREATE INDEX `restaurantTable_areaId_idx` ON `restaurant_table` (`area_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurantTable_org_area_name_uidx` ON `restaurant_table` (`organization_id`,`area_id`,`name`);