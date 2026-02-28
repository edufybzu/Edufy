import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import {
  insertCategorySchema,
  insertProductSchema,
  insertKitSchema,
  insertSchoolRequestSchema,
} from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      claims?: {
        sub: string;
        email?: string;
        first_name?: string;
        last_name?: string;
      };
    }
  }
}

const getUserId = (req: Request): string => {
  return req.user?.claims?.sub || "";
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const profile = await storage.getUserProfile(userId);
  if (!profile || profile.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};

const requireNGO = async (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const profile = await storage.getUserProfile(userId);
  if (!profile || profile.role !== "NGO") {
    return res.status(403).json({ message: "NGO access required" });
  }
  
  next();
};

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];

async function seedDatabase() {
  const existingCategories = await storage.getCategories();
  if (existingCategories.length > 0) return;

  console.log("Seeding database...");

  const cats = [
    { name: "North Region", regionCode: "NORTH", description: "Schools in northern provinces" },
    { name: "South Region", regionCode: "SOUTH", description: "Schools in southern provinces" },
    { name: "Urban Schools", regionCode: "URBAN", description: "City-based educational institutions" },
    { name: "Rural Camps", regionCode: "CAMP", description: "Mobile camp schools in remote areas" },
  ];

  const createdCats = [];
  for (const cat of cats) {
    const created = await storage.createCategory(cat);
    createdCats.push(created);
  }

  const prods = [
    { name: "Notebooks (Pack of 10)", description: "Quality lined notebooks for students", categoryId: createdCats[0].id, unit: "pack" as const, stock: 150, lowStock: 20, imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400" },
    { name: "Pencils (Box of 12)", description: "HB graphite pencils for writing", categoryId: createdCats[0].id, unit: "box" as const, stock: 200, lowStock: 30, imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400" },
    { name: "Erasers (Pack of 5)", description: "Soft rubber erasers", categoryId: createdCats[0].id, unit: "pack" as const, stock: 180, lowStock: 25, imageUrl: "https://images.unsplash.com/photo-1596138255506-c27c6bcc4f84?w=400" },
    { name: "Rulers (30cm)", description: "Transparent plastic rulers", categoryId: createdCats[1].id, unit: "piece" as const, stock: 120, lowStock: 15, imageUrl: "https://images.unsplash.com/photo-1551817958-11e0f7bbea43?w=400" },
    { name: "Colored Pencils Set", description: "12 vibrant colored pencils", categoryId: createdCats[1].id, unit: "box" as const, stock: 80, lowStock: 10, imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400" },
    { name: "Geometry Set", description: "Complete geometry tools kit", categoryId: createdCats[2].id, unit: "piece" as const, stock: 60, lowStock: 8, imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400" },
    { name: "Crayons (24 colors)", description: "Non-toxic wax crayons", categoryId: createdCats[2].id, unit: "box" as const, stock: 100, lowStock: 12, imageUrl: "https://images.unsplash.com/photo-1499892477393-f675706cbe6e?w=400" },
    { name: "School Bag", description: "Durable backpack for students", categoryId: createdCats[3].id, unit: "piece" as const, stock: 45, lowStock: 10, imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" },
    { name: "Water Bottle", description: "500ml BPA-free water bottle", categoryId: createdCats[3].id, unit: "piece" as const, stock: 70, lowStock: 15, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400" },
    { name: "Sharpener (Metal)", description: "Durable metal sharpener", categoryId: createdCats[0].id, unit: "piece" as const, stock: 250, lowStock: 40, imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400" },
  ];

  const createdProds = [];
  for (const prod of prods) {
    const created = await storage.createProduct(prod);
    createdProds.push(created);
  }

  const kitData = [
    {
      kit: { name: "Basic Primary Kit", description: "Essential supplies for primary school students", categoryId: createdCats[0].id, imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400" },
      items: [
        { productId: createdProds[0].id, qtyPerKit: 1 },
        { productId: createdProds[1].id, qtyPerKit: 1 },
        { productId: createdProds[2].id, qtyPerKit: 1 },
        { productId: createdProds[9].id, qtyPerKit: 1 },
      ],
    },
    {
      kit: { name: "Complete Student Kit", description: "Comprehensive kit with all essential supplies", categoryId: createdCats[1].id, imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400" },
      items: [
        { productId: createdProds[0].id, qtyPerKit: 2 },
        { productId: createdProds[1].id, qtyPerKit: 2 },
        { productId: createdProds[2].id, qtyPerKit: 2 },
        { productId: createdProds[3].id, qtyPerKit: 1 },
        { productId: createdProds[4].id, qtyPerKit: 1 },
        { productId: createdProds[5].id, qtyPerKit: 1 },
      ],
    },
    {
      kit: { name: "Art & Creativity Kit", description: "Art supplies for creative learning", categoryId: createdCats[2].id, imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400" },
      items: [
        { productId: createdProds[4].id, qtyPerKit: 2 },
        { productId: createdProds[6].id, qtyPerKit: 2 },
        { productId: createdProds[0].id, qtyPerKit: 1 },
      ],
    },
    {
      kit: { name: "Camp Mobile Kit", description: "Portable kit for mobile camp schools", categoryId: createdCats[3].id, imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400" },
      items: [
        { productId: createdProds[7].id, qtyPerKit: 1 },
        { productId: createdProds[8].id, qtyPerKit: 1 },
        { productId: createdProds[0].id, qtyPerKit: 1 },
        { productId: createdProds[1].id, qtyPerKit: 1 },
        { productId: createdProds[2].id, qtyPerKit: 1 },
      ],
    },
  ];

  for (const { kit, items } of kitData) {
    await storage.createKit(kit, items);
  }

  console.log("Database seeded successfully!");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  //await setupAuth(app);
  //registerAuthRoutes(app);

  seedDatabase().catch(console.error);

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const userEmail = req.user?.claims?.email?.toLowerCase() || "";
      let profile = await storage.getUserProfile(userId);
      
      const isAdmin = ADMIN_EMAILS.includes(userEmail) || userEmail.includes("admin");
      
      if (!profile) {
        profile = await storage.upsertUserProfile({
          id: userId,
          role: isAdmin ? "ADMIN" : "NGO",
          orgName: isAdmin ? "Warehouse Admin" : (req.user?.claims?.email?.split("@")[0] || "NGO Organization"),
        });
      } else if (isAdmin && profile.role !== "ADMIN") {
        profile = await storage.upsertUserProfile({
          id: userId,
          role: "ADMIN",
          orgName: "Warehouse Admin",
        });
      }

      res.json({
        id: userId,
        email: req.user?.claims?.email,
        firstName: req.user?.claims?.first_name,
        lastName: req.user?.claims?.last_name,
        profileImageUrl: null,
        role: profile.role,
        orgName: profile.orgName,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Categories (public read, admin write)
  app.get("/api/categories", async (req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Products (public read, admin write)
  app.get("/api/products", async (req, res) => {
    try {
      const prods = await storage.getProducts();
      res.json(prods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Kits (public read, admin write)
  app.get("/api/kits", async (req, res) => {
    try {
      const allKits = await storage.getKits();
      res.json(allKits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch kits" });
    }
  });

  app.post("/api/kits", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { items, ...kitData } = req.body;
      const data = insertKitSchema.parse(kitData);
      const kit = await storage.createKit(data, items || []);
      res.status(201).json(kit);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.patch("/api/kits/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { items, ...kitData } = req.body;
      const kit = await storage.updateKit(req.params.id, kitData, items);
      if (!kit) return res.status(404).json({ message: "Kit not found" });
      res.json(kit);
    } catch (error) {
      res.status(400).json({ message: "Failed to update kit" });
    }
  });

  app.delete("/api/kits/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteKit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete kit" });
    }
  });

  // Orders (NGO creates, Admin manages)
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      
      const ordersList = profile?.role === "ADMIN"
        ? await storage.getOrders()
        : await storage.getOrders(userId);
      
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { address, notes, items } = req.body;

      const orderItems = items.map((item: any) => ({
        productId: item.type === "product" ? item.id : null,
        kitId: item.type === "kit" ? item.id : null,
        quantity: item.quantity,
      }));

      const order = await storage.createOrder(
        { userId, address, notes, status: "SUBMITTED" },
        orderItems
      );

      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(400).json({ message: "Failed to create order" });
    }
  });

  // Admin order endpoints
  app.get("/api/admin/orders", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const ordersList = await storage.getOrders();
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/orders/recent", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const ordersList = await storage.getOrders();
      res.json(ordersList.slice(0, 5));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/orders/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to update order status" });
    }
  });

  // School Requests
  app.get("/api/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const requests = await storage.getSchoolRequests(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.post("/api/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertSchoolRequestSchema.parse({ ...req.body, userId, status: "PENDING" });
      const request = await storage.createSchoolRequest(data);
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Admin request endpoints
  app.get("/api/admin/requests", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getSchoolRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.patch("/api/admin/requests/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const request = await storage.updateSchoolRequest(req.params.id, { status, adminNotes });
      if (!request) return res.status(404).json({ message: "Request not found" });
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: "Failed to update request" });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/products/low-stock", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const prods = await storage.getLowStockProducts();
      res.json(prods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  return httpServer;
}
