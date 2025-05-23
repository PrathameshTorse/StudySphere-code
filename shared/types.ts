import { Paper as PaperSchema, Resource as ResourceSchema } from "./schema";

// Extended Paper type with additional properties needed for the UI
export interface ExtendedPaper extends PaperSchema {
  views?: number;
  resourceType?: string;
  uploaderName?: string;
}

// Extended Resource type
export interface ExtendedResource extends ResourceSchema {
  uploaderName?: string;
}

// Discussion type extensions
export interface ExtendedDiscussionPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
  course?: string;
  tags?: string[];
  votes: number;
  department?: string;
  replies?: ExtendedDiscussionReply[];
}

export interface ExtendedDiscussionReply {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  postId: number;
  parentReplyId?: number;
  createdAt: Date;
  updatedAt: Date;
  votes: number;
  isAccepted?: boolean;
  comments?: ExtendedDiscussionComment[];
}

export interface ExtendedDiscussionComment {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  postId: number;
  replyId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Friend relationship types
export interface FriendRequest {
  id: number;
  senderId: number;
  senderName?: string;
  senderAvatar?: string;
  receiverId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number;
  friendName: string;
  friendAvatar?: string;
  friendship: {
    id: number;
    createdAt: Date;
  };
  isOnline?: boolean;
  lastActive?: Date;
}

// Chat/Message types
export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  attachmentUrl?: string;
  createdAt: Date;
  isRead: boolean;
}

export interface ChatConversation {
  id: number;
  participantIds: number[];
  lastMessageId?: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  participants: {
    id: number;
    name: string;
    avatar?: string;
  }[];
}

// Department type for user profiles
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}
