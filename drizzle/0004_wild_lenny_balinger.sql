DROP INDEX `product_org_barcode_uidx`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_org_sku_uidx` ON `product` (`organization_id`,`sku`) WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX `product_org_barcode_uidx` ON `product` (`organization_id`,`barcode`) WHERE deleted_at is null;