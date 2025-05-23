import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StudyGroup, StudySession } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Calendar, ArrowLeft, Clock, MapPin, Video, MessageSquare, SendHorizontal, Loader2 } from "lucide-react";
import { CreateSessionDialog } from "@/components/groups/create-session-dialog";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function GroupDetailPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>("/groups/:id");
  const groupId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("overview");
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch group details
  const { data: group, isLoading: loadingGroup } = useQuery<StudyGroup>({
    queryKey: [`/api/groups/${groupId}`],
    queryFn: async () => {
      if (!groupId) return null;
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch group details");
      return res.json();
    },
    enabled: !!groupId,
  });

  // Fetch group sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: [`/api/groups/${groupId}/sessions`],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await fetch(`/api/groups/${groupId}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch group sessions");
      return res.json();
    },
    enabled: !!groupId,
  });

  // Fetch group members
  const { data: members = [], isLoading: loadingMembers } = useQuery<any[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (!res.ok) throw new Error("Failed to fetch group members");
      return res.json();
    },
    enabled: !!groupId,
  });

  // Fetch group chat messages
  const { data: chat = [], isLoading: loadingChat } = useQuery({
    queryKey: [`/api/groups/${groupId}/chat`],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await fetch(`/api/groups/${groupId}/chat`);
      if (!res.ok) throw new Error('Failed to fetch group chat');
      return res.json();
    },
    enabled: !!groupId && activeTab === 'chat'
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest('POST', `/api/groups/${groupId}/chat`, { message });
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/chat`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    sendMessageMutation.mutate(messageText);
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chat.length > 0 && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  if (!groupId) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Group not found</h1>
            <p className="text-gray-500 mb-6">The study group you're looking for doesn't exist or you don't have access.</p>
            <Button onClick={() => navigate("/groups")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Study Groups", href: "/groups" },
              { name: group?.name || "Loading..." },
            ]}
            className="mb-2"
          />
          
          {loadingGroup ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : group ? (
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-2">
              <div className="flex items-center gap-4">
                <div 
                  className="h-16 w-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: group.color || "#4338ca" }}
                >
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                  {group.course && (
                    <div className="flex items-center text-gray-500 mt-1">
                      <span className="text-sm">{group.course}</span>
                      <span className="mx-2">•</span>
                      <span className="text-sm">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/groups")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Groups
                </Button>
                <Button onClick={() => setActiveTab("sessions")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Group not found</h1>
              <p className="text-gray-500 mb-6">The study group you're looking for doesn't exist or you don't have access.</p>
              <Button onClick={() => navigate("/groups")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Groups
              </Button>
            </div>
          )}
        </div>
        
        {group && (
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>About this group</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {group.description ? (
                        <p className="text-gray-700">{group.description}</p>
                      ) : (
                        <p className="text-gray-500 italic">No description provided.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingSessions ? (
                        <div className="animate-pulse space-y-3">
                          <div className="h-20 bg-gray-200 rounded"></div>
                          <div className="h-20 bg-gray-200 rounded"></div>
                        </div>
                      ) : sessions.length > 0 ? (
                        <div className="space-y-4">
                          {sessions.slice(0, 2).map((session) => {
                            const startDate = new Date(session.startTime);
                            const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                            const day = startDate.getDate();
                            
                            return (
                              <div key={session.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="bg-primary-100 rounded-md h-12 w-12 flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-primary-800">{month}</span>
                                  <span className="text-lg font-bold text-primary-800">{day}</span>
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{session.title}</h3>
                                  <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>
                                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                      {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {sessions.length > 2 && (
                            <Button 
                              variant="link" 
                              className="w-full"
                              onClick={() => setActiveTab("sessions")}
                            >
                              View all ({sessions.length}) sessions
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-gray-500 text-sm mb-2">No upcoming sessions</p>
                          <Button variant="outline" size="sm" onClick={() => setActiveTab("sessions")}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule a session
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Group Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingMembers ? (
                        <div className="animate-pulse space-y-3">
                          <div className="h-8 bg-gray-200 rounded"></div>
                          <div className="h-8 bg-gray-200 rounded"></div>
                          <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                      ) : members.length > 0 ? (
                        <div className="space-y-2">
                          {members.slice(0, 5).map((member) => (
                            <div key={member.userId} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                                  {member.user?.username?.slice(0, 2).toUpperCase() || "U"}
                                </div>
                                <span className="ml-3 text-gray-700">{member.user?.displayName || member.user?.username}</span>
                              </div>
                              {member.isAdmin && (
                                <span className="text-xs bg-primary-100 text-primary-800 py-1 px-2 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
                          ))}
                          {members.length > 5 && (
                            <Button 
                              variant="link" 
                              className="w-full text-sm"
                              onClick={() => setActiveTab("members")}
                            >
                              View all members
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No members found</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-24 bg-gray-200 rounded"></div>
                      <div className="h-24 bg-gray-200 rounded"></div>
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                  ) : sessions.length > 0 ? (
                    <div className="space-y-6">
                      {sessions.map((session) => (
                        <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg text-gray-900">{session.title}</h3>
                            <div className="flex items-center mt-2 md:mt-0">
                              <div className="text-sm text-gray-500">
                                {format(new Date(session.startTime), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 mb-3">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>
                                {format(new Date(session.startTime), "h:mm a")} - 
                                {format(new Date(session.endTime), "h:mm a")}
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              {session.isVirtual ? (
                                <>
                                  <Video className="mr-2 h-4 w-4" />
                                  <span>Virtual Meeting</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="mr-2 h-4 w-4" />
                                  <span>{session.location || "Location not specified"}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {session.description && (
                            <p className="text-gray-700 mb-4">{session.description}</p>
                          )}
                          
                          {session.isVirtual && session.meetingLink && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => session.meetingLink && window.open(session.meetingLink, '_blank')}
                            >
                              Join Virtual Meeting
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No study sessions scheduled</h3>
                      <p className="text-gray-500 mb-4">Schedule a study session to collaborate with your group members.</p>
                      <CreateSessionDialog groupId={Number(groupId)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="members" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Group Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ) : members.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {members.map((member) => (
                        <div key={member.userId} className="py-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                              {member.user?.username?.slice(0, 2).toUpperCase() || "U"}
                            </div>
                            <div className="ml-4">
                              <h4 className="font-medium text-gray-900">
                                {member.user?.displayName || member.user?.username}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          {member.isAdmin && (
                            <span className="text-xs bg-primary-100 text-primary-800 py-1 px-2 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 py-4 text-center">No members found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="chat" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Group Chat</CardTitle>
                  <CardDescription>Chat with your group members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] border rounded-md mb-4 p-4 overflow-y-auto flex flex-col space-y-4">
                    {loadingChat ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : chat?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                        <p className="text-muted-foreground max-w-md">
                          Start a conversation with your group members
                        </p>
                      </div>
                    ) : (
                      <>
                        {chat?.map((message) => (
                          <div 
                            key={message.id} 
                            className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-[80%] px-3 py-2 rounded-lg ${
                                message.userId === user?.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {message.userId === user?.id ? 'You' : message.userName || 'Unknown'}
                                </span>
                                <span className="text-xs opacity-70">
                                  {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm">{message.message}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      disabled={sendMessageMutation.isPending}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={sendMessageMutation.isPending || !messageText.trim()}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
} 