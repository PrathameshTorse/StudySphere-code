import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  yearOfStudy: integer("year_of_study"),
  institution: text("institution"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  points: integer("points").default(0),
  role: text("role").notNull().default("user"),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Past papers table
export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  course: text("course").notNull(),
  year: text("year").notNull(),
  institution: text("institution").notNull(),
  fileUrl: text("file_url").notNull(),
  uploaderId: integer("uploader_id").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  downloads: integer("downloads").default(0),
  resourceType: text("resource_type").default("past_paper").notNull(),
});

// Discussion forum posts
export const discussionPosts = pgTable("discussion_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  course: text("course"),
  tags: text("tags").array(),
  votes: integer("votes").default(0),
});

// Discussion replies
export const discussionReplies = pgTable("discussion_replies", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  postId: integer("post_id").notNull(),
  parentReplyId: integer("parent_reply_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  votes: integer("votes").default(0),
});

// Discussion comments
export const discussionComments = pgTable("discussion_comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  replyId: integer("reply_id"),
  postId: integer("post_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Study resources
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // notes, presentation, cheat sheet, etc.
  course: text("course"),
  fileUrl: text("file_url").notNull(),
  uploaderId: integer("uploader_id").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  downloads: integer("downloads").default(0),
  rating: integer("rating").default(0),
});

// Study groups
export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  course: text("course"),
  creatorId: integer("creator_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  color: text("color").default("#4338ca"), // Default color code
});

// Study group members
export const studyGroupMembers = pgTable("study_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isAdmin: boolean("is_admin").default(false),
});

// Study sessions
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  groupId: integer("group_id").notNull(),
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  meetingLink: text("meeting_link"),
  createdBy: integer("created_by").notNull(),
});

// Activity Feed
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // paper_upload, post_created, resource_shared, group_created, etc.
  targetId: integer("target_id").notNull(), // ID of the related content (paper_id, post_id, etc.)
  targetType: text("target_type").notNull(), // paper, post, resource, group, etc.
  metadata: json("metadata"), // Additional information specific to activity type
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Group Chat Messages
export const groupChatMessages = pgTable("group_chat_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas for form validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  points: true,
  updatedAt: true,
}).extend({
  // Add custom validation rules
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email format"),
  department: z.string().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional(),
});

export const insertPaperSchema = createInsertSchema(papers).omit({
  id: true,
  uploadDate: true,
  downloads: true,
});

export const insertDiscussionPostSchema = createInsertSchema(discussionPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  votes: true,
});

export const insertDiscussionReplySchema = createInsertSchema(discussionReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  votes: true,
});

export const insertDiscussionCommentSchema = createInsertSchema(discussionComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  uploadDate: true,
  downloads: true,
  rating: true,
});

export const insertStudyGroupSchema = createInsertSchema(studyGroups).omit({
  id: true,
  createdAt: true,
});

export const insertStudyGroupMemberSchema = createInsertSchema(studyGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertGroupChatMessageSchema = createInsertSchema(groupChatMessages).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papers.$inferSelect;

export type InsertDiscussionPost = z.infer<typeof insertDiscussionPostSchema>;
export type DiscussionPost = typeof discussionPosts.$inferSelect;

export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;
export type DiscussionReply = typeof discussionReplies.$inferSelect;

export type InsertDiscussionComment = z.infer<typeof insertDiscussionCommentSchema>;
export type DiscussionComment = typeof discussionComments.$inferSelect;

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type StudyGroup = typeof studyGroups.$inferSelect;

export type InsertStudyGroupMember = z.infer<typeof insertStudyGroupMemberSchema>;
export type StudyGroupMember = typeof studyGroupMembers.$inferSelect;

export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessions.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertGroupChatMessage = z.infer<typeof insertGroupChatMessageSchema>;
export type GroupChatMessage = typeof groupChatMessages.$inferSelect;

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalPapers: number;
  totalDiscussions: number;
  totalGroups: number;
  totalSessions: number;
  recentActivities: Activity[];
};

export type AdminAction = {
  id: number;
  adminId: number;
  targetType: 'user' | 'paper' | 'discussion' | 'group' | 'session';
  targetId: number;
  action: 'ban' | 'unban' | 'delete' | 'modify';
  reason?: string;
  createdAt: Date;
};

export type InsertAdminAction = Omit<AdminAction, 'id' | 'createdAt'>;
