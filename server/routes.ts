import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertPaperSchema, insertDiscussionPostSchema, insertDiscussionReplySchema, insertResourceSchema, insertStudyGroupSchema, insertStudyGroupMemberSchema, insertStudySessionSchema, insertActivitySchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import passport from "passport";
import { hashPassword } from "./utils";
import { Request, Response, NextFunction } from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, and PNG files are allowed.'));
    }
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log("Authentication check:", 
    req.isAuthenticated(), 
    "Session ID:", req.sessionID,
    "User:", req.user ? `ID: ${req.user.id}, Username: ${req.user.username}` : "No user"
  );
  
  if (req.isAuthenticated() && req.user) {
    // Check if user is banned
    if (req.user.isBanned) {
      console.log(`Access denied: User ${req.user.username} is banned. Reason: ${req.user.banReason}`);
      return res.status(403).json({ 
        message: `Account is banned. Reason: ${req.user.banReason}`,
        isBanned: true
      });
    }
    return next();
  }
  res.status(401).send('You must be logged in to access this resource');
}

// Admin middleware
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes and middleware
  setupAuth(app);

  // Serve uploaded files and theme.json
  app.use('/uploads', express.static(uploadsDir));
  app.get('/theme.json', (req, res) => {
    try {
      const themePath = path.join(process.cwd(), 'theme.json');
      if (fs.existsSync(themePath)) {
        res.sendFile(themePath);
      } else {
        // Default theme if file doesn't exist
        res.json({
          variant: 'professional',
          primary: 'hsl(222.2 47.4% 11.2%)',
          appearance: 'light',
          radius: 0.5
        });
      }
    } catch (error) {
      console.error('Error serving theme.json:', error);
      res.status(500).send('Error loading theme');
    }
  });

  // Past Papers API
  app.post('/api/papers', isAuthenticated, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }

      // Parse and validate the paper data
      const paperData = insertPaperSchema.parse({
        ...req.body,
        fileUrl: `/uploads/${req.file.filename}`,
        uploaderId: req.user.id
      });

      const newPaper = await storage.createPaper(paperData);

      // Create an activity entry for this upload
      await storage.createActivity({
        userId: req.user.id,
        type: 'paper_upload',
        targetId: newPaper.id,
        targetType: 'paper',
        metadata: { title: newPaper.title }
      });

      res.status(201).json(newPaper);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/papers', async (req, res, next) => {
    try {
      const { course, year, institution } = req.query;
      const filters: any = {};
      
      if (course) filters.course = course;
      if (year) filters.year = year;
      if (institution) filters.institution = institution;
      
      const papers = await storage.getPapers(Object.keys(filters).length > 0 ? filters : undefined);
      
      // Add uploader names to papers
      const papersWithUploaderNames = await Promise.all(papers.map(async (paper) => {
        const uploader = await storage.getUser(paper.uploaderId);
        return {
          ...paper,
          uploaderName: uploader ? uploader.username : "Anonymous"
        };
      }));
      
      res.json(papersWithUploaderNames);
    } catch (error) {
      next(error);
    }
  });

  // New endpoint to get current user's papers
  app.get('/api/papers/my-papers', isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const papers = await storage.getPapers({ uploaderId: userId });
      
      // Add uploader names
      const papersWithUploaderNames = await Promise.all(papers.map(async (paper) => {
        const uploader = await storage.getUser(paper.uploaderId);
        return {
          ...paper,
          uploaderName: uploader ? uploader.username : "Anonymous",
          // Add views for my-papers page
          views: 0 // placeholder, could be implemented fully later
        };
      }));
      
      res.json(papersWithUploaderNames);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/papers/:id', async (req, res, next) => {
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.getPaper(paperId);
      
      if (!paper) {
        return res.status(404).send('Paper not found');
      }
      
      // Add uploader name
      const uploader = await storage.getUser(paper.uploaderId);
      const paperWithUploaderName = {
        ...paper,
        uploaderName: uploader ? uploader.username : "Anonymous"
      };
      
      res.json(paperWithUploaderName);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/papers/:id/download', async (req, res, next) => {
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.incrementPaperDownloads(paperId);
      
      if (!paper) {
        return res.status(404).send('Paper not found');
      }
      
      res.json(paper);
    } catch (error) {
      next(error);
    }
  });

  // Discussion Forum API
  app.post('/api/discussions', isAuthenticated, async (req, res, next) => {
    try {
      const postData = insertDiscussionPostSchema.parse({
        ...req.body,
        authorId: req.user.id
      });

      const newPost = await storage.createDiscussionPost(postData);

      // Create an activity entry for this post
      await storage.createActivity({
        userId: req.user.id,
        type: 'post_created',
        targetId: newPost.id,
        targetType: 'discussion_post',
        metadata: { title: newPost.title }
      });

      res.status(201).json(newPost);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/discussions', async (req, res, next) => {
    try {
      // Removed filtering as storage.getDiscussionPosts does not support it
      const posts = await storage.getDiscussionPosts();
      res.json(posts);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/discussions/:id', isAuthenticated, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      // Check if postId is a valid number
      if (isNaN(postId)) {
        console.error(`Invalid discussion post ID received: ${req.params.id}`);
        return res.status(400).json({ message: 'Invalid discussion post ID' });
      }
      
      const post = await storage.getDiscussionPost(postId);
      
      if (!post) {
        console.warn(`Discussion post with ID ${postId} not found.`);
        return res.status(404).json({ message: 'Discussion post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error fetching discussion post:', error);
      // Explicitly send JSON error response for any caught error
      const statusCode = (error as any).status || 500; // Use status if available, default to 500
      const message = (error as any).message || 'An error occurred while fetching discussion post';
      res.status(statusCode).json({ message });
    }
  });

  app.post('/api/discussions/:id/replies', isAuthenticated, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getDiscussionPost(postId);
      
      if (!post) {
        return res.status(404).send('Discussion post not found');
      }
      
      const replyData = insertDiscussionReplySchema.parse({
        ...req.body,
        postId,
        authorId: req.user.id
      });

      const newReply = await storage.createDiscussionReply(replyData);
      res.status(201).json(newReply);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/discussions/:id/replies', async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const replies = await storage.getDiscussionReplies(postId);
      res.json(replies);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/discussions/:id/vote', isAuthenticated, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const { value } = req.body;
      
      if (value !== 1 && value !== -1) {
        return res.status(400).send('Vote value must be 1 or -1');
      }
      
      const updatedPost = await storage.voteDiscussionPost(postId, value);
      
      if (!updatedPost) {
        return res.status(404).send('Discussion post not found');
      }
      
      res.json(updatedPost);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/discussions/replies/:id/vote', isAuthenticated, async (req, res, next) => {
    try {
      const replyId = parseInt(req.params.id);
      const { value } = req.body;
      
      if (value !== 1 && value !== -1) {
        return res.status(400).send('Vote value must be 1 or -1');
      }
      
      const updatedReply = await storage.voteDiscussionReply(replyId, value);
      
      if (!updatedReply) {
        return res.status(404).send('Reply not found');
      }
      
      res.json(updatedReply);
    } catch (error) {
      next(error);
    }
  });

  // Study Resources API - Endpoints kept for backwards compatibility but returning 404
  app.post('/api/resources', isAuthenticated, upload.single('file'), async (req, res, next) => {
    try {
      // Forward to papers endpoint
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }

      // Parse and validate the resource data
      const resourceData = insertResourceSchema.parse({
        ...req.body,
        fileUrl: `/uploads/${req.file.filename}`,
        uploaderId: req.user.id
      });

      // Map resource data to paper schema
      const paperData = {
        title: resourceData.title,
        description: resourceData.description || '',
        course: resourceData.course || '',
        year: new Date().getFullYear().toString(),
        institution: resourceData.description || '',
        fileUrl: resourceData.fileUrl,
        uploaderId: resourceData.uploaderId
      };

      const newPaper = await storage.createPaper(paperData);

      // Create an activity entry for this upload
      await storage.createActivity({
        userId: req.user.id,
        type: 'resource_upload',
        targetId: newPaper.id,
        targetType: 'paper',
        metadata: { title: newPaper.title }
      });

      // Add uploader name to response
      const uploader = await storage.getUser(newPaper.uploaderId);
      const result = {
        ...newPaper,
        uploaderName: uploader ? uploader.username : "Anonymous"
      };

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/resources', async (req, res, next) => {
    try {
      // Forward to papers endpoint
      const papers = await storage.getPapers();
      
      // Add uploader names
      const papersWithUploaderNames = await Promise.all(papers.map(async (paper) => {
        const uploader = await storage.getUser(paper.uploaderId);
        return {
          ...paper,
          uploaderName: uploader ? uploader.username : "Anonymous"
        };
      }));
      
      res.json(papersWithUploaderNames);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/resources/:id', async (req, res, next) => {
    try {
      // Forward to papers endpoint
      const paperId = parseInt(req.params.id);
      const paper = await storage.getPaper(paperId);
      
      if (!paper) {
        return res.status(404).send('Resource not found');
      }
      
      // Add uploader name
      const uploader = await storage.getUser(paper.uploaderId);
      const paperWithUploaderName = {
        ...paper,
        uploaderName: uploader ? uploader.username : "Anonymous"
      };
      
      res.json(paperWithUploaderName);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/resources/:id/download', async (req, res, next) => {
    try {
      // Forward to papers endpoint
      const paperId = parseInt(req.params.id);
      const paper = await storage.incrementPaperDownloads(paperId);
      
      if (!paper) {
        return res.status(404).send('Resource not found');
      }
      
      res.json(paper);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/resources/:id/rate', isAuthenticated, async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).send('Resource functionality has been removed');
  });

  // Study Groups API
  app.post('/api/groups', isAuthenticated, async (req, res, next) => {
    try {
      const groupData = insertStudyGroupSchema.parse({
        ...req.body,
        creatorId: req.user.id
      });

      const newGroup = await storage.createStudyGroup(groupData);

      // Add creator as a member and admin of the group
      await storage.addStudyGroupMember({
        groupId: newGroup.id,
        userId: req.user.id,
        isAdmin: true
      });

      // Create an activity entry for this group
      await storage.createActivity({
        userId: req.user.id,
        type: 'group_created',
        targetId: newGroup.id,
        targetType: 'study_group',
        metadata: { name: newGroup.name }
      });

      res.status(201).json(newGroup);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups', async (req, res, next) => {
    try {
      const { course } = req.query;
      const filters: any = {};
      
      if (course) filters.course = course;
      
      const groups = await storage.getStudyGroups(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/groups/:id', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/groups/user/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to see their own groups or administrators
      if (userId !== req.user.id) {
        return res.status(403).send('You are not authorized to view these groups');
      }
      
      const groups = await storage.getUserStudyGroups(userId);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      const memberData = insertStudyGroupMemberSchema.parse({
        ...req.body,
        groupId
      });

      const newMember = await storage.addStudyGroupMember(memberData);

      // Create an activity entry for joining the group
      await storage.createActivity({
        userId: memberData.userId,
        type: 'group_joined',
        targetId: groupId,
        targetType: 'study_group',
        metadata: { name: group.name }
      });

      res.status(201).json(newMember);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups/:id/members', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getStudyGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/groups/:groupId/members/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      // Check if user is removing themselves or is an admin of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const requestingUserMembership = members.find(m => m.userId === req.user.id);
      
      if (userId !== req.user.id && (!requestingUserMembership || !requestingUserMembership.isAdmin)) {
        return res.status(403).send('You are not authorized to remove this member');
      }
      
      const result = await storage.removeStudyGroupMember(groupId, userId);
      
      if (!result) {
        return res.status(404).send('Member not found in group');
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Study Sessions API
  app.post('/api/groups/:id/sessions', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      // Check if user is a member of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const isMember = members.some(m => m.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).send('You must be a member of the group to create a session');
      }
      
      const sessionData = insertStudySessionSchema.parse({
        ...req.body,
        groupId,
        createdBy: req.user.id
      });

      const newSession = await storage.createStudySession(sessionData);

      // Create an activity entry for this session
      await storage.createActivity({
        userId: req.user.id,
        type: 'session_created',
        targetId: newSession.id,
        targetType: 'study_session',
        metadata: { title: newSession.title, groupName: group.name }
      });

      res.status(201).json(newSession);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups/:id/sessions', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const sessions = await storage.getStudySessions(groupId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions/upcoming', isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getUpcomingStudySessions(userId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions', isAuthenticated, async (req, res, next) => {
    try {
      // Get all study sessions from all groups the user is a member of
      const userId = req.user.id;
      const userGroups = await storage.getUserStudyGroups(userId);
      let allSessions = [];
      
      // Gather sessions from all user's groups
      for (const group of userGroups) {
        const groupSessions = await storage.getStudySessions(group.id);
        allSessions = [...allSessions, ...groupSessions];
      }
      
      // Sort by start time (newest first)
      allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      res.json(allSessions);
    } catch (error) {
      next(error);
    }
  });

  // Activity Feed API
  app.get('/api/activities', async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/activities/user/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to see their own activities or administrators
      if (userId !== req.user.id) {
        return res.status(403).send('You are not authorized to view these activities');
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // Theme API endpoint
  app.post('/api/theme', isAuthenticated, async (req, res, next) => {
    try {
      const { primary, variant, appearance, radius } = req.body;
      
      // Basic validation
      if (!primary || !variant || !appearance || typeof radius !== 'number') {
        return res.status(400).json({ error: 'Missing or invalid theme settings' });
      }
      
      // Validate specific enum values
      const validVariants = ['professional', 'tint', 'vibrant'];
      const validAppearances = ['light', 'dark', 'system'];
      
      if (!validVariants.includes(variant)) {
        return res.status(400).json({ error: 'Invalid variant value' });
      }
      
      if (!validAppearances.includes(appearance)) {
        return res.status(400).json({ error: 'Invalid appearance value' });
      }
      
      // Write theme settings to file
      const themeSettings = {
        primary,
        variant,
        appearance,
        radius
      };
      
      fs.writeFileSync(
        path.join(process.cwd(), 'theme.json'), 
        JSON.stringify(themeSettings, null, 2)
      );
      
      res.status(200).json({ success: true, theme: themeSettings });
      
    } catch (error) {
      next(error);
    }
  });

  // Search routes
  app.get("/api/search/papers", async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      
      const papers = await storage.getPapers();
      const results = papers.filter(paper => 
        paper.title.toLowerCase().includes(query.toLowerCase()) ||
        (paper.description && paper.description.toLowerCase().includes(query.toLowerCase())) ||
        (paper.course && paper.course.toLowerCase().includes(query.toLowerCase()))
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/search/resources", async (req, res, next) => {
    console.log("Resource search has been deprecated");
    return res.json([]);
  });
  
  app.get("/api/search/discussions", async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      
      const discussions = await storage.getDiscussionPosts();
      const results = discussions.filter(discussion => 
        discussion.title.toLowerCase().includes(query.toLowerCase()) ||
        discussion.content.toLowerCase().includes(query.toLowerCase()) ||
        (discussion.course && discussion.course.toLowerCase().includes(query.toLowerCase())) ||
        (discussion.tags && discussion.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/login", (req, res, next) => {
    console.log("Login request received:", req.body);
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed: Invalid credentials");
        // Check if this is a direct form submission or API call
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
          return res.redirect('/auth?error=Invalid+credentials');
        }
        return res.status(401).send("Invalid credentials");
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        console.log("Login successful for user:", userResponse.username);
        console.log("Session ID after login:", req.sessionID);
        
        // Check if this is a direct form submission or API call
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
          // Set a cookie manually to make sure it's there
          res.cookie('connect.sid', req.sessionID, {
            path: '/',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
          });
          
          // Use the redirect parameter if provided, otherwise go to home
          return res.redirect(req.body.redirect || '/');
        }
        
        // API response for programmatic calls
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });
  
  // Add a direct login page that doesn't rely on client-side code
  app.get("/direct-login", (req, res) => {
    // Already logged in? Redirect to home
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    
    // Simple HTML login form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>StudySphere - Direct Login</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
          h1 { color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="text"], input[type="password"] { width: 100%; padding: 8px; box-sizing: border-box; }
          button { padding: 10px 15px; background: #4a5568; color: white; border: none; cursor: pointer; }
          .error { color: red; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>StudySphere Direct Login</h1>
        <p>This is a simplified login that bypasses React.</p>
        
        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
        
        <form action="/api/login" method="POST">
          <div class="form-group">
            <label for="username">Username or Email:</label>
            <input type="text" id="username" name="username" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          
          <input type="hidden" name="redirect" value="/">
          
          <button type="submit">Login</button>
        </form>
        
        <p><a href="/">Back to main app</a></p>
      </body>
      </html>
    `);
  });
  
  // Add a direct registration page
  app.get("/direct-register", (req, res) => {
    // Already logged in? Redirect to home
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    
    // Simple HTML registration form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>StudySphere - Direct Registration</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
          h1 { color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="text"], input[type="password"], input[type="email"], input[type="number"] { 
            width: 100%; padding: 8px; box-sizing: border-box; 
          }
          button { padding: 10px 15px; background: #4a5568; color: white; border: none; cursor: pointer; }
          .error { color: red; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>StudySphere Direct Registration</h1>
        <p>This is a simplified registration that bypasses React.</p>
        
        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
        
        <form action="/api/direct-register" method="POST">
          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required>
          </div>
          
          <div class="form-group">
            <label for="displayName">Display Name:</label>
            <input type="text" id="displayName" name="displayName" required>
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required minlength="8">
          </div>
          
          <div class="form-group">
            <label for="institution">Institution:</label>
            <input type="text" id="institution" name="institution" required>
          </div>
          
          <div class="form-group">
            <label for="yearOfStudy">Year of Study:</label>
            <input type="number" id="yearOfStudy" name="yearOfStudy" min="1">
          </div>
          
          <button type="submit">Register</button>
        </form>
        
        <p><a href="/direct-login">Already have an account? Log in</a></p>
        <p><a href="/">Back to main app</a></p>
      </body>
      </html>
    `);
  });
  
  // Unified search endpoint
  app.get("/api/search", async (req, res, next) => {
    try {
      const query = req.query.query as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Normalize the query for case-insensitive search
      const normalizedQuery = query.toLowerCase();
      
      // Get results from different sources in parallel
      const [papers, discussions, groups, sessions] = await Promise.all([
        storage.searchPapers(normalizedQuery, limit),
        storage.searchDiscussions(normalizedQuery, limit),
        storage.searchGroups(normalizedQuery, limit),
        storage.searchSessions(normalizedQuery, limit)
      ]);
      
      // Format results for the client
      const formattedPapers = papers.map(paper => ({
        id: paper.id,
        title: paper.title,
        type: 'paper',
        url: `/papers?id=${paper.id}`
      }));
      
      const formattedDiscussions = discussions.map(discussion => ({
        id: discussion.id,
        title: discussion.title,
        type: 'discussion',
        url: `/discussions?id=${discussion.id}`
      }));
      
      const formattedGroups = groups.map(group => ({
        id: group.id,
        title: group.name,
        type: 'group',
        url: `/groups/${group.id}`
      }));
      
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        title: session.title,
        type: 'session',
        url: `/sessions?id=${session.id}`
      }));
      
      // Combine all results and sort by relevance (for now, just combining them)
      // In a more advanced implementation, we'd apply relevance scoring
      const allResults = [
        ...formattedPapers,
        ...formattedDiscussions,
        ...formattedGroups,
        ...formattedSessions
      ].slice(0, limit);
      
      res.json(allResults);
    } catch (error) {
      next(error);
    }
  });
  
  // Add a direct registration handler
  app.post("/api/direct-register", async (req, res, next) => {
    try {
      // Check if username exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.redirect('/direct-register?error=Username+already+exists');
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.redirect('/direct-register?error=Email+already+exists');
      }

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Login user after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Set a cookie manually to make sure it's there
        res.cookie('connect.sid', req.sessionID, {
          path: '/',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.redirect('/');
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.redirect('/direct-register?error=Registration+failed');
    }
  });

  // Study group chat messages
  app.post('/api/groups/:id/chat', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).send('Message is required');
      }
      
      const group = await storage.getStudyGroup(groupId);
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      // Check if user is a member of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const isMember = members.some(m => m.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).send('You must be a member of the group to send messages');
      }
      
      const chatMessage = await storage.createGroupChatMessage({
        groupId,
        userId: req.user.id,
        message,
        timestamp: new Date()
      });
      
      res.status(201).json(chatMessage);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/groups/:id/chat', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const group = await storage.getStudyGroup(groupId);
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      // Check if user is a member of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const isMember = members.some(m => m.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).send('You must be a member of the group to view messages');
      }
      
      const messages = await storage.getGroupChatMessages(groupId, limit);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  // User profile update
  app.put('/api/user/profile', isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { displayName, email, bio, yearOfStudy, institution, department } = req.body;
      
      // Validate email is not already taken by another user
      if (email) {
        const existingUserWithEmail = await storage.getUserByEmail(email);
        if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
          return res.status(400).send('Email is already in use by another account');
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        displayName,
        email,
        bio,
        yearOfStudy: yearOfStudy ? parseInt(yearOfStudy) : undefined,
        institution,
        department,
      });
      
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Friend request endpoints
  app.post('/api/friend-requests', isAuthenticated, async (req, res, next) => {
    try {
      const { recipientId } = req.body;
      
      if (!recipientId) {
        return res.status(400).send('Recipient ID is required');
      }
      
      // Check if the recipient exists
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).send('Recipient user not found');
      }
      
      // Check if friend request already exists
      const existingRequest = await storage.getFriendRequest(req.user.id, recipientId);
      if (existingRequest) {
        return res.status(400).send('Friend request already exists');
      }
      
      // Check if they are already friends
      const existingFriendship = await storage.checkFriendship(req.user.id, recipientId);
      if (existingFriendship) {
        return res.status(400).send('Users are already friends');
      }
      
      // Create the friend request
      const friendRequest = await storage.createFriendRequest({
        senderId: req.user.id,
        receiverId: recipientId,
        status: 'pending',
        createdAt: new Date()
      });
      
      res.status(201).json(friendRequest);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/friend-requests', isAuthenticated, async (req, res, next) => {
    try {
      const requests = await storage.getFriendRequests(req.user.id);
      res.json(requests);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/friend-requests/:id/accept', isAuthenticated, async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id);
      
      // Get the friend request
      const request = await storage.getFriendRequestById(requestId);
      if (!request) {
        return res.status(404).send('Friend request not found');
      }
      
      // Check if the current user is the recipient
      if (request.receiverId !== req.user.id) {
        return res.status(403).send('Not authorized to accept this request');
      }
      
      // Accept the request
      const updatedRequest = await storage.updateFriendRequestStatus(requestId, 'accepted');
      
      // Create friendship connection
      await storage.createFriendship(request.senderId, request.receiverId);
      
      res.json(updatedRequest);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/friend-requests/:id/reject', isAuthenticated, async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id);
      
      // Get the friend request
      const request = await storage.getFriendRequestById(requestId);
      if (!request) {
        return res.status(404).send('Friend request not found');
      }
      
      // Check if the current user is the recipient
      if (request.receiverId !== req.user.id) {
        return res.status(403).send('Not authorized to reject this request');
      }
      
      // Reject the request
      const updatedRequest = await storage.updateFriendRequestStatus(requestId, 'rejected');
      
      res.json(updatedRequest);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/friends', isAuthenticated, async (req, res, next) => {
    try {
      const friends = await storage.getFriends(req.user.id);
      res.json(friends);
    } catch (error) {
      next(error);
    }
  });

  // User search and recommendations
  app.get('/api/users/search', isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Get all users except the current user
      const allUsers = Array.from(storage.users.values())
        .filter(u => u.id !== req.user.id)
        .filter(u => 
          u.username.toLowerCase().includes(query.toLowerCase()) || 
          u.displayName.toLowerCase().includes(query.toLowerCase()) ||
          (u.department && u.department.toLowerCase().includes(query.toLowerCase()))
        )
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          profilePicture: u.profilePicture,
          department: u.department,
          yearOfStudy: u.yearOfStudy,
          institution: u.institution
        }));
      
      res.json(allUsers);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/users/recommended', isAuthenticated, async (req, res, next) => {
    try {
      // Get current user
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get existing friends to exclude them
      const friends = await storage.getFriends(currentUser.id);
      const friendIds = friends.map(f => f.friendId);
      
      // Get pending friend requests to exclude them
      const requests = await storage.getFriendRequests(currentUser.id);
      const pendingRequestUserIds = requests
        .filter(r => r.status === 'pending')
        .map(r => r.senderId === currentUser.id ? r.receiverId : r.senderId);
      
      // Get all users except current user, friends, and pending requests
      const recommendedUsers = Array.from(storage.users.values())
        .filter(u => 
          u.id !== currentUser.id && 
          !friendIds.includes(u.id) && 
          !pendingRequestUserIds.includes(u.id)
        )
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          profilePicture: u.profilePicture,
          department: u.department,
          yearOfStudy: u.yearOfStudy,
          institution: u.institution
        }));
      
      res.json(recommendedUsers);
    } catch (error) {
      next(error);
    }
  });

  // User Statistics API
  app.get('/api/user-stats', isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Ensure the requesting user is the user whose stats are being fetched, or an admin (future enhancement)
      if (req.user.id !== userId) {
        // For now, only allow users to fetch their own stats
        return res.status(403).json({ error: "Forbidden: You can only fetch your own statistics." });
      }

      const userPapers = await storage.getPapers({ uploaderId: userId });
      const userDiscussions = await storage.getDiscussionPosts({ authorId: userId });
      const userDiscussionReplies = await storage.getDiscussionReplies({ authorId: userId });
      const userGroups = await storage.getUserStudyGroups(userId);
      // const userSessionsAttended = await storage.getSessionsAttended(userId); // Placeholder if method existed
      // const userTotalStudyHours = await storage.getTotalStudyHours(userId); // Placeholder if method existed

      res.json({
        papersUploaded: userPapers.length,
        discussionsStarted: userDiscussions.length,
        discussionReplies: userDiscussionReplies.length, // Assuming you want to count replies made by the user
        groupsJoined: userGroups.length,
        sessionsAttended: 0, // Placeholder
        totalStudyHours: 0   // Placeholder
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      next(error);
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Admin route to get all discussion posts for moderation
  app.get('/api/admin/discussions', isAdmin, async (req, res, next) => {
    try {
      const discussions = await storage.getDiscussionPosts();
      res.json(discussions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/stats', isAdmin, async (req, res, next) => {
    try {
      const totalUsers = await storage.getTotalUsers();
      const activeUsers = await storage.getActiveUsers();
      const bannedUsers = await storage.getBannedUsers();
      const totalPapers = await storage.getTotalPapers();
      const totalDiscussions = await storage.getTotalDiscussions();
      const totalGroups = await storage.getTotalGroups();
      const totalSessions = await storage.getTotalSessions();
      const recentActivities = await storage.getRecentActivities(10);

      res.json({
        totalUsers,
        activeUsers,
        bannedUsers,
        totalPapers,
        totalDiscussions,
        totalGroups,
        totalSessions,
        recentActivities
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/actions', isAdmin, async (req, res, next) => {
    try {
      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users/:id/ban', isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;

      // Get the existing user first
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).send('User not found');
      }

      // Update only the ban-related properties while preserving others
      const updatedUser = await storage.updateUser(userId, {
        ...existingUser,
        isBanned: true,
        banReason: reason
      });

      // Log admin action
      await storage.createAdminAction({
        adminId: req.user.id,
        targetType: 'user',
        targetId: userId,
        action: 'ban',
        reason
      });

      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users/:id/unban', isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.updateUser(userId, {
        isBanned: false,
        banReason: null
      });

      // Log admin action
      await storage.createAdminAction({
        adminId: req.user.id,
        targetType: 'user',
        targetId: userId,
        action: 'unban'
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/admin/papers/:id', isAdmin, async (req, res, next) => {
    try {
      const paperId = parseInt(req.params.id);
      await storage.deletePaper(paperId);

      // Log admin action
      await storage.createAdminAction({
        adminId: req.user.id,
        targetType: 'paper',
        targetId: paperId,
        action: 'delete'
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/admin/discussions/:id', isAdmin, async (req, res, next) => {
    try {
      const discussionId = parseInt(req.params.id);
      await storage.deleteDiscussionPost(discussionId);

      // Log admin action
      await storage.createAdminAction({
        adminId: req.user.id,
        targetType: 'discussion',
        targetId: discussionId,
        action: 'delete'
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Admin setup endpoint - only works if no admin exists
  app.post('/api/admin/setup', async (req, res) => {
    try {
      // Check if any admin exists
      const users = await storage.getAllUsers();
      const adminExists = users.some(user => user.role === 'admin');
      
      if (adminExists) {
        return res.status(403).json({ error: 'Admin already exists' });
      }

      // Get the first user and make them admin
      const firstUser = users[0];
      if (!firstUser) {
        return res.status(404).json({ error: 'No users found' });
      }

      // Update user role to admin
      const updatedUser = await storage.updateUser(firstUser.id, {
        ...firstUser,
        role: 'admin'
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Admin setup error:', error);
      res.status(500).json({ error: 'Failed to setup admin' });
    }
  });

  // Direct/private messages between users
  app.post('/api/messages', isAuthenticated, async (req, res, next) => {
    try {
      console.log('Message payload:', req.body); // Debug log
      const { recipientId, receiverId, content } = req.body;
      const finalRecipientId = recipientId || receiverId;
      if (!finalRecipientId || !content) {
        return res.status(400).json({ message: "Recipient and content are required" });
      }
      // Save the message (implement this in your storage)
      const message = await storage.createDirectMessage({
        senderId: req.user.id,
        receiverId: finalRecipientId,
        content,
        createdAt: new Date(),
        isRead: false
      });
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  });

  // Fetch direct messages between current user and another user
  app.get('/api/messages/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getDirectMessages(req.user.id, otherUserId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  // Query param compatible endpoint for fetching direct messages
  app.get('/api/messages', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const friendId = parseInt(req.query.friendId as string);
      if (!userId || !friendId) {
        return res.status(400).json({ message: "userId and friendId are required" });
      }
      // Only allow fetching messages for the logged-in user
      if (req.user.id !== userId && req.user.id !== friendId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const messages = await storage.getDirectMessages(userId, friendId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  // Admin management endpoints
  app.post('/api/admin/users/:userId/make-admin', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const adminId = req.user.id;
      
      const updatedUser = await storage.setUserAsAdmin(userId, adminId);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users/:userId/remove-admin', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const adminId = req.user.id;
      
      const updatedUser = await storage.removeUserAdmin(userId, adminId);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/first-admin', async (req, res, next) => {
    try {
      const firstAdmin = await storage.getFirstAdmin();
      res.json(firstAdmin);
    } catch (error) {
      next(error);
    }
  });

  // Add a general error handling middleware for API routes
  // This should be placed after all API routes
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    // Check if the error has a status code, otherwise default to 500
    const statusCode = err.status || 500;
    // Use the error message if available, otherwise a generic one
    const message = err.message || 'An unexpected error occurred';
    res.status(statusCode).json({
      message,
      // Optionally include stack trace in development
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
