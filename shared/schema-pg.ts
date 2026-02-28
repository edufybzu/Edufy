import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "NGO"]);
export const unitEnum = pgEnum("unit", ["piece", "pack", "box"]);
export const orderStatusEnum = pgEnum("order_status", ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PACKING", "READY", "DELIVERED", "CANCELLED"]);
export const requestStatusEnum = pgEnum("request_status", ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"]);

// User Profiles (extends auth users)
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey(),
  role: userRoleEnum("role").notNull().default("NGO"),
  orgName: varchar("org_name"),
  phone: varchar("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories (regions)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  regionCode: varchar("region_code", { length: 50 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  unit: unitEnum("unit").notNull().default("piece"),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(10),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Kits
export const kits = pgTable("kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Kit Items (products in a kit)
export const kitItems = pgTable("kit_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kitId: varchar("kit_id").notNull().references(() => kits.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  qtyPerKit: integer("qty_per_kit").notNull().default(1),
});

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  status: orderStatusEnum("status").notNull().default("DRAFT"),
  notes: text("notes"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id),
  kitId: varchar("kit_id").references(() => kits.id),
  quantity: integer("quantity").notNull().default(1),
});

// Stock Reservations
export const stockReservations = pgTable("stock_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// New School Requests
export const schoolRequests = pgTable("school_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  schoolName: varchar("school_name", { length: 255 }).notNull(),
  region: varchar("region", { length: 255 }).notNull(),
  studentsCount: integer("students_count").notNull(),
  requestedKitDesc: text("requested_kit_desc"),
  status: requestStatusEnum("status").notNull().default("PENDING"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
