import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// User Profiles (extends auth users)
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  role: text("role", { enum: ["ADMIN", "NGO"] }).notNull().default("NGO"),
  orgName: text("org_name"),
  phone: text("phone"),
  address: text("address"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Categories (regions)
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  regionCode: text("region_code"),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Products
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  unit: text("unit", { enum: ["piece", "pack", "box"] }).notNull().default("piece"),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(10),
  tags: text("tags"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Kits
export const kits = sqliteTable("kits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Kit Items (products in a kit)
export const kitItems = sqliteTable("kit_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kitId: text("kit_id").notNull().references(() => kits.id),
  productId: text("product_id").notNull().references(() => products.id),
  qtyPerKit: integer("qty_per_kit").notNull().default(1),
});

// Orders
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  status: text("status", { enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PACKING", "READY", "DELIVERED", "CANCELLED"] }).notNull().default("DRAFT"),
  notes: text("notes"),
  address: text("address"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Order Items
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").references(() => products.id),
  kitId: text("kit_id").references(() => kits.id),
  quantity: integer("quantity").notNull().default(1),
});

// Stock Reservations
export const stockReservations = sqliteTable("stock_reservations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// New School Requests
export const schoolRequests = sqliteTable("school_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  schoolName: text("school_name").notNull(),
  region: text("region").notNull(),
  studentsCount: integer("students_count").notNull(),
  requestedKitDesc: text("requested_kit_desc"),
  status: text("status", { enum: ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"] }).notNull().default("PENDING"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  kits: many(kits),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  kitItems: many(kitItems),
}));

export const kitsRelations = relations(kits, ({ one, many }) => ({
  category: one(categories, {
    fields: [kits.categoryId],
    references: [categories.id],
  }),
  kitItems: many(kitItems),
}));

export const kitItemsRelations = relations(kitItems, ({ one }) => ({
  kit: one(kits, {
    fields: [kitItems.kitId],
    references: [kits.id],
  }),
  product: one(products, {
    fields: [kitItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  reservations: many(stockReservations),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  kit: one(kits, {
    fields: [orderItems.kitId],
    references: [kits.id],
  }),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertKitSchema = createInsertSchema(kits).omit({ id: true, createdAt: true });
export const insertKitItemSchema = createInsertSchema(kitItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertSchoolRequestSchema = createInsertSchema(schoolRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ createdAt: true });

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Kit = typeof kits.$inferSelect;
export type InsertKit = z.infer<typeof insertKitSchema>;

export type KitItem = typeof kitItems.$inferSelect;
export type InsertKitItem = z.infer<typeof insertKitItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type SchoolRequest = typeof schoolRequests.$inferSelect;
export type InsertSchoolRequest = z.infer<typeof insertSchoolRequestSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

// Extended types with relations
export type ProductWithCategory = Product & { category?: Category | null };
export type KitWithItems = Kit & { 
  category?: Category | null; 
  kitItems: (KitItem & { product: Product })[];
};
export type OrderWithItems = Order & {
  items: (OrderItem & { product?: Product | null; kit?: Kit | null })[];
};
