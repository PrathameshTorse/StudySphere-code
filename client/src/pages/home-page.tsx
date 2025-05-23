import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  FileText,
  MessageSquareText,
  FileEdit,
  Users,
  Calendar,
  Download,
  ChevronRight
} from "lucide-react";
import { Activity, DiscussionPost, Paper, StudySession } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useState } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [, navigate] = useLocation();
  
  // Fetch recent activities
  const { data: activities, isLoading: loadingActivities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const res = await fetch('/api/activities?limit=5');
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
  });
  
  // Fetch popular papers
  const { data: papers, isLoading: loadingPapers } = useQuery<Paper[]>({
    queryKey: ["/api/papers"],
    queryFn: async () => {
      const res = await fetch('/api/papers');
      if (!res.ok) throw new Error('Failed to fetch papers');
      const allPapers = await res.json();
      // Sort by downloads and take top 3
      return allPapers.sort((a: Paper, b: Paper) => b.downloads - a.downloads).slice(0, 3);
    },
  });
  
  // Fetch upcoming study sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ["/api/sessions/upcoming"],
    queryFn: async () => {
      const res = await fetch('/api/sessions/upcoming');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
    enabled: !!user
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Home</h1>
          <Button 
            className="hidden sm:flex items-center"
            onClick={() => navigate("/papers")}
          >
            <span>Create New</span>
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => navigate("/papers")} 
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium text-gray-900">Past Papers</h3>
            <p className="text-xs text-gray-500 mt-1">Access previous exams</p>
          </button>
          
          <button 
            onClick={() => navigate("/discussions")} 
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Discussions</h3>
            <p className="text-xs text-gray-500 mt-1">Join academic forums</p>
          </button>
          
          <button 
            onClick={() => navigate("/groups")} 
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Study Groups</h3>
            <p className="text-xs text-gray-500 mt-1">Collaborate with peers</p>
          </button>
        </div>
        
        {/* Recent Activity and Upcoming Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-lg">Recent Activity</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {loadingActivities ? (
                  // Loading skeletons
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-3 flex-1">
                          <Skeleton className="h-4 w-1/3 mb-2" />
                          <Skeleton className="h-20 w-full rounded-lg mb-2" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50">
                      <div className="flex">
                        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                          {activity.type === 'paper_upload' && <FileText className="h-5 w-5" />}
                          {activity.type === 'post_created' && <MessageSquareText className="h-5 w-5" />}
                          {activity.type === 'group_created' && <Users className="h-5 w-5" />}
                          {activity.type === 'session_created' && <Calendar className="h-5 w-5" />}
                          {activity.type === 'resource_shared' && <FileText className="h-5 w-5" />}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.type === 'paper_upload' && (
                              <>User shared a new past paper</>
                            )}
                            {activity.type === 'post_created' && (
                              <>User posted a new question</>
                            )}
                            {activity.type === 'group_created' && (
                              <>User created a new study group</>
                            )}
                            {activity.type === 'session_created' && (
                              <>User scheduled a new study session</>
                            )}
                            {activity.type === 'resource_shared' && (
                              <>User shared a resource (deprecated)</>
                            )}
                          </p>
                          <div className="mt-2 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center">
                              {activity.type === 'paper_upload' && (
                                <FileText className="text-red-500 text-xl mr-2" />
                              )}
                              {activity.type === 'post_created' && (
                                <MessageSquareText className="text-blue-500 text-xl mr-2" />
                              )}
                              {activity.type === 'group_created' && (
                                <Users className="text-green-500 text-xl mr-2" />
                              )}
                              {activity.type === 'session_created' && (
                                <Calendar className="text-purple-500 text-xl mr-2" />
                              )}
                              {activity.type === 'resource_shared' && (
                                <FileText className="text-gray-500 text-xl mr-2" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.metadata?.title || "Untitled"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {activity.type === 'paper_upload' && "Paper"}
                                  {activity.type === 'post_created' && "Discussion"}
                                  {activity.type === 'group_created' && "Study Group"}
                                  {activity.type === 'session_created' && activity.metadata?.groupName}
                                  {activity.type === 'resource_shared' && "Deprecated"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <span>{new Date(activity.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No recent activity
                  </div>
                )}
              </div>
              
              <div className="px-6 py-3 bg-gray-50 text-center">
                <Button variant="link" className="text-primary" onClick={() => setShowAllActivity(!showAllActivity)}>
                  View all activity
                </Button>
              </div>
            </div>
            
            {/* Popular Papers Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-semibold text-lg">Popular Past Papers</h2>
                <Button 
                  variant="link" 
                  className="text-sm text-primary hover:text-primary-700"
                  onClick={() => navigate("/papers")}
                >
                  View all
                </Button>
              </div>
              
              <div className="divide-y divide-gray-200">
                {loadingPapers ? (
                  // Loading skeletons
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex items-start">
                        <Skeleton className="h-5 w-5 mr-3" />
                        <div>
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-5" />
                    </div>
                  ))
                ) : papers && papers.length > 0 ? (
                  papers.map((paper) => (
                    <div key={paper.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-start">
                        <FileText className="text-gray-400 text-xl mt-0.5 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">{paper.title}</h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <span>{paper.course}</span>
                            <span className="mx-1">•</span>
                            <span>{paper.year}</span>
                            <span className="mx-1">•</span>
                            <span>Downloaded {paper.downloads} times</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Download logic
                          window.open(paper.fileUrl, "_blank");
                          // Increment download count
                          fetch(`/api/papers/${paper.id}/download`, { method: 'POST' });
                        }}
                      >
                        <Download className="h-5 w-5 text-gray-500 hover:text-primary" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No papers available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-semibold text-lg">Upcoming Study Sessions</h2>
                <Button 
                  variant="link" 
                  className="text-sm text-primary hover:text-primary-700"
                  onClick={() => navigate("/sessions")}
                >
                  View all
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                {loadingSessions ? (
                  // Loading skeletons
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))
                ) : sessions && sessions.length > 0 ? (
                  sessions.map((session) => {
                    const sessionDate = new Date(session.startTime);
                    const month = format(sessionDate, 'MMM').toUpperCase();
                    const day = format(sessionDate, 'd');
                    
                    return (
                      <div key={session.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="bg-primary-100 rounded-md h-12 w-12 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary-800">{month}</span>
                          <span className="text-lg font-bold text-primary-800">{day}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{session.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(sessionDate, 'h:mm a')} - 
                            {format(new Date(session.endTime), 'h:mm a')}
                          </p>
                          <div className="mt-2 flex items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              {session.location || (session.isVirtual ? 'Virtual Meeting' : 'Location not specified')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-2">
                    No upcoming sessions
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Helper function to format time
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
}
