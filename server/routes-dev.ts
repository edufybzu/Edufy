import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

// Mock auth for local development
const mockUser = {
  claims: {
    sub: "local-admin",
    email: "admin@local.dev",
    first_name: "Local",
    last_name: "Admin"
  }
};

const getUserId = (req: Request): string => {
  // For local development, always return mock user ID
  if (process.env.NODE_ENV === "development") {
    return "local-admin";
  }
  return req.user?.claims?.sub || "";
};

// Mock middleware for local development
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "development") {
    req.user = mockUser;
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // For local development, always allow admin access
  if (process.env.NODE_ENV === "development") {
    return next();
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
  
  // For local development, always allow access
  if (process.env.NODE_ENV === "development") {
    return next();
  }
  
  const profile = await storage.getUserProfile(userId);
  if (!profile || (profile.role !== "NGO" && profile.role !== "ADMIN")) {
    return res.status(403).json({ message: "NGO access required" });
  }
  
  next();
};

// Session storage for development (must be before routes)
const sessions: Map<string, any> = new Map();

export async function registerRoutes(server: Server, app: Express) {
  
  // Apply mock auth middleware for local development
  app.use(mockAuth);
  
  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Auth endpoints for development
  app.get("/api/login", (_req, res) => {
    res.json({ loginUrl: "/login" });
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, role, orgName } = req.body;
      
      // For development, accept any login
      const userId = `user-${Date.now()}`;
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create or update user profile
      try {
        await storage.upsertUserProfile({
          id: userId,
          role: role || "NGO",
          orgName: orgName || null,
          phone: null,
          address: null,
        });
      } catch (e) {
        // Profile might already exist
      }
      
      const user = {
        id: userId,
        email: email,
        firstName: role === "ADMIN" ? "Admin" : orgName || "User",
        lastName: "",
        profileImageUrl: null,
        role: role || "NGO",
        orgName: orgName || null,
      };
      
      // Store user in session
      sessions.set(sessionId, user);
      
      // Set session cookie
      res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly`);
      
      return res.json(user);
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    // Check if there's a logged in user in session
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    if (sessionId && sessions.has(sessionId)) {
      return res.json(sessions.get(sessionId));
    }
    // No user logged in
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.get("/api/logout", (req, res) => {
    // Clear session
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    // Clear cookie and redirect to login
    res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Max-Age=0');
    res.redirect("/login");
  });

  app.post("/api/logout", (req, res) => {
    // Clear session
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Max-Age=0');
    res.json({ success: true });
  });

  // Categories
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      return res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(id, req.body);
      return res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Products
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const products = await storage.getProducts();
      return res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      return res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      return res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(id, req.body);
      return res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      return res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      return res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Kits
  app.get("/api/kits", async (req: Request, res: Response) => {
    try {
      const kits = await storage.getKits();
      return res.json(kits);
    } catch (error) {
      console.error("Error fetching kits:", error);
      return res.status(500).json({ message: "Failed to fetch kits" });
    }
  });

  app.post("/api/kits", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { items, ...kitData } = req.body;
      const data = insertKitSchema.parse(kitData);
      
      // Transform items for storage
      const kitItems = (items || []).map((item: any) => ({
        productId: item.productId,
        qtyPerKit: item.qtyPerKit || 1,
      }));
      
      const kit = await storage.createKit(data, kitItems);
      return res.json(kit);
    } catch (error) {
      console.error("Error creating kit:", error);
      return res.status(500).json({ message: "Failed to create kit" });
    }
  });

  app.patch("/api/kits/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items, ...kitData } = req.body;
      
      // Transform items for storage
      const kitItems = items ? (items || []).map((item: any) => ({
        productId: item.productId,
        qtyPerKit: item.qtyPerKit || 1,
      })) : undefined;
      
      const kit = await storage.updateKit(id, kitData, kitItems);
      return res.json(kit);
    } catch (error) {
      console.error("Error updating kit:", error);
      return res.status(500).json({ message: "Failed to update kit" });
    }
  });

  app.delete("/api/kits/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteKit(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting kit:", error);
      return res.status(500).json({ message: "Failed to delete kit" });
    }
  });

  // Orders
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      return res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { address, notes, items = [] } = req.body;

      const orderItems = items.map((item: any) => ({
        productId: item.type === "product" ? item.id : null,
        kitId: item.type === "kit" ? item.id : null,
        quantity: item.quantity,
      }));

      const order = await storage.createOrder(
        { userId, address, notes, status: "SUBMITTED" },
        orderItems
      );
      return res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({ message: "Failed to create order" });
    }
  });

  // School Requests
  app.get("/api/school-requests", async (req: Request, res: Response) => {
    try {
      const requests = await storage.getSchoolRequests();
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching school requests:", error);
      return res.status(500).json({ message: "Failed to fetch school requests" });
    }
  });

  app.post("/api/school-requests", requireNGO, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const data = insertSchoolRequestSchema.parse({
        ...req.body,
        userId,
        status: "PENDING",
      });
      const request = await storage.createSchoolRequest(data);
      return res.json(request);
    } catch (error) {
      console.error("Error creating school request:", error);
      return res.status(500).json({ message: "Failed to create school request" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    try {
      const [products, categories, orders, kits] = await Promise.all([
        storage.getProducts(),
        storage.getCategories(),
        storage.getOrders(),
        storage.getKits()
      ]);
      
      return res.json({
        totalProducts: products.length,
        totalCategories: categories.length,
        totalOrders: orders.length,
        totalKits: kits.length,
        pendingOrders: orders.filter((o: any) => o.status === 'SUBMITTED').length
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/orders/recent", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      return res.json(orders.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      return res.status(500).json({ message: "Failed to fetch recent orders" });
    }
  });

  app.get("/api/admin/products/low-stock", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getLowStockProducts();
      return res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      return res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  // Admin Orders endpoint
  app.get("/api/admin/orders", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      return res.json(orders);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Update order status
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await storage.updateOrderStatus(id, status);
      return res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      return res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Admin Requests endpoint
  app.get("/api/admin/requests", async (_req: Request, res: Response) => {
    try {
      const requests = await storage.getSchoolRequests();
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching admin requests:", error);
      return res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.patch("/api/admin/requests/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const request = await storage.updateSchoolRequest(id, { status, adminNotes });
      return res.json(request);
    } catch (error) {
      console.error("Error updating request status:", error);
      return res.status(500).json({ message: "Failed to update request status" });
    }
  });

  // NGO Kit Requests
  app.post("/api/ngo/kit-requests", async (req: Request, res: Response) => {
    try {
      const { kitName, description, targetStudents, region, schoolName, additionalNotes, selectedProducts } = req.body;
      const userId = getUserId(req);
      
      const request = await storage.createSchoolRequest({
        userId: userId,
        schoolName: schoolName,
        region: region,
        studentsCount: targetStudents || 0,
        requestedKitDesc: JSON.stringify({
          kitName,
          description,
          additionalNotes,
          selectedProducts,
        }),
        status: "PENDING",
        notes: additionalNotes,
      });
      
      return res.json(request);
    } catch (error) {
      console.error("Error creating kit request:", error);
      return res.status(500).json({ message: "Failed to create kit request" });
    }
  });

  // Custom Kit Request - NGO requests a specialized kit
  app.post("/api/ngo/custom-kit-requests", async (req: Request, res: Response) => {
    try {
      const { 
        schoolName, 
        region, 
        targetStudents, 
        gradeLevel, 
        subject, 
        description, 
        specificItems, 
        urgency 
      } = req.body;
      const userId = getUserId(req);
      
      // Create an order for custom kit request
      const customKitNotes = JSON.stringify({
        type: "CUSTOM_KIT_REQUEST",
        schoolName,
        region,
        targetStudents: targetStudents || 0,
        gradeLevel,
        subject,
        description,
        specificItems,
        urgency: urgency || 'normal',
      });

      const order = await storage.createOrder(
        { 
          userId, 
          address: `${schoolName}, ${region}`, 
          notes: customKitNotes, 
          status: "SUBMITTED" 
        },
        [] // No specific items yet - manager will create the kit
      );
      
      return res.json(order);
    } catch (error) {
      console.error("Error creating custom kit request:", error);
      return res.status(500).json({ message: "Failed to create custom kit request" });
    }
  });

  app.get("/api/ngo/kit-requests", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const requests = await storage.getSchoolRequests();
      // Filter by user in production
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching kit requests:", error);
      return res.status(500).json({ message: "Failed to fetch kit requests" });
    }
  });

  // Mock data endpoints for development
  if (process.env.NODE_ENV === "development") {
    app.get("/api/seed", async (_req: Request, res: Response) => {
      try {
        // Create sample categories
        const categories = [
          { name: "Educational Supplies", description: "Books, stationery, and learning materials" },
          { name: "Technology", description: "Computers, tablets, and tech equipment" },
          { name: "Sports Equipment", description: "Sports and physical education materials" }
        ];
        
        for (const cat of categories) {
          try {
            await storage.createCategory(cat);
          } catch (e) {
            // Category might already exist
          }
        }
        
        res.json({ message: "Sample data created" });
      } catch (error) {
        console.error("Error seeding data:", error);
        res.status(500).json({ message: "Failed to seed data" });
      }
    });
  }
}
