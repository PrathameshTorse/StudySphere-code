import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  Users, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import { StudySession, StudyGroup } from "@shared/schema";
import { format, isToday, isTomorrow, isPast, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch all study sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
  });
  
  // Fetch user's study groups
  const { data: userGroups, isLoading: loadingGroups } = useQuery<StudyGroup[]>({
    queryKey: ["/api/groups/user"],
    queryFn: async () => {
      const res = await fetch('/api/groups/user');
      if (!res.ok) throw new Error('Failed to fetch user groups');
      return res.json();
    },
  });
  
  const filteredSessions = sessions?.filter(session => {
    const matchesQuery = searchQuery === "" || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const sessionDate = new Date(session.startTime);
    const matchesTimeFilter = 
      timeFilter === "all" || 
      (timeFilter === "upcoming" && !isPast(sessionDate)) ||
      (timeFilter === "past" && isPast(sessionDate));
    
    return matchesQuery && matchesTimeFilter;
  }) || [];
  
  // Group sessions by date for list view
  const groupedSessions: Record<string, StudySession[]> = {};
  filteredSessions.forEach(session => {
    const date = new Date(session.startTime).toDateString();
    if (!groupedSessions[date]) {
      groupedSessions[date] = [];
    }
    groupedSessions[date].push(session);
  });
  
  // Create calendar days for the current month view
  const getCalendarDays = () => {
    const days = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get the first day to display (might be from previous month)
    const firstDayToDisplay = new Date(firstDay);
    firstDayToDisplay.setDate(firstDayToDisplay.getDate() - firstDayToDisplay.getDay());
    
    // Get the last day to display (might be from next month)
    const lastDayToDisplay = new Date(lastDay);
    const daysToAdd = 6 - lastDayToDisplay.getDay();
    lastDayToDisplay.setDate(lastDayToDisplay.getDate() + daysToAdd);
    
    // Generate all days in the calendar view
    let day = new Date(firstDayToDisplay);
    while (day <= lastDayToDisplay) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    
    return days;
  };
  
  const calendarDays = getCalendarDays();
  
  // Get sessions for a specific day (for calendar view)
  const getSessionsForDay = (date: Date) => {
    return filteredSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate.toDateString() === date.toDateString();
    });
  };
  
  const handlePreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };
  
  const formatDateLabel = (date: string) => {
    const sessionDate = new Date(date);
    if (isToday(sessionDate)) {
      return "Today";
    } else if (isTomorrow(sessionDate)) {
      return "Tomorrow";
    } else {
      return format(sessionDate, "EEEE, MMMM d, yyyy");
    }
  };
  
  const getSessionStatusBadge = (session: StudySession) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    if (now > endTime) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-500">Completed</Badge>;
    } else if (now >= startTime && now <= endTime) {
      return <Badge variant="default" className="bg-green-100 text-green-800">In Progress</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    }
  };
  
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Study Sessions" },
            ]}
            className="mb-2"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Sessions</h1>
              <p className="text-gray-500 mt-1">View and manage all scheduled study sessions</p>
            </div>
            
            <Button asChild>
              <a href="/groups">
                <Plus className="mr-2 h-4 w-4" />
                Schedule New Session
              </a>
            </Button>
          </div>
        </div>
        
        {/* Filters and search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sessions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={timeFilter} onValueChange={(value: "all" | "upcoming" | "past") => setTimeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Time filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sessions</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          
          {/* List View */}
          <TabsContent value="list">
            {loadingSessions ? (
              // Loading skeletons
              <div className="space-y-6">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Card>
                      <CardContent className="p-0">
                        {Array(2).fill(0).map((_, j) => (
                          <div key={j} className="p-4 border-b border-gray-100 last:border-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <Skeleton className="h-12 w-12 rounded-full" />
                              <div className="flex-grow space-y-2">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                              </div>
                              <Skeleton className="h-9 w-24" />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : filteredSessions.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedSessions).map(([date, daySessions]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="font-medium text-gray-900">{formatDateLabel(date)}</h3>
                    <Card>
                      <CardContent className="p-0">
                        {daySessions.map((session) => {
                          const startTime = new Date(session.startTime);
                          const endTime = new Date(session.endTime);
                          
                          return (
                            <div key={session.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="bg-primary-100 rounded-full h-12 w-12 flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-primary-800">
                                    {format(startTime, "MMM").toUpperCase()}
                                  </span>
                                  <span className="text-lg font-bold text-primary-800">
                                    {format(startTime, "d")}
                                  </span>
                                </div>
                                
                                <div className="flex-grow">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{session.title}</h4>
                                      <div className="text-sm text-gray-500 space-y-1 mt-1">
                                        <div className="flex items-center">
                                          <Clock className="h-3.5 w-3.5 mr-1" />
                                          <span>
                                            {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                                          </span>
                                        </div>
                                        
                                        {session.groupId && (
                                          <div className="flex items-center">
                                            <Users className="h-3.5 w-3.5 mr-1" />
                                            <span>
                                              {userGroups?.find(g => g.id === session.groupId)?.name || "Study Group"}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {session.location && (
                                          <div className="flex items-center">
                                            <MapPin className="h-3.5 w-3.5 mr-1" />
                                            <span>{session.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="hidden sm:block">
                                      {getSessionStatusBadge(session)}
                                    </div>
                                  </div>
                                  
                                  {session.description && (
                                    <p className="text-sm text-gray-600 mt-2">{session.description}</p>
                                  )}
                                  
                                  <div className="sm:hidden mt-2">
                                    {getSessionStatusBadge(session)}
                                  </div>
                                </div>
                                
                                {session.meetingLink && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                                      <LinkIcon className="h-3.5 w-3.5 mr-1" />
                                      Join
                                      <ArrowUpRight className="ml-1 h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-1">No sessions found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery 
                    ? "Try changing your search or filters"
                    : timeFilter === "upcoming"
                    ? "You don't have any upcoming sessions"
                    : timeFilter === "past"
                    ? "No past study sessions found"
                    : "No study sessions found"}
                </p>
                <Button asChild>
                  <a href="/groups">Schedule a session</a>
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-6">
                {/* Calendar header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg">
                    {format(currentMonth, "MMMM yyyy")}
                  </h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handlePreviousMonth}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleNextMonth}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = new Date().toDateString() === day.toDateString();
                    const daySessionsCount = getSessionsForDay(day).length;
                    const hasEvents = daySessionsCount > 0;
                    
                    return (
                      <div
                        key={index}
                        className={`
                          min-h-24 p-1 border rounded-md
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                          ${isToday ? 'border-primary' : 'border-gray-200'}
                          ${hasEvents ? 'hover:border-primary hover:shadow-sm cursor-pointer' : ''}
                        `}
                      >
                        <div className="text-right p-1">
                          <span className={`text-sm inline-flex items-center justify-center w-6 h-6 rounded-full
                            ${isToday ? 'bg-primary text-white font-medium' : ''}
                          `}>
                            {format(day, "d")}
                          </span>
                        </div>
                        
                        <div className="mt-1">
                          {loadingSessions ? (
                            hasEvents && <Skeleton className="h-4 w-full mt-1" />
                          ) : (
                            getSessionsForDay(day).slice(0, 3).map((session, idx) => (
                              <div key={idx} className="text-xs p-1 mb-1 truncate rounded bg-primary-50 text-primary-700 border border-primary-100">
                                {format(new Date(session.startTime), "h:mm a")} - {session.title}
                              </div>
                            ))
                          )}
                          
                          {daySessionsCount > 3 && (
                            <div className="text-xs text-gray-500 p-1">
                              +{daySessionsCount - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}