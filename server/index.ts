import path from "path";
import express, { Request, Response, NextFunction } from "express";
import { IStorage, MemStorage } from "./storage";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { hashPassword } from "./utils";

export const storage = new MemStorage();

// Create an Express app
const app = express();

// Parse JSON requests
app.use(express.json());

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Add CORS headers to ensure client-server communication works
app.use((req, res, next) => {
  // Allow all origins in development mode for easier testing
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Logging middleware
app.use((req, res, next) => {
  // Log requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - User: ${req.user ? req.user.username : 'Not authenticated'}`);
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Start authentication
setupAuth(app);

// Set up API routes
let server;

async function bootstrap() {
  server = await registerRoutes(app);
  
  // Add global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging but don't throw it after response is sent
    console.error(`Error: ${message}`, err);
    res.status(status).json({ message });
  });
  
  // Serve the Vite development server in development mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve static assets in production
    serveStatic(app);
  }
  
  // Create some initial seed data
  await createSeedData();
  
  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "127.0.0.1", // or "localhost"
  }, () => {
    log(`serving on port ${port}`);
  });
}

// Create seed data with sample users
async function createSeedData() {
  try {
    // Only create seed data if we don't have any users yet
    const users = Array.from(storage.users.values());
    if (users.length === 0) {
      console.log('Creating seed data...');
      
      // Create admin user
      const adminPassword = await hashPassword('admin123');
      await storage.createUser({
        username: 'admin',
        password: adminPassword,
        displayName: 'Admin User',
        email: 'admin@studysphere.edu',
        institution: 'StudySphere University',
        department: 'Computer Science',
        yearOfStudy: 4,
        bio: 'Administrator of the StudySphere platform',
        profilePicture: 'https://ui-avatars.com/api/?name=Admin&background=random'
      });
      
      // Create sample users
      const departments = [
        'Computer Science', 
        'Biology', 
        'Mathematics', 
        'Physics', 
        'Chemistry', 
        'Psychology',
        'Business Administration', 
        'Engineering'
      ];
      
      // Create 15 sample users
      for (let i = 1; i <= 15; i++) {
        const username = `user${i}`;
        const password = await hashPassword('password123');
        const department = departments[Math.floor(Math.random() * departments.length)];
        const yearOfStudy = Math.floor(Math.random() * 4) + 1;
        
        await storage.createUser({
          username,
          password,
          displayName: `Test User ${i}`,
          email: `${username}@studysphere.edu`,
          institution: 'StudySphere University',
          department,
          yearOfStudy,
          bio: `I'm a student in the ${department} department, year ${yearOfStudy}.`,
          profilePicture: `https://ui-avatars.com/api/?name=${username}&background=random`
        });
      }
      
      console.log('Seed data created successfully!');
    }
  } catch (error) {
    console.error('Error creating seed data:', error);
  }
}

bootstrap().catch(err => {
  console.error("Failed to start server:", err);
});

export { app, server };
