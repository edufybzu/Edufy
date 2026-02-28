import { eq, and, lte, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  categories,
  products,
  kits,
  kitItems,
  orders,
  orderItems,
  stockReservations,
  schoolRequests,
  userProfiles,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type Kit,
  type InsertKit,
  type KitItem,
  type InsertKitItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type SchoolRequest,
  type InsertSchoolRequest,
  type UserProfile,
  type InsertUserProfile,
} from "@shared/schema";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  updateStock(id: string, quantity: number): Promise<boolean>;

  // Kits
  getKits(): Promise<any[]>;
  getKit(id: string): Promise<any | undefined>;
  createKit(data: InsertKit, items: InsertKitItem[]): Promise<Kit>;
  updateKit(id: string, data: Partial<InsertKit>, items?: InsertKitItem[]): Promise<Kit | undefined>;
  deleteKit(id: string): Promise<boolean>;

  // Orders
  getOrders(userId?: string): Promise<any[]>;
  getOrder(id: string): Promise<any | undefined>;
  createOrder(data: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // School Requests
  getSchoolRequests(userId?: string): Promise<SchoolRequest[]>;
  getSchoolRequest(id: string): Promise<SchoolRequest | undefined>;
  createSchoolRequest(data: InsertSchoolRequest): Promise<SchoolRequest>;
  updateSchoolRequest(id: string, data: Partial<SchoolRequest>): Promise<SchoolRequest | undefined>;

  // User Profiles
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  upsertUserProfile(data: InsertUserProfile): Promise<UserProfile>;

  // Stats
  getAdminStats(): Promise<{
    totalProducts: number;
    totalKits: number;
    lowStockCount: number;
    pendingOrders: number;
    pendingRequests: number;
    totalStock: number;
  }>;
}

class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(desc(categories.createdAt));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(data: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(lte(products.stock, products.lowStock));
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  async updateStock(id: string, quantity: number): Promise<boolean> {
    await db.update(products).set({ stock: quantity }).where(eq(products.id, id));
    return true;
  }

  // Kits
  async getKits(): Promise<any[]> {
    const allKits = await db.select().from(kits).orderBy(desc(kits.createdAt));
    const result = [];

    for (const kit of allKits) {
      const items = await db
        .select()
        .from(kitItems)
        .where(eq(kitItems.kitId, kit.id));
      
      const itemsWithProducts = [];
      for (const item of items) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        itemsWithProducts.push({ ...item, product });
      }

      let category = null;
      if (kit.categoryId) {
        const [cat] = await db.select().from(categories).where(eq(categories.id, kit.categoryId));
        category = cat;
      }

      result.push({ ...kit, category, kitItems: itemsWithProducts });
    }

    return result;
  }

  async getKit(id: string): Promise<any | undefined> {
    const [kit] = await db.select().from(kits).where(eq(kits.id, id));
    if (!kit) return undefined;

    const items = await db.select().from(kitItems).where(eq(kitItems.kitId, kit.id));
    const itemsWithProducts = [];
    for (const item of items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      itemsWithProducts.push({ ...item, product });
    }

    let category = null;
    if (kit.categoryId) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, kit.categoryId));
      category = cat;
    }

    return { ...kit, category, kitItems: itemsWithProducts };
  }

  async createKit(data: InsertKit, items: InsertKitItem[]): Promise<Kit> {
    const [kit] = await db.insert(kits).values(data).returning();
    
    for (const item of items) {
      await db.insert(kitItems).values({ ...item, kitId: kit.id });
    }

    return kit;
  }

  async updateKit(id: string, data: Partial<InsertKit>, items?: InsertKitItem[]): Promise<Kit | undefined> {
    const [kit] = await db.update(kits).set(data).where(eq(kits.id, id)).returning();
    
    if (items) {
      await db.delete(kitItems).where(eq(kitItems.kitId, id));
      for (const item of items) {
        await db.insert(kitItems).values({ ...item, kitId: id });
      }
    }

    return kit;
  }

  async deleteKit(id: string): Promise<boolean> {
    // First delete kit items (child records)
    await db.delete(kitItems).where(eq(kitItems.kitId, id));
    // Then delete the kit
    await db.delete(kits).where(eq(kits.id, id));
    return true;
  }

  // Orders
  async getOrders(userId?: string): Promise<any[]> {
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const allOrders = userId 
      ? await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const result = [];
    for (const order of allOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const itemsWithDetails = [];
      
      for (const item of items) {
        let product = null;
        let kit = null;
        
        if (item.productId) {
          const [p] = await db.select().from(products).where(eq(products.id, item.productId));
          product = p;
        }
        if (item.kitId) {
          const [k] = await db.select().from(kits).where(eq(kits.id, item.kitId));
          kit = k;
        }
        
        itemsWithDetails.push({ ...item, product, kit });
      }
      
      result.push({ ...order, items: itemsWithDetails });
    }

    return result;
  }

  async getOrder(id: string): Promise<any | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const itemsWithDetails = [];
    
    for (const item of items) {
      let product = null;
      let kit = null;
      
      if (item.productId) {
        const [p] = await db.select().from(products).where(eq(products.id, item.productId));
        product = p;
      }
      if (item.kitId) {
        const [k] = await db.select().from(kits).where(eq(kits.id, item.kitId));
        kit = k;
      }
      
      itemsWithDetails.push({ ...item, product, kit });
    }

    return { ...order, items: itemsWithDetails };
  }

  async validateOrderStock(orderItemsData: InsertOrderItem[]): Promise<{ valid: boolean; error?: string }> {
    for (const item of orderItemsData) {
      if (item.productId) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product) {
          return { valid: false, error: `Product not found` };
        }
        if (product.stock < item.quantity) {
          return { valid: false, error: `Insufficient stock for ${product.name}. Available: ${product.stock}` };
        }
      }

      if (item.kitId) {
        const kitItemsList = await db.select().from(kitItems).where(eq(kitItems.kitId, item.kitId));
        for (const kitItem of kitItemsList) {
          const [product] = await db.select().from(products).where(eq(products.id, kitItem.productId));
          if (!product) {
            return { valid: false, error: `Kit product not found` };
          }
          const totalQty = kitItem.qtyPerKit * item.quantity;
          if (product.stock < totalQty) {
            return { valid: false, error: `Insufficient stock for ${product.name} in kit. Needed: ${totalQty}, Available: ${product.stock}` };
          }
        }
      }
    }
    return { valid: true };
  }

  async createOrder(data: InsertOrder, orderItemsData: InsertOrderItem[]): Promise<Order> {
    const validation = await this.validateOrderStock(orderItemsData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const [order] = await db.insert(orders).values({ ...data, status: "SUBMITTED" }).returning();
    
    for (const item of orderItemsData) {
      await db.insert(orderItems).values({ ...item, orderId: order.id });

      if (item.productId) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (product) {
          await db.update(products)
            .set({ stock: product.stock - item.quantity })
            .where(eq(products.id, item.productId));
          
          await db.insert(stockReservations).values({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }

      if (item.kitId) {
        const kitItemsList = await db.select().from(kitItems).where(eq(kitItems.kitId, item.kitId));
        for (const kitItem of kitItemsList) {
          const [product] = await db.select().from(products).where(eq(products.id, kitItem.productId));
          if (product) {
            const totalQty = kitItem.qtyPerKit * item.quantity;
            await db.update(products)
              .set({ stock: product.stock - totalQty })
              .where(eq(products.id, kitItem.productId));
            
            await db.insert(stockReservations).values({
              orderId: order.id,
              productId: kitItem.productId,
              quantity: totalQty,
            });
          }
        }
      }
    }

    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const [order] = await db.update(orders)
      .set({ status: status as any, updatedAt })
      .where(eq(orders.id, id))
      .returning();

    if (status === "REJECTED" || status === "CANCELLED") {
      const reservations = await db.select().from(stockReservations).where(eq(stockReservations.orderId, id));
      for (const res of reservations) {
        const [product] = await db.select().from(products).where(eq(products.id, res.productId));
        if (product) {
          await db.update(products)
            .set({ stock: product.stock + res.quantity })
            .where(eq(products.id, res.productId));
        }
      }
      await db.delete(stockReservations).where(eq(stockReservations.orderId, id));
    }

    return order;
  }

  // School Requests
  async getSchoolRequests(userId?: string): Promise<SchoolRequest[]> {
    if (userId) {
      return db.select().from(schoolRequests).where(eq(schoolRequests.userId, userId)).orderBy(desc(schoolRequests.createdAt));
    }
    return db.select().from(schoolRequests).orderBy(desc(schoolRequests.createdAt));
  }

  async getSchoolRequest(id: string): Promise<SchoolRequest | undefined> {
    const [request] = await db.select().from(schoolRequests).where(eq(schoolRequests.id, id));
    return request;
  }

  async createSchoolRequest(data: InsertSchoolRequest): Promise<SchoolRequest> {
    const [request] = await db.insert(schoolRequests).values(data).returning();
    return request;
  }

  async updateSchoolRequest(id: string, data: Partial<SchoolRequest>): Promise<SchoolRequest | undefined> {
    // Convert Date to ISO string for SQLite compatibility
    const updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const [request] = await db.update(schoolRequests)
      .set({ ...data, updatedAt })
      .where(eq(schoolRequests.id, id))
      .returning();
    return request;
  }

  // User Profiles
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile;
  }

  async upsertUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db
      .insert(userProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: data,
      })
      .returning();
    return profile;
  }

  // Stats
  async getAdminStats() {
    const allProducts = await db.select().from(products);
    const allKits = await db.select().from(kits);
    const lowStock = await this.getLowStockProducts();
    const pendingOrdersList = await db.select().from(orders).where(eq(orders.status, "SUBMITTED"));
    const pendingRequestsList = await db.select().from(schoolRequests).where(eq(schoolRequests.status, "PENDING"));

    const totalStock = allProducts.reduce((sum, p) => sum + p.stock, 0);

    return {
      totalProducts: allProducts.length,
      totalKits: allKits.length,
      lowStockCount: lowStock.length,
      pendingOrders: pendingOrdersList.length,
      pendingRequests: pendingRequestsList.length,
      totalStock,
    };
  }
}

export const storage = new DatabaseStorage();
