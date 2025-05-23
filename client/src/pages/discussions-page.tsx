import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DiscussionPost, User, insertDiscussionPostSchema } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquareText,
  Search,
  Plus,
  Filter,
  ChevronUp,
  ChevronDown,
  Calendar,
  Loader2,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

// List of common academic courses for the sample data
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

export default function DiscussionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");

  // Fetch discussion posts
  const { data: discussions = [], isLoading } = useQuery<DiscussionPost[]>({
    queryKey: ["/api/discussions"],
    queryFn: async () => {
      const res = await fetch("/api/discussions");
      if (!res.ok) throw new Error("Failed to fetch discussions");
      return res.json();
    },
  });

  // Fetch users to display author information
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      // Note: In a real application, you'd have a dedicated API for this
      // Since we don't have one in the current setup, we'll mock the behavior
      // by extracting unique user IDs from discussions and making separate requests
      
      // This is just a placeholder - actual implementation would depend on your API
      const userIds: number[] = [];
      const userIdSet = new Set<number>();
      discussions.forEach(d => {
        if (!userIdSet.has(d.authorId)) {
          userIdSet.add(d.authorId);
          userIds.push(d.authorId);
        }
      });
      return []; // Placeholder for users data
    },
    enabled: discussions.length > 0,
  });

  // Create discussion post form
  const form = useForm<z.infer<typeof insertDiscussionPostSchema>>({
    resolver: zodResolver(insertDiscussionPostSchema),
    defaultValues: {
      title: "",
      content: "",
      course: "",
      tags: [],
      authorId: user?.id,
    },
  });

  // Create discussion mutation
  const createDiscussionMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertDiscussionPostSchema>) => {
      const res = await apiRequest("POST", "/api/discussions", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Discussion created",
        description: "Your question has been posted successfully.",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create discussion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: number }) => {
      const res = await apiRequest("POST", `/api/discussions/${id}/vote`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle discussion creation
  const onSubmit = (values: z.infer<typeof insertDiscussionPostSchema>) => {
    createDiscussionMutation.mutate(values);
  };

  // Handle voting
  const handleVote = (id: number, value: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on discussions",
        variant: "destructive",
      });
      return;
    }
    
    voteMutation.mutate({ id, value });
  };

  // Filter discussions based on active tab, search query, and course filter
  const getFilteredDiscussions = () => {
    return discussions.filter(discussion => {
      // Filter by tab
      if (activeTab === "mine" && discussion.authorId !== user?.id) {
        return false;
      }
      
      // Filter by course
      if (courseFilter && discussion.course !== courseFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          discussion.title.toLowerCase().includes(query) ||
          discussion.content.toLowerCase().includes(query) ||
          (discussion.course && discussion.course.toLowerCase().includes(query)) ||
          (discussion.tags && discussion.tags.some(tag => tag.toLowerCase().includes(query)))
        );
      }
      
      return true;
    });
  };

  const filteredDiscussions = getFilteredDiscussions();
  
  // Get unique courses from discussions for filter dropdown
  const coursesSet = new Set<string>();
  const availableCourses: string[] = [];
  discussions.forEach(d => {
    if (d.course && !coursesSet.has(d.course)) {
      coursesSet.add(d.course);
      availableCourses.push(d.course);
    }
  });

  // Get formatted date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };
  
  // Render popular tags
  const renderPopularTags = () => {
    // Get unique tags from discussions
    const tagsSet = new Set<string>();
    const uniqueTags: string[] = [];
    
    discussions.forEach(d => {
      if (d.tags) {
        d.tags.forEach(tag => {
          if (tag && !tagsSet.has(tag)) {
            tagsSet.add(tag);
            uniqueTags.push(tag);
          }
        });
      }
    });
    
    if (uniqueTags.length === 0) {
      return <p className="text-sm text-gray-500">No tags available yet</p>;
    }
    
    return uniqueTags.slice(0, 12).map((tag, idx) => (
      <Badge 
        key={idx} 
        variant="outline" 
        className="cursor-pointer hover:bg-primary-50 hover:text-primary-700"
        onClick={() => setSearchQuery(tag)}
      >
        <Tag className="h-3 w-3 mr-1" />
        {tag}
      </Badge>
    ));
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Discussion Forums" },
            ]}
            className="mb-2"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Discussion Forums</h1>
              <p className="text-gray-500 mt-1">Ask questions and participate in academic discussions</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  <span>Ask a Question</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Post a Question</DialogTitle>
                  <DialogDescription>
                    Ask your academic question to get help from the community
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form 
                    onSubmit={form.handleSubmit(onSubmit)} 
                    className="space-y-4 mt-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. How do I implement a binary search tree?" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Be specific and clear about your question
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide all the necessary details to help others understand your question..." 
                              className="min-h-[150px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Course</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                              <SelectContent>
                                {commonCourses.map(course => (
                                  <SelectItem key={course} value={course}>{course}</SelectItem>
                                ))}
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (comma separated)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. algorithms, data structures" 
                              onChange={(e) => {
                                const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                                field.onChange(tagsArray);
                              }}
                              value={field.value ? field.value.join(', ') : ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Add tags to help others find your question
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-3 pt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createDiscussionMutation.isPending}
                      >
                        {createDiscussionMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          "Post Question"
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
                  placeholder="Search discussions by title, content, or tags..."
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
        
        {/* Discussions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Discussions</TabsTrigger>
                {user && <TabsTrigger value="mine">My Questions</TabsTrigger>}
              </TabsList>
            </Tabs>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredDiscussions.length > 0 ? (
              <div className="space-y-4">
                {filteredDiscussions.map((discussion) => (
                  <Card key={discussion.id} className="overflow-hidden hover:border-primary/40 transition-colors">
                    <a href={`/discussions/${discussion.id}`}>
                      <CardHeader className="p-4 pb-0">
                        <div className="flex justify-between items-start gap-4">
                          <CardTitle className="text-lg font-semibold">
                            {discussion.title}
                          </CardTitle>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVote(discussion.id, 1);
                              }}
                            >
                              <ChevronUp className="h-5 w-5" />
                            </Button>
                            <span className="font-medium text-sm min-w-[2ch] text-center">
                              {discussion.votes}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVote(discussion.id, -1);
                              }}
                            >
                              <ChevronDown className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-gray-600 line-clamp-2">{discussion.content}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {discussion.course && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                              {discussion.course}
                            </Badge>
                          )}
                          {discussion.tags && discussion.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-100">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 border-t border-gray-100 flex justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDate(discussion.createdAt.toString())}</span>
                        </div>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback>
                              {user && discussion.authorId === user.id
                                ? user.displayName?.substring(0, 2) || user.username.substring(0, 2)
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {user && discussion.authorId === user.id
                              ? "You"
                              : "User"}
                          </span>
                        </div>
                      </CardFooter>
                    </a>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquareText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No discussions found</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  {searchQuery || courseFilter
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Start a discussion to get the conversation going!"}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ask a Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Post a Question</DialogTitle>
                      <DialogDescription>
                        Ask your academic question to get help from the community
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form 
                        onSubmit={form.handleSubmit(onSubmit)} 
                        className="space-y-4 mt-4"
                      >
                        {/* Form fields duplicated from above - could be refactored */}
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. How do I implement a binary search tree?" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Be specific and clear about your question
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Details</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Provide all the necessary details to help others understand your question..." 
                                  className="min-h-[150px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="course"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related Course</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {commonCourses.map(course => (
                                      <SelectItem key={course} value={course}>{course}</SelectItem>
                                    ))}
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma separated)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. algorithms, data structures" 
                                  onChange={(e) => {
                                    const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                                    field.onChange(tagsArray);
                                  }}
                                  value={field.value ? field.value.join(', ') : ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Add tags to help others find your question
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end gap-3 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createDiscussionMutation.isPending}
                          >
                            {createDiscussionMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Posting...
                              </>
                            ) : (
                              "Post Question"
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
            {/* Popular tags */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Popular Tags</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-2">
                  {renderPopularTags()}
                </div>
              </CardContent>
            </Card>
            
            {/* Discussion guidelines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Discussion Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">1</span>
                    </div>
                    <p>Be clear and specific about your question</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">2</span>
                    </div>
                    <p>Include code snippets or examples when relevant</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">3</span>
                    </div>
                    <p>Be respectful of other community members</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">4</span>
                    </div>
                    <p>Upvote helpful questions and answers</p>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs">5</span>
                    </div>
                    <p>Report any inappropriate content</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
