import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2 } from "lucide-react";

interface RecommendedUserItemProps {
  user: {
    id: number;
    username?: string;
    displayName?: string;
    profilePicture?: string;
    department?: string;
    yearOfStudy?: number;
    institution?: string;
  };
  onSendRequest: () => void;
  isPending?: boolean;
  showDepartment?: boolean;
}

export function RecommendedUserItem({ 
  user, 
  onSendRequest, 
  isPending = false,
  showDepartment = false 
}: RecommendedUserItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <Avatar>
        <AvatarImage src={user.profilePicture} />
        <AvatarFallback>
          {(user.displayName || user.username || "User")
            .slice(0, 2)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col">
          <p className="font-medium truncate">
            {user.displayName || user.username}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-1">
            {showDepartment && user.department && (
              <Badge variant="outline" className="text-xs">
                {user.department}
              </Badge>
            )}
            
            {user.yearOfStudy && (
              <Badge variant="outline" className="text-xs">
                Year {user.yearOfStudy}
              </Badge>
            )}
            
            {user.institution && (
              <p className="text-xs text-muted-foreground truncate">
                {user.institution}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={onSendRequest} 
        variant="outline" 
        size="sm"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </>
        )}
      </Button>
    </div>
  );
}
