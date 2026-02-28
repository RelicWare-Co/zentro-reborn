import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { organization, user } from "./auth.schema";
import { creditTransaction } from "./credit.schema";
import { customer } from "./customer.schema";
import { product } from "./inventory.schema";
import { shift } from "./pos.schema";

export const sale = sqliteTable(
  "sale",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    shiftId: text("shift_id").notNull().references(() => shift.id),
    customerId: text("customer_id").references(() => customer.id), // Nulo si es cliente de mostrador (sin registro)
    userId: text("user_id").notNull().references(() => user.id), // Quién hizo la venta
    totalAmount: integer("total_amount").notNull(),
    status: text("status").notNull().default("completed"), // 'completed', 'credit' (fiado), 'cancelled'
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("sale_organizationId_idx").on(table.organizationId)]
);

export const saleItem = sqliteTable(
  "sale_item",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id").notNull().references(() => sale.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
  }
);

export const saleItemModifier = sqliteTable(
  "sale_item_modifier",
  {
    id: text("id").primaryKey(),
    saleItemId: text("sale_item_id").notNull().references(() => saleItem.id, { onDelete: "cascade" }),
    modifierProductId: text("modifier_product_id").notNull().references(() => product.id), // El producto 'adición'
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
  }
);

// Puede haber múltiples pagos por venta (Split Payment)
export const payment = sqliteTable(
  "payment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    saleId: text("sale_id").references(() => sale.id, { onDelete: "cascade" }), // Nulo si es el pago a una deuda antigua
    shiftId: text("shift_id").notNull().references(() => shift.id), // Para saber a qué caja entró la plata
    method: text("method").notNull(), // 'cash', 'card', 'transfer_nequi', 'transfer_bancolombia'
    amount: integer("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("payment_saleId_idx").on(table.saleId)]
);

export const saleRelations = relations(sale, ({ one, many }) => ({
  organization: one(organization, {
    fields: [sale.organizationId],
    references: [organization.id],
  }),
  shift: one(shift, {
    fields: [sale.shiftId],
    references: [shift.id],
  }),
  customer: one(customer, {
    fields: [sale.customerId],
    references: [customer.id],
  }),
  user: one(user, {
    fields: [sale.userId],
    references: [user.id],
  }),
  items: many(saleItem),
  payments: many(payment),
  creditTransactions: many(creditTransaction),
}));

export const saleItemRelations = relations(saleItem, ({ one, many }) => ({
  sale: one(sale, {
    fields: [saleItem.saleId],
    references: [sale.id],
  }),
  product: one(product, {
    fields: [saleItem.productId],
    references: [product.id],
  }),
  modifiers: many(saleItemModifier),
}));

export const saleItemModifierRelations = relations(saleItemModifier, ({ one }) => ({
  saleItem: one(saleItem, {
    fields: [saleItemModifier.saleItemId],
    references: [saleItem.id],
  }),
  modifierProduct: one(product, {
    fields: [saleItemModifier.modifierProductId],
    references: [product.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one, many }) => ({
  organization: one(organization, {
    fields: [payment.organizationId],
    references: [organization.id],
  }),
  sale: one(sale, {
    fields: [payment.saleId],
    references: [sale.id],
  }),
  shift: one(shift, {
    fields: [payment.shiftId],
    references: [shift.id],
  }),
  creditTransactions: many(creditTransaction),
}));