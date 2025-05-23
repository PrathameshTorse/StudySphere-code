import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StudyProgressTracker } from "@/components/dashboard/study-progress";
import { StudyTimer } from "@/components/dashboard/study-timer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  BarChart2, 
  Clock, 
  GraduationCap, 
  BookOpen, 
  Users, 
  MessageSquare,
  FileText 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface EventItem {
  id: number;
  title: string;
  date: string;
  type: 'session' | 'group' | 'reminder';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch user statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/user-stats"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/user-stats?userId=${user?.id}`);
        if (!res.ok) return {
          papersUploaded: 0,
          discussionsStarted: 0,
          discussionReplies: 0,
          groupsJoined: 0,
          sessionsAttended: 0,
          totalStudyHours: 0
        };
        return await res.json();
      } catch (error) {
        console.error("Error fetching user stats:", error);
        return {
          papersUploaded: 0,
          discussionsStarted: 0,
          discussionReplies: 0,
          groupsJoined: 0,
          sessionsAttended: 0,
          totalStudyHours: 0
        };
      }
    },
    // Fallback data for when API fails or isn't implemented
    placeholderData: {
      papersUploaded: 5,
      discussionsStarted: 8,
      discussionReplies: 23,
      groupsJoined: 3,
      sessionsAttended: 12,
      totalStudyHours: 45
    }
  });
  
  // Fetch upcoming events
  const { data: events } = useQuery({
    queryKey: ["/api/upcoming-events"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/upcoming-events?userId=${user?.id}`);
        if (!res.ok) return [];
        return await res.json();
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
        return [];
      }
    },
    // Fallback data
    placeholderData: [
      {
        id: 1,
        title: "Group Study Session: Advanced Calculus",
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: "session" as const
      },
      {
        id: 2,
        title: "Physics Exam Preparation",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: "group" as const
      },
      {
        id: 3,
        title: "Computer Science Project Deadline",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: "reminder" as const
      }
    ]
  });
  
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
        {/* Greeting Card */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-1">Welcome back, {user?.displayName || user?.username}!</h2>
            <p className="text-muted-foreground">
              Track your study progress, manage your time, and stay on top of your academic goals.
            </p>
          </CardContent>
        </Card>
        
        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="tools">Study Tools</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Papers Uploaded</p>
                    <p className="text-2xl font-bold">{stats?.papersUploaded}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discussions</p>
                    <p className="text-2xl font-bold">{stats?.discussionsStarted}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Groups Joined</p>
                    <p className="text-2xl font-bold">{stats?.groupsJoined}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions Attended</p>
                    <p className="text-2xl font-bold">{stats?.sessionsAttended}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Study Hours</p>
                    <p className="text-2xl font-bold">{stats?.totalStudyHours}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>Your scheduled study sessions and deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events && events.length > 0 ? (
                    events.map((event: EventItem) => (
                      <div key={event.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${
                            event.type === 'session' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            event.type === 'group' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }`}>
                            {event.type === 'session' ? <Clock className="h-4 w-4" /> :
                             event.type === 'group' ? <Users className="h-4 w-4" /> :
                             <BookOpen className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.date).toLocaleDateString(undefined, { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 text-muted-foreground">
                      <p>No upcoming events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <StudyProgressTracker />
          </TabsContent>
          
          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <StudyTimer />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
