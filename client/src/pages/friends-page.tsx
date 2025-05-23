import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Friend, FriendRequest } from "@shared/types";
import { 
  UserPlus, 
  Users, 
  Search, 
  MessageSquare, 
  UserX,
  Clock,
  Check,
  X,
  Loader2,
  PlusCircle,
  SendHorizontal,
  Bot,
  Crown
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ChatMessage } from "@/components/friends/chat-message";
import { FriendRequestItem } from "@/components/friends/friend-request-item";
import { RecommendedUserItem } from "@/components/friends/recommended-user-item";

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageText, setMessageText] = useState("");
  
  // Fetch friends
  const { data: friends = [], isLoading: isFriendsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/friends?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch friend requests
  const { data: friendRequests = [], isLoading: isRequestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friend-requests"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/friend-requests?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch friend requests");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch recommended users
  const { data: recommendedUsers = [], isLoading: isRecommendedLoading } = useQuery<any[]>({
    queryKey: ["/api/users/recommended"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/users/recommended?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch recommended users");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch messages for selected friend
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedFriend?.userId],
    queryFn: async () => {
      if (!user || !selectedFriend) return [];
      const res = await fetch(`/api/messages?userId=${user.id}&friendId=${selectedFriend.friendId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user && !!selectedFriend,
  });
  
  // Search users mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
  });
  
  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const res = await fetch("/api/friend-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId
        }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to send friend request");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "They'll receive your request soon",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send request",
        description: error.message || "There was a problem sending your request",
        variant: "destructive",
      });
    },
  });
  
  // Accept friend request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`/api/friend-requests/${requestId}/accept`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to accept friend request");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept request",
        description: error.message || "There was a problem accepting the request",
        variant: "destructive",
      });
    },
  });
  
  // Decline friend request mutation
  const declineRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`/api/friend-requests/${requestId}/decline`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to decline friend request");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request declined",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to decline request",
        description: error.message || "There was a problem declining the request",
        variant: "destructive",
      });
    },
  });
  
  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend removed",
        description: "They have been removed from your friends list",
      });
      setSelectedFriend(null);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove friend",
        description: error.message || "There was a problem removing your friend",
        variant: "destructive",
      });
    },
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: number; content: string }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user?.id,
          receiverId,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      // Refresh messages
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedFriend?.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "There was a problem sending your message",
        variant: "destructive",
      });
    },
  });
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedFriend || !user) return;
    
    sendMessageMutation.mutate({
      receiverId: selectedFriend.friendId,
      content: messageText,
    });
  };
  
  // Handle searching users
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchUsersMutation.mutate(searchQuery);
  };
  
  // Filter friends by search
  const filteredFriends = searchQuery
    ? friends.filter(friend => 
        friend.friendName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;
    
  // Count pending requests
  const pendingRequestsCount = friendRequests.filter(r => r.status === 'pending').length;
  
  // Format time stamp for messages
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If the message is from today, just show the time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If the message is from yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show the date
    return format(date, 'MMM d');
  };
  
  return (
    <AppShell>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar */}
          <div className="w-full md:w-[350px] md:flex-shrink-0">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Friends & Connections
                </CardTitle>
                <CardDescription>
                  Connect with fellow students
                </CardDescription>
              </CardHeader>
              
              <div className="px-6 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name..." 
                    className="pl-8 mb-4" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              
              <Tabs defaultValue="friends" value={activeTab} onValueChange={setActiveTab}>
                <div className="px-6">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="friends" className="relative">
                      Friends
                      {friends.length > 0 && (
                        <Badge className="ml-1">{friends.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="relative">
                      Requests
                      {pendingRequestsCount > 0 && (
                        <Badge className="ml-1">{pendingRequestsCount}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="discover">
                      Discover
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <CardContent className="pt-4 pb-0 h-[calc(100vh-350px)] overflow-auto">
                  <TabsContent value="friends" className="m-0">
                    {isFriendsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                        <p className="text-muted-foreground mb-6">
                          {searchQuery ? "No friends match your search" : "Start connecting with fellow students"}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => setActiveTab("discover")}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Find Friends
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredFriends.map((friend) => (
                          <div 
                            key={friend.friendId}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                              selectedFriend?.friendId === friend.friendId ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedFriend(friend)}
                          >
                            <div className="relative">
                              <Avatar>
                                <AvatarImage src={friend.friendAvatar} />
                                <AvatarFallback>
                                  {friend.friendName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {friend.isOnline && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex justify-between items-center">
                                <p className="font-medium truncate">{friend.friendName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {friend.lastActive 
                                    ? formatDistanceToNow(new Date(friend.lastActive), { addSuffix: true }) 
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="requests" className="m-0">
                    {isRequestsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : friendRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                        <p className="text-muted-foreground mb-6">
                          You don't have any friend requests at the moment
                        </p>
                        <Button onClick={() => setActiveTab("discover")}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Find Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {friendRequests.map((request) => (
                          <FriendRequestItem 
                            key={request.id}
                            request={request}
                            currentUserId={user?.id || 0}
                            onAccept={() => acceptRequestMutation.mutate(request.id)}
                            onDecline={() => declineRequestMutation.mutate(request.id)}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="discover" className="m-0">
                    {isRecommendedLoading || searchUsersMutation.isPending ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : searchUsersMutation.data ? (
                      // Search results
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium mb-2">Search Results</h3>
                        {searchUsersMutation.data.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            No users found matching "{searchQuery}"
                          </p>
                        ) : (
                          searchUsersMutation.data.map((user: any) => (
                            <RecommendedUserItem 
                              key={user.id}
                              user={user}
                              onSendRequest={() => sendRequestMutation.mutate(user.id)}
                              isPending={sendRequestMutation.isPending}
                            />
                          ))
                        )}
                        
                        <div className="pt-2">
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            onClick={() => searchUsersMutation.reset()}
                          >
                            Back to Recommendations
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Recommendations
                      <>
                        <div className="space-y-1 mb-4">
                          <h3 className="text-sm font-medium mb-2">Recommended Based On Department</h3>
                          {recommendedUsers.filter(u => u.department === user?.department).length === 0 ? (
                            <p className="text-center text-muted-foreground py-2 text-sm">
                              No recommendations from your department yet
                            </p>
                          ) : (
                            recommendedUsers
                              .filter(u => u.department === user?.department)
                              .slice(0, 3)
                              .map((user) => (
                                <RecommendedUserItem 
                                  key={user.id}
                                  user={user}
                                  onSendRequest={() => sendRequestMutation.mutate(user.id)}
                                  isPending={sendRequestMutation.isPending}
                                  showDepartment
                                />
                              ))
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium mb-2">People You May Know</h3>
                          {recommendedUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-2 text-sm">
                              No recommendations available
                            </p>
                          ) : (
                            recommendedUsers
                              .filter(u => u.department !== user?.department)
                              .slice(0, 5)
                              .map((user) => (
                                <RecommendedUserItem 
                                  key={user.id}
                                  user={user}
                                  onSendRequest={() => sendRequestMutation.mutate(user.id)}
                                  isPending={sendRequestMutation.isPending}
                                  showDepartment
                                />
                              ))
                          )}
                        </div>
                      </>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
          
          {/* Chat area */}
          <div className="flex-1">
            <Card className="h-full">
              {selectedFriend ? (
                <>
                  <CardHeader className="pb-2 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedFriend.friendAvatar} />
                          <AvatarFallback>
                            {selectedFriend.friendName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{selectedFriend.friendName}</CardTitle>
                          <CardDescription>
                            {selectedFriend.isOnline 
                              ? <span className="text-green-500">Online</span>
                              : selectedFriend.lastActive 
                                ? `Last seen ${formatDistanceToNow(new Date(selectedFriend.lastActive), { addSuffix: true })}` 
                                : ''}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeFriendMutation.mutate(selectedFriend.friendship.id)}
                      >
                        <UserX className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4 pb-0 h-[calc(100vh-260px)] overflow-auto">
                    {isMessagesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                        <p className="text-muted-foreground mb-2">
                          Start a conversation with {selectedFriend.friendName}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <ChatMessage 
                            key={message.id}
                            message={message}
                            currentUserId={user?.id || 0}
                            showTime={index === 0 || messages[index - 1].senderId !== message.senderId}
                            formatTime={formatMessageTime}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-4 border-t">
                    <div className="flex w-full items-center gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Connect with fellow students, discuss study materials, and plan study sessions privately.
                  </p>
                  <Button onClick={() => setActiveTab("discover")}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find Friends to Message
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
