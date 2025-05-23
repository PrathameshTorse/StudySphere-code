import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StudyGroup, StudySession, insertStudyGroupSchema, insertStudySessionSchema } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Search,
  Plus,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Video,
  Loader2,
  User,
  UsersIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Group color options
const groupColors = [
  { name: "Purple", value: "#4338ca" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Yellow", value: "#ca8a04" },
  { name: "Red", value: "#dc2626" },
  { name: "Pink", value: "#db2777" },
  { name: "Orange", value: "#ea580c" },
  { name: "Teal", value: "#0d9488" },
];

// Common courses for the form
const commonCourses = [
  "Computer Science",
  "Data Structures",
  "Algorithms",
  "Operating Systems",
  "Database Systems",
  "Artificial Intelligence",
  "Machine Learning",
  "Web Development",
  "Mobile Development",
  "Software Engineering",
  "Computer Networks",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
];

export default function GroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);

  // Check URL parameters for create dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setIsCreateGroupDialogOpen(true);
      // Clean up URL after opening dialog
      navigate('/groups', { replace: true });
    }
  }, [navigate]);

  // Fetch study groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery<StudyGroup[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch study groups");
      return res.json();
    },
  });

  // Fetch user's groups
  const { data: userGroups = [], isLoading: loadingUserGroups } = useQuery<StudyGroup[]>({
    queryKey: [`/api/groups/user/${user?.id}`],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/groups/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user's study groups");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ["/api/sessions/upcoming"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch("/api/sessions/upcoming");
      if (!res.ok) throw new Error("Failed to fetch upcoming sessions");
      return res.json();
    },
    enabled: !!user,
  });

  // Setup form for creating a study group
  const groupForm = useForm<z.infer<typeof insertStudyGroupSchema>>({
    resolver: zodResolver(insertStudyGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      course: "",
      color: "#4338ca",
      creatorId: user?.id,
    },
  });

  // Setup form for creating a study session
  const sessionForm = useForm<z.infer<typeof insertStudySessionSchema>>({
    resolver: zodResolver(insertStudySessionSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      groupId: 0,
      location: "",
      isVirtual: false,
      meetingLink: "",
      createdBy: user?.id,
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertStudyGroupSchema>) => {
      const res = await apiRequest("POST", "/api/groups", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Study group created",
        description: "Your study group has been created successfully.",
      });
      groupForm.reset();
      setIsCreateGroupDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/user/${user?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create study group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertStudySessionSchema>) => {
      try {
        console.log("Creating session with values:", values);
        
        // Ensure dates are properly formatted
        const formattedValues = {
          ...values,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString()
        };
        
        console.log("Formatted values:", formattedValues);
        
        const res = await fetch(`/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedValues),
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to create study session');
        }
        
        return res.json();
      } catch (error) {
        console.error("Session creation error details:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Study session created",
        description: "Your study session has been scheduled successfully.",
      });
      sessionForm.reset();
      setIsSessionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/upcoming"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${selectedGroup?.id}/sessions`] });
    },
    onError: (error: Error) => {
      console.error("Session creation error:", error);
      toast({
        title: "Failed to create study session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/members`, {
        groupId,
        userId: user?.id,
        isAdmin: false,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Joined study group",
        description: "You have successfully joined the study group.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/user/${user?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join study group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle group creation
  const onCreateGroup = (values: z.infer<typeof insertStudyGroupSchema>) => {
    createGroupMutation.mutate(values);
  };

  // Handle session creation with validation
  const onCreateSession = (values: z.infer<typeof insertStudySessionSchema>) => {
    try {
      // Validate that start and end times are provided and are valid dates
      if (!values.startTime) {
        toast({
          title: "Start time required",
          description: "Please enter a valid start time",
          variant: "destructive",
        });
        return;
      }
      
      if (!values.endTime) {
        toast({
          title: "End time required",
          description: "Please enter a valid end time",
          variant: "destructive",
        });
        return;
      }
      
      // Validate that end time is after start time
      const startTime = new Date(values.startTime);
      const endTime = new Date(values.endTime);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        toast({
          title: "Invalid date format",
          description: "Please enter valid dates and times",
          variant: "destructive",
        });
        return;
      }
      
      if (endTime <= startTime) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time",
          variant: "destructive",
        });
        return;
      }
      
      // For virtual sessions, require a meeting link
      if (isVirtual && (!values.meetingLink || !values.meetingLink.trim())) {
        toast({
          title: "Meeting link required",
          description: "Please provide a meeting link for virtual sessions",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Form values before submission:", {
        ...values,
        isVirtual,
        meetingLink: isVirtual ? values.meetingLink : "",
      });
      
      createSessionMutation.mutate({
        ...values,
        isVirtual,
        meetingLink: isVirtual ? values.meetingLink : "",
      });
    } catch (error) {
      console.error("Error in session validation:", error);
      toast({
        title: "Validation error",
        description: "There was an error processing your form. Please check your inputs.",
        variant: "destructive",
      });
    }
  };

  // Handle joining a group
  const handleJoinGroup = (groupId: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a study group",
        variant: "destructive",
      });
      return;
    }
    
    joinGroupMutation.mutate(groupId);
  };

  // Open session dialog for a specific group
  const openSessionDialog = (group: StudyGroup) => {
    setSelectedGroup(group);
    sessionForm.reset({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      groupId: group.id,
      location: "",
      isVirtual: false,
      meetingLink: "",
      createdBy: user?.id,
    });
    setIsVirtual(false);
    setIsSessionDialogOpen(true);
  };

  // Filter groups based on active tab, search query, and course filter
  const getFilteredGroups = () => {
    const groupsList = activeTab === "mine" ? userGroups : groups;
    
    return groupsList.filter(group => {
      // Filter by course
      if (courseFilter && group.course !== courseFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          group.name.toLowerCase().includes(query) ||
          (group.description && group.description.toLowerCase().includes(query)) ||
          (group.course && group.course.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  };

  const filteredGroups = getFilteredGroups();
  
  // Check if user is a member of a group
  const isGroupMember = (groupId: number) => {
    return userGroups.some(group => group.id === groupId);
  };
  
  // Get unique courses from groups for filter dropdown
  const coursesSet = new Set<string>();
  groups.forEach(g => {
    if (g.course) coursesSet.add(g.course);
  });
  const availableCourses = Array.from(coursesSet);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Study Groups" },
            ]}
            className="mb-2"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
              <p className="text-gray-500 mt-1">Create or join study groups to collaborate with peers</p>
            </div>
            <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Create Group</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Create Study Group</DialogTitle>
                </DialogHeader>
                <Form {...groupForm}>
                  <form 
                    onSubmit={groupForm.handleSubmit(onCreateGroup)} 
                    className="space-y-4 mt-4"
                  >
                    <FormField
                      control={groupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Data Structures Study Group" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={groupForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the purpose and goals of this study group" 
                              className="resize-none" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={groupForm.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Course</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {commonCourses.map(course => (
                                <SelectItem key={course} value={course}>{course}</SelectItem>
                              ))}
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={groupForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Color</FormLabel>
                          <div className="grid grid-cols-4 gap-2">
                            {groupColors.map(color => (
                              <div 
                                key={color.value} 
                                className={`
                                  h-10 rounded-md cursor-pointer border-2 flex items-center justify-center
                                  ${field.value === color.value ? 'border-black' : 'border-transparent'}
                                `}
                                style={{ backgroundColor: color.value }}
                                onClick={() => field.onChange(color.value)}
                              >
                                {field.value === color.value && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="white"
                                    className="w-6 h-6"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-3 pt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateGroupDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createGroupMutation.isPending}
                      >
                        {createGroupMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Group"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Search and filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search study groups by name or course..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Select
                  value={courseFilter}
                  onValueChange={setCourseFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {availableCourses.map(course => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Study groups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Groups</TabsTrigger>
                {user && <TabsTrigger value="mine">My Groups</TabsTrigger>}
              </TabsList>
            </Tabs>
            
            {loadingGroups || (activeTab === "mine" && loadingUserGroups) ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-10 w-10 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: group.color || "#4338ca" }}
                          >
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            {group.course && (
                              <p className="text-sm text-gray-500">{group.course}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {group.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 pb-3 flex justify-between border-t border-gray-100 mt-2">
                      {isGroupMember(group.id) ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => openSessionDialog(group)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            View Group
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joinGroupMutation.isPending}
                        >
                          {joinGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          Join Group
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No study groups found</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  {searchQuery || courseFilter
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Create a new study group to collaborate with others!"}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create a Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Create Study Group</DialogTitle>
                    </DialogHeader>
                    <Form {...groupForm}>
                      <form 
                        onSubmit={groupForm.handleSubmit(onCreateGroup)} 
                        className="space-y-4 mt-4"
                      >
                        <FormField
                          control={groupForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Data Structures Study Group" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={groupForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the purpose and goals of this study group" 
                                  className="resize-none" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={groupForm.control}
                          name="course"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related Course</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {commonCourses.map(course => (
                                    <SelectItem key={course} value={course}>{course}</SelectItem>
                                  ))}
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={groupForm.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group Color</FormLabel>
                              <div className="grid grid-cols-4 gap-2">
                                {groupColors.map(color => (
                                  <div 
                                    key={color.value} 
                                    className={`
                                      h-10 rounded-md cursor-pointer border-2 flex items-center justify-center
                                      ${field.value === color.value ? 'border-black' : 'border-transparent'}
                                    `}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => field.onChange(color.value)}
                                  >
                                    {field.value === color.value && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="white"
                                        className="w-6 h-6"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end gap-3 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateGroupDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createGroupMutation.isPending}
                          >
                            {createGroupMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Group"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Upcoming Study Sessions</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {loadingSessions ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.slice(0, 3).map((session) => {
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
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              {session.isVirtual ? (
                                <>
                                  <Video className="h-3 w-3 mr-1" />
                                  <span>Virtual Meeting</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span>{session.location || "Location not specified"}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {upcomingSessions.length > 3 && (
                      <div className="text-center mt-2">
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => navigate("/sessions")}
                        >
                          View all ({upcomingSessions.length}) sessions
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No upcoming sessions scheduled</p>
                )}
              </CardContent>
            </Card>
            
            {/* My groups summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">My Study Groups</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {loadingUserGroups ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userGroups.length > 0 ? (
                  <div className="space-y-3">
                    {userGroups.map((group) => (
                      <button 
                        key={group.id} 
                        onClick={() => navigate(`/groups/${group.id}`)}
                        className="w-full text-left flex items-center px-3 py-2 rounded-md hover:bg-gray-50"
                      >
                        <span 
                          className="w-2 h-2 mr-3 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        ></span>
                        <span className="font-medium text-gray-700">{group.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UsersIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">You haven't joined any groups yet</p>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("all")}>
                      Browse Groups
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Group guidelines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Group Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">1</span>
                    </div>
                    <p>Be respectful and supportive of all group members</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">2</span>
                    </div>
                    <p>Share resources and knowledge with the group</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">3</span>
                    </div>
                    <p>Attend scheduled study sessions when possible</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">4</span>
                    </div>
                    <p>Contribute actively to group discussions</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Create session dialog */}
      <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Schedule Study Session</DialogTitle>
          </DialogHeader>
          <Form {...sessionForm}>
            <form 
              onSubmit={sessionForm.handleSubmit(onCreateSession)} 
              className="space-y-4 mt-4"
            >
              <FormField
                control={sessionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Final Exam Review" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sessionForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          onChange={(e) => {
                            console.log("Start date changed:", e.target.value);
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sessionForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          onChange={(e) => {
                            console.log("End date changed:", e.target.value);
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={sessionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What will be covered in this session?" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="virtual-meeting"
                  checked={isVirtual}
                  onCheckedChange={setIsVirtual}
                />
                <label
                  htmlFor="virtual-meeting"
                  className="text-sm font-medium cursor-pointer"
                >
                  This is a virtual meeting
                </label>
              </div>
              
              {isVirtual ? (
                <FormField
                  control={sessionForm.control}
                  name="meetingLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Link</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. https://zoom.us/j/123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={sessionForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Library Study Room 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex justify-end gap-3 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSessionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Session"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
