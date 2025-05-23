import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FriendRequestProps {
  request: {
    id: number;
    senderId: number;
    senderName?: string;
    senderAvatar?: string;
    receiverId: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
  };
  currentUserId: number;
  onAccept: () => void;
  onDecline: () => void;
}

export function FriendRequestItem({ request, currentUserId, onAccept, onDecline }: FriendRequestProps) {
  const isIncoming = request.receiverId === currentUserId;
  
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <Avatar>
        <AvatarImage src={request.senderAvatar} />
        <AvatarFallback>
          {request.senderName?.slice(0, 2).toUpperCase() || "UN"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col">
          <p className="font-medium truncate">{request.senderName}</p>
          <p className="text-xs text-muted-foreground">
            {isIncoming ? 'Sent you a request' : 'Request sent'} {' '}
            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      {isIncoming && request.status === 'pending' && (
        <div className="flex gap-2">
          <Button 
            onClick={onAccept} 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onDecline} 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* For outgoing requests, show status */}
      {!isIncoming && (
        <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
          {request.status === 'pending' ? 'Pending' : 
           request.status === 'accepted' ? 'Accepted' : 'Declined'}
        </span>
      )}
    </div>
  );
}
