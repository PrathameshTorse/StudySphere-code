import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessageProps {
  message: {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    createdAt: string;
    isRead: boolean;
    sender?: {
      username?: string;
      displayName?: string;
      profilePicture?: string;
    };
  };
  currentUserId: number;
  showTime?: boolean;
  formatTime: (date: string) => string;
}

export function ChatMessage({ message, currentUserId, showTime = true, formatTime }: ChatMessageProps) {
  const isCurrentUser = message.senderId === currentUserId;
  
  return (
    <div className={cn(
      "flex w-full",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col max-w-full",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        {showTime && (
          <span className="text-xs text-muted-foreground mb-1">
            {formatTime(message.createdAt)}
          </span>
        )}
        <div
          className={cn(
            "chat-bubble-custom px-4 py-2 mb-2 relative",
            isCurrentUser
              ? "bg-primary text-primary-foreground self-end chat-bubble-right"
              : "bg-muted text-foreground self-start chat-bubble-left"
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

<style jsx>{`
  .chat-bubble-custom {
    border-radius: 1.25rem;
    margin-bottom: 0.5rem;
    padding: 0.75rem 1.25rem;
    position: relative;
    word-break: break-word;
    white-space: normal;
  }
  .flex.flex-col.max-w-full {
    flex-shrink: 1;
    max-width: 70%;
    width: fit-content;
  }
  .chat-bubble-custom::after {
    content: '';
    position: absolute;
    bottom: 8px;
    width: 16px;
    height: 16px;
    background: inherit;
    z-index: 0;
  }
  .chat-bubble-right::after {
    right: -8px;
    border-bottom-left-radius: 16px 14px;
    transform: rotate(-35deg);
  }
  .chat-bubble-left::after {
    left: -8px;
    border-bottom-right-radius: 16px 14px;
    transform: rotate(35deg);
  }
`}</style>
