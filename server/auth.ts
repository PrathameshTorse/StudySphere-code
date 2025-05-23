import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { hashPassword, comparePassword } from "./utils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studysphere-secret",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to false to work in development without HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    }
  };

  console.log("Setting up auth with session config:", {
    secret: sessionSettings.secret ? "****" : "Not set",
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized,
    cookie: sessionSettings.cookie
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Add debug middleware to check session and authentication status
  app.use((req, res, next) => {
    console.log(`Session ID: ${req.sessionID}, Authenticated: ${req.isAuthenticated()}`);
    if (req.isAuthenticated()) {
      console.log(`Authenticated User: ${req.user.username} (ID: ${req.user.id})`);
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Trying to authenticate user: ${username}`);
        
        // Find the user
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        // Check if user is banned
        if (user.isBanned) {
          console.log(`Login blocked: User ${username} is banned. Reason: ${user.banReason}`);
          return done(null, false, { message: `Account is banned. Reason: ${user.banReason}` });
        }

        // Verify password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log(`Authentication successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error(`Authentication error for user ${username}:`, error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.username} (ID: ${user.id})`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found for ID: ${id}`);
        return done(null, false);
      }
      console.log(`Deserialized user: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error(`Deserialization error for user ID ${id}:`, error);
      done(error);
    }
  });

  // Add API routes for authentication
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`Registration attempt for username: ${req.body.username}, email: ${req.body.email}`);
      
      // Check if username exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Registration failed: Username ${req.body.username} already exists`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        console.log(`Registration failed: Email ${req.body.email} already exists`);
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log(`Password hashed successfully`);

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      console.log(`User created with ID: ${user.id}`);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      // Login user after registration
      req.login(user, (err) => {
        if (err) {
          console.error(`Login after registration failed: ${err.message}`);
          return next(err);
        }
        console.log(`User ${user.username} logged in after registration`);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error(`Registration error: ${error.message}`);
      next(error);
    }
  });

  // Add API endpoint for logging in
  app.post("/api/login", (req, res, next) => {
    console.log(`Login request received for username: ${req.body.username}`);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error(`Login error: ${err.message}`);
        return next(err);
      }
      
      if (!user) {
        console.log(`Login failed: ${info?.message || "Invalid credentials"}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error(`Session error: ${err.message}`);
          return next(err);
        }
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        console.log(`Login successful for user: ${user.username} (ID: ${user.id})`);
        return res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  // Add API endpoint for logging out
  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    console.log(`Logout request received for user: ${username || "Unknown"}`);
    
    req.logout(function(err) {
      if (err) {
        console.error(`Logout error: ${err.message}`);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      console.log(`Logout successful for user: ${username || "Unknown"}`);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Add API endpoint for checking current user
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      // Remove password from response
      const userResponse = { ...req.user };
      delete userResponse.password;
      
      console.log(`Current user check: ${req.user.username} (ID: ${req.user.id})`);
      return res.json(userResponse);
    }
    
    console.log("Current user check: Not authenticated");
    res.status(401).json({ message: "Not authenticated" });
  });
}
