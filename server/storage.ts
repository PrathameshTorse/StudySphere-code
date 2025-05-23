import { users, type User, type InsertUser, papers, type Paper, type InsertPaper, discussionPosts, type DiscussionPost, type InsertDiscussionPost, discussionReplies, type DiscussionReply, type InsertDiscussionReply, resources, type Resource, type InsertResource, studyGroups, type StudyGroup, type InsertStudyGroup, studyGroupMembers, type StudyGroupMember, type InsertStudyGroupMember, studySessions, type StudySession, type InsertStudySession, activities, type Activity, type InsertActivity, groupChatMessages, type GroupChatMessage, type InsertGroupChatMessage, discussionComments, type DiscussionComment, type InsertDiscussionComment, adminActions, type AdminAction, type InsertAdminAction } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: User): Promise<User>;
  updateUserProfile(userId: number, updates: { 
    displayName?: string;
    email?: string;
    bio?: string;
    yearOfStudy?: number;
    institution?: string;
    department?: string;
  }): Promise<User>;
  
  // Search operations
  searchPapers(query: string, limit?: number): Promise<Paper[]>;
  searchDiscussions(query: string, limit?: number): Promise<DiscussionPost[]>;
  searchGroups(query: string, limit?: number): Promise<StudyGroup[]>;
  searchSessions(query: string, limit?: number): Promise<StudySession[]>;
  
  // Paper operations
  createPaper(paper: InsertPaper): Promise<Paper>;
  getPaper(id: number): Promise<Paper | undefined>;
  getPapers(filters?: Partial<Paper>): Promise<Paper[]>;
  incrementPaperDownloads(id: number): Promise<Paper | undefined>;
  
  // Discussion operations
  createDiscussionPost(post: InsertDiscussionPost): Promise<DiscussionPost>;
  getDiscussionPost(id: number): Promise<DiscussionPost | null>;
  getDiscussionPosts(): Promise<DiscussionPost[]>;
  voteDiscussionPost(id: number, value: number): Promise<DiscussionPost>;
  
  createDiscussionReply(reply: InsertDiscussionReply): Promise<DiscussionReply>;
  getDiscussionReply(id: number): Promise<DiscussionReply | null>;
  getDiscussionReplies(postId: number): Promise<DiscussionReply[]>;
  voteDiscussionReply(id: number, value: number): Promise<DiscussionReply>;
  acceptDiscussionReply(id: number): Promise<DiscussionReply>;
  
  createDiscussionComment(comment: InsertDiscussionComment): Promise<DiscussionComment>;
  getDiscussionComment(id: number): Promise<DiscussionComment | null>;
  deleteDiscussionComment(id: number): Promise<void>;
  
  // Resource operations
  createResource(resource: InsertResource): Promise<Resource>;
  getResource(id: number): Promise<Resource | undefined>;
  getResources(filters?: Partial<Resource>): Promise<Resource[]>;
  incrementResourceDownloads(id: number): Promise<Resource | undefined>;
  rateResource(id: number, rating: number): Promise<Resource | undefined>;
  
  // Study group operations
  createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup>;
  getStudyGroup(id: number): Promise<StudyGroup | undefined>;
  getStudyGroups(filters?: Partial<StudyGroup>): Promise<StudyGroup[]>;
  getUserStudyGroups(userId: number): Promise<StudyGroup[]>;
  
  // Study group member operations
  addStudyGroupMember(member: InsertStudyGroupMember): Promise<StudyGroupMember>;
  getStudyGroupMembers(groupId: number): Promise<StudyGroupMember[]>;
  removeStudyGroupMember(groupId: number, userId: number): Promise<boolean>;
  
  // Study session operations
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  getStudySession(id: number): Promise<StudySession | undefined>;
  getStudySessions(groupId: number): Promise<StudySession[]>;
  getUpcomingStudySessions(userId: number): Promise<StudySession[]>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserActivities(userId: number, limit?: number): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<Activity[]>;
  
  // Group chat operations
  createGroupChatMessage(message: InsertGroupChatMessage): Promise<GroupChatMessage>;
  getGroupChatMessages(groupId: number, limit?: number): Promise<GroupChatMessage[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;

  // Friend operations
  getFriends(userId: number): Promise<any[]>;
  createFriendship(user1Id: number, user2Id: number): Promise<any>;
  getFriendRequest(senderId: number, receiverId: number): Promise<any>;
  getFriendRequestById(requestId: number): Promise<any>;
  getFriendRequests(userId: number): Promise<any[]>;
  createFriendRequest(request: { senderId: number, receiverId: number, status: string, createdAt: Date }): Promise<any>;
  updateFriendRequestStatus(requestId: number, status: string): Promise<any>;
  checkFriendship(user1Id: number, user2Id: number): Promise<boolean>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  getTotalUsers(): Promise<number>;
  getActiveUsers(): Promise<number>;
  getBannedUsers(): Promise<number>;
  getTotalPapers(): Promise<number>;
  getTotalDiscussions(): Promise<number>;
  getTotalGroups(): Promise<number>;
  getTotalSessions(): Promise<number>;
  getAdminActions(): Promise<AdminAction[]>;
  createAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  deletePaper(id: number): Promise<void>;
  deleteDiscussionPost(id: number): Promise<void>;
  setUserAsAdmin(userId: number, adminId: number): Promise<User>;
  removeUserAdmin(userId: number, adminId: number): Promise<User>;
  getFirstAdmin(): Promise<User | undefined>;
  isFirstAdmin(userId: number): Promise<boolean>;

  // Direct message operations
  createDirectMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage>;
  getDirectMessages(userId1: number, userId2: number): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private papers: Map<number, Paper>;
  private discussionPosts: Map<number, DiscussionPost>;
  private discussionReplies: Map<number, DiscussionReply>;
  private discussionComments: Map<number, DiscussionComment>;
  private resources: Map<number, Resource>;
  private studyGroups: Map<number, StudyGroup>;
  private studyGroupMembers: Map<number, StudyGroupMember>;
  private studySessions: Map<number, StudySession>;
  private activities: Map<number, Activity>;
  private groupChatMessages: Map<number, GroupChatMessage>;
  private friendRequests: Map<number, any>;
  private friendships: Map<number, any>;
  private adminActions: Map<number, AdminAction> = new Map();
  private nextAdminActionId = 1;
  private directMessages: Map<number, ChatMessage> = new Map();
  private currentDirectMessageId: number = 1;
  private firstAdminId: number | null = null;
  
  sessionStore: session.SessionStore;
  
  currentUserId: number;
  currentPaperId: number;
  currentDiscussionPostId: number;
  currentDiscussionReplyId: number;
  currentResourceId: number;
  currentStudyGroupId: number;
  currentStudyGroupMemberId: number;
  currentStudySessionId: number;
  currentActivityId: number;
  currentGroupChatMessageId: number = 1;
  currentDiscussionCommentId: number = 1;
  currentFriendRequestId: number = 1;
  currentFriendshipId: number = 1;

  constructor() {
    this.users = new Map();
    this.papers = new Map();
    this.discussionPosts = new Map();
    this.discussionReplies = new Map();
    this.discussionComments = new Map();
    this.resources = new Map();
    this.studyGroups = new Map();
    this.studyGroupMembers = new Map();
    this.studySessions = new Map();
    this.activities = new Map();
    this.groupChatMessages = new Map();
    this.friendRequests = new Map();
    this.friendships = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.currentUserId = 1;
    this.currentPaperId = 1;
    this.currentDiscussionPostId = 1;
    this.currentDiscussionReplyId = 1;
    this.currentResourceId = 1;
    this.currentStudyGroupId = 1;
    this.currentStudyGroupMemberId = 1;
    this.currentStudySessionId = 1;
    this.currentActivityId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    
    // If this is the first user and they're an admin, set them as first admin
    if (this.users.size === 0 && insertUser.isAdmin) {
      this.firstAdminId = id;
    }
    
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      points: 0
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, user: User): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error('User not found');
    }
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(userId: number, updates: { 
    displayName?: string;
    email?: string;
    bio?: string;
    yearOfStudy?: number;
    institution?: string;
    department?: string;
  }): Promise<User> {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser: User = {
      ...user,
      displayName: updates.displayName ?? user.displayName,
      email: updates.email ?? user.email,
      bio: updates.bio ?? user.bio,
      yearOfStudy: updates.yearOfStudy ?? user.yearOfStudy,
      institution: updates.institution ?? user.institution,
      department: updates.department ?? user.department
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Paper operations
  async createPaper(paper: InsertPaper): Promise<Paper> {
    const id = this.currentPaperId++;
    const now = new Date();
    const newPaper: Paper = {
      ...paper,
      id,
      uploadDate: now,
      downloads: 0
    };
    this.papers.set(id, newPaper);
    return newPaper;
  }
  
  async getPaper(id: number): Promise<Paper | undefined> {
    return this.papers.get(id);
  }
  
  async getPapers(filters?: Partial<Paper>): Promise<Paper[]> {
    if (!filters) {
      return Array.from(this.papers.values());
    }
    
    return Array.from(this.papers.values()).filter(paper => {
      return Object.entries(filters).every(([key, value]) => {
        return paper[key as keyof Paper] === value;
      });
    });
  }
  
  async incrementPaperDownloads(id: number): Promise<Paper | undefined> {
    const paper = await this.getPaper(id);
    if (!paper) return undefined;
    
    const updatedPaper = { ...paper, downloads: paper.downloads + 1 };
    this.papers.set(id, updatedPaper);
    return updatedPaper;
  }

  // Discussion operations
  async createDiscussionPost(post: InsertDiscussionPost): Promise<DiscussionPost> {
    const id = this.currentDiscussionPostId++;
    const now = new Date();
    const newPost: DiscussionPost = {
      ...post,
      id,
      createdAt: now,
      updatedAt: now,
      votes: 0
    };
    this.discussionPosts.set(id, newPost);
    return newPost;
  }
  
  async getDiscussionPost(id: number): Promise<DiscussionPost | null> {
    const post = this.discussionPosts.get(id);
    if (!post) return null;
    
    // Get replies for this post
    const replies = Array.from(this.discussionReplies.values())
      .filter(reply => reply.postId === id);
    
    // For each reply, get its comments
    const repliesWithComments = await Promise.all(replies.map(async (reply) => {
      const comments = Array.from(this.discussionComments.values())
        .filter(comment => comment.replyId === reply.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Get author info for each comment
      const commentsWithAuthor = await Promise.all(comments.map(async (comment) => {
        const author = await this.getUser(comment.authorId);
        return {
          ...comment,
          authorName: author?.displayName || author?.username || "Unknown",
          authorAvatar: author?.profilePicture || '/default-avatar.png'
        };
      }));
      
      // Get author info for the reply
      const author = await this.getUser(reply.authorId);
      
      return {
        ...reply,
        authorName: author?.displayName || author?.username || "Unknown",
        authorAvatar: author?.profilePicture || '/default-avatar.png',
        comments: commentsWithAuthor
      };
    }));
    
    // Get author info for the post
    const author = await this.getUser(post.authorId);
    
    return {
      ...post,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.profilePicture || '/default-avatar.png',
      replies: repliesWithComments
    };
  }
  
  async getDiscussionPosts(): Promise<DiscussionPost[]> {
    return Array.from(this.discussionPosts.values());
  }
  
  async voteDiscussionPost(id: number, value: number): Promise<DiscussionPost> {
    const post = await this.getDiscussionPost(id);
    if (!post) throw new Error('Discussion post not found');
    
    const updatedPost = { ...post, votes: post.votes + value };
    this.discussionPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async createDiscussionReply(reply: InsertDiscussionReply): Promise<DiscussionReply> {
    const id = this.currentDiscussionReplyId++;
    const now = new Date();
    const newReply: DiscussionReply = {
      ...reply,
      id,
      createdAt: now,
      updatedAt: now,
      votes: 0
    };
    this.discussionReplies.set(id, newReply);
    return newReply;
  }
  
  async getDiscussionReply(id: number): Promise<DiscussionReply | null> {
    return this.discussionReplies.get(id) || null;
  }
  
  async getDiscussionReplies(postId: number): Promise<DiscussionReply[]> {
    const replies = Array.from(this.discussionReplies.values())
      .filter(reply => reply.postId === postId);
    
    // Get author info for each reply
    const repliesWithAuthor = await Promise.all(replies.map(async (reply) => {
      const author = await this.getUser(reply.authorId);
      return {
        ...reply,
        authorName: author?.displayName || author?.username || "Unknown",
        authorAvatar: author?.profilePicture || '/default-avatar.png'
      };
    }));
    
    return repliesWithAuthor;
  }
  
  async voteDiscussionReply(id: number, value: number): Promise<DiscussionReply> {
    const reply = await this.getDiscussionReply(id);
    if (!reply) throw new Error('Discussion reply not found');
    
    const updatedReply = { ...reply, votes: reply.votes + value };
    this.discussionReplies.set(id, updatedReply);
    return updatedReply;
  }
  
  async acceptDiscussionReply(id: number): Promise<DiscussionReply> {
    const reply = await this.getDiscussionReply(id);
    if (!reply) throw new Error('Discussion reply not found');
    
    const updatedReply = { ...reply, accepted: true };
    this.discussionReplies.set(id, updatedReply);
    return updatedReply;
  }
  
  async createDiscussionComment(comment: InsertDiscussionComment): Promise<DiscussionComment> {
    const id = this.currentDiscussionCommentId++;
    const now = new Date();
    const newComment: DiscussionComment = {
      ...comment,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.discussionComments.set(id, newComment);
    return newComment;
  }
  
  async getDiscussionComment(id: number): Promise<DiscussionComment | null> {
    const comment = this.discussionComments.get(id);
    if (!comment) return null;
    
    const author = await this.getUser(comment.authorId);
    
    return {
      ...comment,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.profilePicture || '/default-avatar.png'
    };
  }
  
  async deleteDiscussionComment(id: number): Promise<void> {
    this.discussionComments.delete(id);
  }

  // Resource operations
  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.currentResourceId++;
    const now = new Date();
    const newResource: Resource = {
      ...resource,
      id,
      uploadDate: now,
      downloads: 0,
      rating: 0
    };
    this.resources.set(id, newResource);
    return newResource;
  }
  
  async getResource(id: number): Promise<Resource | undefined> {
    return this.resources.get(id);
  }
  
  async getResources(filters?: Partial<Resource>): Promise<Resource[]> {
    if (!filters) {
      return Array.from(this.resources.values());
    }
    
    return Array.from(this.resources.values()).filter(resource => {
      return Object.entries(filters).every(([key, value]) => {
        return resource[key as keyof Resource] === value;
      });
    });
  }
  
  async incrementResourceDownloads(id: number): Promise<Resource | undefined> {
    const resource = await this.getResource(id);
    if (!resource) return undefined;
    
    const updatedResource = { ...resource, downloads: resource.downloads + 1 };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }
  
  async rateResource(id: number, rating: number): Promise<Resource | undefined> {
    const resource = await this.getResource(id);
    if (!resource) return undefined;
    
    const updatedResource = { ...resource, rating };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }

  // Study group operations
  async createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup> {
    const id = this.currentStudyGroupId++;
    const now = new Date();
    const newGroup: StudyGroup = {
      ...group,
      id,
      createdAt: now
    };
    this.studyGroups.set(id, newGroup);
    return newGroup;
  }
  
  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    return this.studyGroups.get(id);
  }
  
  async getStudyGroups(filters?: Partial<StudyGroup>): Promise<StudyGroup[]> {
    if (!filters) {
      return Array.from(this.studyGroups.values());
    }
    
    return Array.from(this.studyGroups.values()).filter(group => {
      return Object.entries(filters).every(([key, value]) => {
        return group[key as keyof StudyGroup] === value;
      });
    });
  }
  
  async getUserStudyGroups(userId: number): Promise<StudyGroup[]> {
    // Get all groups where user is a member
    const memberGroups = Array.from(this.studyGroupMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    return Array.from(this.studyGroups.values())
      .filter(group => memberGroups.includes(group.id));
  }

  // Study group member operations
  async addStudyGroupMember(member: InsertStudyGroupMember): Promise<StudyGroupMember> {
    const id = this.currentStudyGroupMemberId++;
    const now = new Date();
    const newMember: StudyGroupMember = {
      ...member,
      id,
      joinedAt: now
    };
    this.studyGroupMembers.set(id, newMember);
    return newMember;
  }
  
  async getStudyGroupMembers(groupId: number): Promise<StudyGroupMember[]> {
    return Array.from(this.studyGroupMembers.values())
      .filter(member => member.groupId === groupId);
  }
  
  async removeStudyGroupMember(groupId: number, userId: number): Promise<boolean> {
    const memberToDelete = Array.from(this.studyGroupMembers.values())
      .find(member => member.groupId === groupId && member.userId === userId);
    
    if (memberToDelete) {
      return this.studyGroupMembers.delete(memberToDelete.id);
    }
    
    return false;
  }

  // Study session operations
  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    const id = this.currentStudySessionId++;
    const newSession: StudySession = {
      ...session,
      id
    };
    this.studySessions.set(id, newSession);
    return newSession;
  }
  
  async getStudySession(id: number): Promise<StudySession | undefined> {
    return this.studySessions.get(id);
  }
  
  async getStudySessions(groupId: number): Promise<StudySession[]> {
    return Array.from(this.studySessions.values())
      .filter(session => session.groupId === groupId);
  }
  
  async getUpcomingStudySessions(userId: number): Promise<StudySession[]> {
    // Get all groups where user is a member
    const memberGroups = Array.from(this.studyGroupMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    const now = new Date();
    return Array.from(this.studySessions.values())
      .filter(session => 
        memberGroups.includes(session.groupId) && 
        new Date(session.startTime) > now
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const now = new Date();
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: now
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  async getUserActivities(userId: number, limit?: number): Promise<Activity[]> {
    const userActivities = Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? userActivities.slice(0, limit) : userActivities;
  }
  
  async getRecentActivities(limit?: number): Promise<Activity[]> {
    const allActivities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? allActivities.slice(0, limit) : allActivities;
  }
  
  // Search operations
  async searchPapers(query: string, limit?: number): Promise<Paper[]> {
    // Normalize the query to lowercase for case-insensitive search
    const normalizedQuery = query.toLowerCase();
    
    // Search in multiple fields
    const results = Array.from(this.papers.values()).filter(paper => {
      return (
        paper.title.toLowerCase().includes(normalizedQuery) ||
        paper.course.toLowerCase().includes(normalizedQuery) ||
        paper.institution.toLowerCase().includes(normalizedQuery) ||
        (paper.description && paper.description.toLowerCase().includes(normalizedQuery))
      );
    });
    
    // Sort by relevance (simple algorithm - title matches first, then by date)
    const sortedResults = results.sort((a, b) => {
      // Title matches are prioritized
      const aTitleMatch = a.title.toLowerCase().includes(normalizedQuery);
      const bTitleMatch = b.title.toLowerCase().includes(normalizedQuery);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // Then sort by date (newer first)
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    });
    
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }
  
  async searchDiscussions(query: string, limit?: number): Promise<DiscussionPost[]> {
    const normalizedQuery = query.toLowerCase();
    
    const results = Array.from(this.discussionPosts.values()).filter(post => {
      return (
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.content.toLowerCase().includes(normalizedQuery) ||
        (post.course && post.course.toLowerCase().includes(normalizedQuery)) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)))
      );
    });
    
    // Sort by relevance and then by recency
    const sortedResults = results.sort((a, b) => {
      // Title matches first
      const aTitleMatch = a.title.toLowerCase().includes(normalizedQuery);
      const bTitleMatch = b.title.toLowerCase().includes(normalizedQuery);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // Then by votes (if available)
      const aVotes = a.votes || 0;
      const bVotes = b.votes || 0;
      
      if (aVotes !== bVotes) return bVotes - aVotes;
      
      // Finally by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }
  
  async searchGroups(query: string, limit?: number): Promise<StudyGroup[]> {
    const normalizedQuery = query.toLowerCase();
    
    const results = Array.from(this.studyGroups.values()).filter(group => {
      return (
        group.name.toLowerCase().includes(normalizedQuery) ||
        (group.description && group.description.toLowerCase().includes(normalizedQuery)) ||
        (group.course && group.course.toLowerCase().includes(normalizedQuery))
      );
    });
    
    // Sort by name match first, then by recency
    const sortedResults = results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
      const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then by date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }
  
  async searchSessions(query: string, limit?: number): Promise<StudySession[]> {
    const normalizedQuery = query.toLowerCase();
    const now = new Date();
    
    const results = Array.from(this.studySessions.values()).filter(session => {
      // Only include future or ongoing sessions
      const sessionEndTime = new Date(session.endTime);
      if (sessionEndTime < now) return false;
      
      return (
        session.title.toLowerCase().includes(normalizedQuery) ||
        (session.description && session.description.toLowerCase().includes(normalizedQuery)) ||
        (session.location && session.location.toLowerCase().includes(normalizedQuery))
      );
    });
    
    // Sort by time (closest upcoming sessions first)
    const sortedResults = results.sort((a, b) => {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return aTime - bTime; // Ascending order (closest first)
    });
    
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }

  // Group chat operations
  async createGroupChatMessage(message: InsertGroupChatMessage): Promise<GroupChatMessage> {
    const id = this.currentGroupChatMessageId++;
    const newMessage: GroupChatMessage = {
      ...message,
      id,
    };
    this.groupChatMessages.set(id, newMessage);
    return newMessage;
  }

  async getGroupChatMessages(groupId: number, limit?: number): Promise<GroupChatMessage[]> {
    const messages = Array.from(this.groupChatMessages.values())
      .filter(message => message.groupId === groupId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Get user names to include with messages
    const enhancedMessages = await Promise.all(messages.map(async (message) => {
      const user = await this.getUser(message.userId);
      return {
        ...message,
        userName: user?.displayName || user?.username || 'Unknown',
      };
    }));
    
    return enhancedMessages.slice(-(limit || 50));
  }

  // Friend operations
  async getFriends(userId: number): Promise<any[]> {
    // Get all friendships where the user is participating
    const userFriendships = Array.from(this.friendships.values())
      .filter(friendship => 
        friendship.user1Id === userId || friendship.user2Id === userId
      );
    
    // Get details of each friend
    const friends = await Promise.all(userFriendships.map(async (friendship) => {
      // Determine which user is the friend (not the requesting user)
      const friendId = friendship.user1Id === userId ? 
        friendship.user2Id : friendship.user1Id;
      
      const friendUser = await this.getUser(friendId);
      
      if (!friendUser) return null;
      
      return {
        id: friendship.id,
        userId: userId,
        friendId: friendId,
        friendName: friendUser.displayName || friendUser.username,
        friendAvatar: friendUser.profilePicture,
        friendship: {
          id: friendship.id,
          createdAt: friendship.createdAt
        },
        isOnline: Math.random() > 0.5, // Mock online status
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random activity in the last week
      };
    }));
    
    // Remove any null entries (in case a user was deleted)
    return friends.filter(friend => friend !== null);
  }
  
  async createFriendship(user1Id: number, user2Id: number): Promise<any> {
    const id = this.currentFriendshipId++;
    const friendship = {
      id,
      user1Id,
      user2Id,
      createdAt: new Date()
    };
    
    this.friendships.set(id, friendship);
    return friendship;
  }
  
  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    return Array.from(this.friendRequests.values())
      .find(request => 
        (request.senderId === senderId && request.receiverId === receiverId) ||
        (request.senderId === receiverId && request.receiverId === senderId)
      );
  }
  
  async getFriendRequestById(requestId: number): Promise<any> {
    return this.friendRequests.get(requestId);
  }
  
  async getFriendRequests(userId: number): Promise<any[]> {
    // Get all requests where user is sender or receiver
    const requests = Array.from(this.friendRequests.values())
      .filter(request => 
        request.senderId === userId || request.receiverId === userId
      );
    
    // Enrich with user details
    return await Promise.all(requests.map(async (request) => {
      const otherUserId = request.senderId === userId ? 
        request.receiverId : request.senderId;
      
      const otherUser = await this.getUser(otherUserId);
      
      if (!otherUser) return request;
      
      return {
        ...request,
        senderName: request.senderId === userId ? 
          (this.users.get(userId)?.displayName || this.users.get(userId)?.username) : 
          (otherUser.displayName || otherUser.username),
        senderAvatar: request.senderId === userId ?
          this.users.get(userId)?.profilePicture :
          otherUser.profilePicture
      };
    }));
  }
  
  async createFriendRequest(request: { senderId: number, receiverId: number, status: string, createdAt: Date }): Promise<any> {
    const id = this.currentFriendRequestId++;
    const friendRequest = {
      id,
      ...request
    };
    
    this.friendRequests.set(id, friendRequest);
    return friendRequest;
  }
  
  async updateFriendRequestStatus(requestId: number, status: string): Promise<any> {
    const request = this.friendRequests.get(requestId);
    
    if (!request) {
      throw new Error('Friend request not found');
    }
    
    const updatedRequest = {
      ...request,
      status
    };
    
    this.friendRequests.set(requestId, updatedRequest);
    return updatedRequest;
  }
  
  async checkFriendship(user1Id: number, user2Id: number): Promise<boolean> {
    return Array.from(this.friendships.values())
      .some(friendship => 
        (friendship.user1Id === user1Id && friendship.user2Id === user2Id) ||
        (friendship.user1Id === user2Id && friendship.user2Id === user1Id)
      );
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getTotalUsers(): Promise<number> {
    return this.users.size;
  }

  async getActiveUsers(): Promise<number> {
    return Array.from(this.users.values()).filter(u => !u.isBanned).length;
  }

  async getBannedUsers(): Promise<number> {
    return Array.from(this.users.values()).filter(u => u.isBanned).length;
  }

  async getTotalPapers(): Promise<number> {
    return this.papers.size;
  }

  async getTotalDiscussions(): Promise<number> {
    return this.discussionPosts.size;
  }

  async getTotalGroups(): Promise<number> {
    return this.studyGroups.size;
  }

  async getTotalSessions(): Promise<number> {
    return this.studySessions.size;
  }

  async getAdminActions(): Promise<AdminAction[]> {
    return Array.from(this.adminActions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAdminAction(action: InsertAdminAction): Promise<AdminAction> {
    const newAction: AdminAction = {
      id: this.nextAdminActionId++,
      ...action,
      createdAt: new Date()
    };
    this.adminActions.set(newAction.id, newAction);
    return newAction;
  }

  async deletePaper(id: number): Promise<void> {
    const paper = this.papers.get(id);
    if (!paper) {
      throw new Error('Paper not found');
    }
    this.papers.delete(id);
  }

  async deleteDiscussionPost(id: number): Promise<void> {
    const post = this.discussionPosts.get(id);
    if (!post) {
      throw new Error('Discussion post not found');
    }
    this.discussionPosts.delete(id);
  }

  async setUserAsAdmin(userId: number, adminId: number): Promise<User> {
    const user = await this.getUser(userId);
    const admin = await this.getUser(adminId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!admin) {
      throw new Error('Admin not found');
    }
    
    // Check if the admin is the first admin
    const isFirstAdmin = await this.isFirstAdmin(adminId);
    if (!isFirstAdmin) {
      throw new Error('Only the first admin can manage admin permissions');
    }
    
    const updatedUser = { ...user, isAdmin: true };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async removeUserAdmin(userId: number, adminId: number): Promise<User> {
    const user = await this.getUser(userId);
    const admin = await this.getUser(adminId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!admin) {
      throw new Error('Admin not found');
    }
    
    // Check if the admin is the first admin
    const isFirstAdmin = await this.isFirstAdmin(adminId);
    if (!isFirstAdmin) {
      throw new Error('Only the first admin can manage admin permissions');
    }
    
    // Prevent removing admin from the first admin
    if (userId === this.firstAdminId) {
      throw new Error('Cannot remove admin permissions from the first admin');
    }
    
    const updatedUser = { ...user, isAdmin: false };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getFirstAdmin(): Promise<User | undefined> {
    if (this.firstAdminId === null) {
      return undefined;
    }
    return this.getUser(this.firstAdminId);
  }
  
  async isFirstAdmin(userId: number): Promise<boolean> {
    return this.firstAdminId === userId;
  }

  // Direct message operations
  async createDirectMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = this.currentDirectMessageId++;
    const newMessage: ChatMessage = { ...message, id };
    this.directMessages.set(id, newMessage);
    return newMessage;
  }

  async getDirectMessages(userId1: number, userId2: number): Promise<ChatMessage[]> {
    return Array.from(this.directMessages.values()).filter(
      m => (m.senderId === userId1 && m.receiverId === userId2) ||
           (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

export const storage = new MemStorage();
