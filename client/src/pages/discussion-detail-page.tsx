import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter,
  CardDescription 
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Share2,
  Bookmark,
  Tag,
  Flag,
  Loader2,
  ArrowLeft,
  MessageSquareText,
  Send,
  ChevronDown,
  ChevronRight,
  Reply,
} from "lucide-react";
import { ExtendedDiscussionPost, ExtendedDiscussionReply, ExtendedDiscussionComment } from "@shared/types";
import { insertDiscussionReplySchema, insertDiscussionCommentSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

export default function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortOrder, setSortOrder] = useState<'votes' | 'newest'>('votes');
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [commentForms, setCommentForms] = useState<Record<number, boolean>>({});
  
  // Fetch the discussion post details
  const { data: discussion, isLoading: isLoadingDiscussion } = useQuery<ExtendedDiscussionPost>({
    queryKey: [`/api/discussions/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/discussions/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          navigate("/discussions");
          throw new Error("Discussion not found");
        }
        throw new Error("Failed to fetch discussion");
      }
      return res.json();
    },
  });

  // Form for submitting a reply
  const replyForm = useForm<z.infer<typeof insertDiscussionReplySchema>>({
    resolver: zodResolver(insertDiscussionReplySchema),
    defaultValues: {
      content: "",
      authorId: user?.id || 0,
      postId: Number(id),
    },
  });
  
  // Update this useEffect to reset the form when the user changes
  useEffect(() => {
    if (user) {
      replyForm.setValue('authorId', user.id);
    }
  }, [user, replyForm]);
  
  // Update this useEffect to reset the form when the post ID changes
  useEffect(() => {
    if (id) {
      replyForm.setValue('postId', Number(id));
    }
  }, [id, replyForm]);
  
  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertDiscussionReplySchema>) => {
      if (!values.content.trim()) {
        throw new Error("Answer content cannot be empty");
      }
      
      // Ensure we have the correct postId
      const payload = {
        ...values,
        postId: Number(id),
        authorId: user?.id
      };
      
      console.log("Submitting reply:", payload);
      
      const res = await fetch(`/api/discussions/${id}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      
      if (!res.ok) {
        // Try to parse response as JSON first
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || errorData.error || "Failed to post reply");
        } catch (jsonError) {
          // If JSON parsing fails, try text
          const errorText = await res.text();
          throw new Error(errorText || "Failed to post reply");
        }
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply posted successfully",
        description: "Your answer has been added to the discussion",
      });
      replyForm.reset({
        content: "",
        authorId: user?.id || 0,
        postId: Number(id),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/discussions/${id}`] });
    },
    onError: (error: Error) => {
      console.error("Reply submission error:", error);
      toast({
        title: "Failed to post reply",
        description: error.message || "There was a problem submitting your answer",
        variant: "destructive",
      });
    },
  });
  
  // Vote on a reply mutation
  const voteReplyMutation = useMutation({
    mutationFn: async ({ 
      replyId, 
      value 
    }: { 
      replyId: number; 
      value: number 
    }) => {
      const res = await apiRequest(
        "POST", 
        `/api/discussion-replies/${replyId}/vote`, 
        { value }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/discussions/${id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Voting failed",
        description: error.message || "There was a problem recording your vote",
        variant: "destructive",
      });
    },
  });
  
  // Mark reply as accepted answer mutation
  const acceptAnswerMutation = useMutation({
    mutationFn: async (replyId: number) => {
      const res = await apiRequest(
        "POST", 
        `/api/discussion-replies/${replyId}/accept`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Answer accepted",
        description: "You've marked this as the accepted solution",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/discussions/${id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept answer",
        description: error.message || "There was a problem marking this as the accepted solution",
        variant: "destructive",
      });
    },
  });
  
  // Handle reply submission with better validation
  const onSubmitReply = (values: z.infer<typeof insertDiscussionReplySchema>) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to post an answer",
        variant: "destructive",
      });
      return;
    }
    
    if (!values.content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your answer",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure postId is set correctly
    const payload = {
      ...values,
      postId: Number(id),
      authorId: user.id
    };
    
    createReplyMutation.mutate(payload);
  };
  
  // Handle reply voting
  const handleVote = (replyId: number, value: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to vote",
        variant: "destructive",
      });
      return;
    }
    
    voteReplyMutation.mutate({ replyId, value });
  };
  
  // Handle accepting answer
  const handleAcceptAnswer = (replyId: number) => {
    if (!user || discussion?.authorId !== user.id) {
      toast({
        title: "Not authorized",
        description: "Only the question author can mark an answer as accepted",
        variant: "destructive",
      });
      return;
    }
    
    acceptAnswerMutation.mutate(replyId);
  };
  
  // Sort replies based on the selected sort order
  const sortedReplies = discussion?.replies
    ? [...discussion.replies].sort((a, b) => {
        if (sortOrder === 'votes') {
          // First put accepted answer on top
          if (a.isAccepted) return -1;
          if (b.isAccepted) return 1;
          // Then sort by votes
          return b.votes - a.votes;
        } else {
          // Sort by newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      })
    : [];
  
  // Format date
  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  };
  
  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (date: Date | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };
  
  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertDiscussionCommentSchema>) => {
      if (!values.content.trim()) {
        throw new Error("Comment content cannot be empty");
      }
      
      const res = await fetch("/api/discussion-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include"
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to post comment");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment posted",
        description: "Your comment has been added",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/discussions/${id}`] });
      // Reset all comment forms
      setCommentForms({});
    },
    onError: (error: Error) => {
      console.error("Comment submission error:", error);
      toast({
        title: "Failed to post comment",
        description: error.message || "There was a problem submitting your comment",
        variant: "destructive",
      });
    },
  });
  
  // Handle comment submission
  const handleCommentSubmit = (replyId: number, postId: number, content: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to post a comment",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your comment",
        variant: "destructive",
      });
      return;
    }
    
    const payload = {
      content,
      authorId: user.id,
      replyId,
      postId,
    };
    
    createCommentMutation.mutate(payload);
  };
  
  // Toggle comments visibility
  const toggleComments = (replyId: number) => {
    setExpandedComments(prev => ({
      ...prev,
      [replyId]: !prev[replyId]
    }));
  };
  
  // Toggle comment form visibility
  const toggleCommentForm = (replyId: number) => {
    setCommentForms(prev => ({
      ...prev,
      [replyId]: !prev[replyId]
    }));
  };
  
  if (isLoadingDiscussion) {
    return (
      <AppShell>
        <div className="container py-6">
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading discussion...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  
  if (!discussion) {
    return (
      <AppShell>
        <div className="container py-6">
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">Discussion not found</h2>
              <p className="text-muted-foreground mb-6">
                The discussion you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate("/discussions")}>
                Back to Discussions
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell>
      <div className="container py-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Button 
            variant="ghost" 
            className="px-0 hover:bg-transparent hover:text-primary" 
            onClick={() => navigate("/discussions")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Discussions
          </Button>
        </div>
        
        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {discussion.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {discussion.course || 'General'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Asked {formatRelativeTime(discussion.createdAt)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex gap-4">
              {/* Author info */}
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={discussion.authorAvatar} alt={discussion.authorName} />
                  <AvatarFallback>
                    {discussion.authorName?.slice(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-medium">{discussion.authorName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">Author</p>
                </div>
              </div>
              
              {/* Question content */}
              <div className="flex-1">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{discussion.content}</p>
                </div>
                
                {discussion.tags && discussion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {discussion.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t pt-4 flex justify-between">
            <div className="text-sm text-muted-foreground">
              <span>{formatDate(discussion.createdAt)}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={!user}
                title={!user ? "Login to report" : "Report this question"}
              >
                <Flag className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-muted-foreground">Report</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Answers Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {discussion.replies?.length || 0} Answers
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex rounded-md overflow-hidden border">
                <button
                  className={`px-3 py-1 text-sm ${
                    sortOrder === 'votes' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setSortOrder('votes')}
                >
                  Votes
                </button>
                <button
                  className={`px-3 py-1 text-sm ${
                    sortOrder === 'newest' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setSortOrder('newest')}
                >
                  Newest
                </button>
              </div>
            </div>
          </div>
          
          {/* Answers List */}
          <div className="space-y-6">
            {sortedReplies.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquareText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No answers yet</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    Be the first to answer this question and help a fellow student!
                  </p>
                  <Button
                    onClick={() => {
                      // Scroll to the reply form
                      document.getElementById('reply-form')?.scrollIntoView({
                        behavior: 'smooth'
                      });
                    }}
                  >
                    Post an Answer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sortedReplies.map((reply) => (
                <Card 
                  key={reply.id} 
                  className={reply.isAccepted ? "border-green-500 border-2" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Voting buttons */}
                      <div className="flex flex-col items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleVote(reply.id, 1)}
                          disabled={!user}
                        >
                          <ThumbsUp className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <span className={`font-bold ${
                          reply.votes > 0 
                            ? 'text-green-600' 
                            : reply.votes < 0 
                              ? 'text-red-600' 
                              : ''
                        }`}>
                          {reply.votes}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleVote(reply.id, -1)}
                          disabled={!user}
                        >
                          <ThumbsDown className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        
                        {/* Accept answer button (only shown to question author) */}
                        {user?.id === discussion.authorId && (
                          <Button
                            variant={reply.isAccepted ? "default" : "outline"}
                            size="icon"
                            className={`h-8 w-8 mt-2 ${
                              reply.isAccepted 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'text-muted-foreground'
                            }`}
                            onClick={() => handleAcceptAnswer(reply.id)}
                            title={reply.isAccepted ? "Accepted answer" : "Mark as accepted"}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                        )}
                        
                        {/* Accepted answer badge (for non-question author) */}
                        {reply.isAccepted && user?.id !== discussion.authorId && (
                          <div className="mt-2 text-green-600 flex flex-col items-center">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-xs mt-1">Accepted</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Answer content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reply.authorAvatar} alt={reply.authorName} />
                              <AvatarFallback>
                                {reply.authorName?.slice(0, 2).toUpperCase() || "UN"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{reply.authorName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">
                                Answered {formatRelativeTime(reply.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{reply.content}</p>
                        </div>
                        
                        {/* Comments section */}
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground"
                              onClick={() => toggleComments(reply.id)}
                            >
                              {expandedComments[reply.id] ? 
                                <ChevronDown className="h-3 w-3 mr-1" /> : 
                                <ChevronRight className="h-3 w-3 mr-1" />
                              }
                              {reply.comments?.length || 0} Comments
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground"
                              onClick={() => toggleCommentForm(reply.id)}
                            >
                              <Reply className="h-3 w-3 mr-1" />
                              Add Comment
                            </Button>
                          </div>
                          
                          {/* Comment form */}
                          {commentForms[reply.id] && (
                            <div className="mt-2 flex gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user?.avatar} alt={user?.name} />
                                <AvatarFallback>
                                  {user?.name?.slice(0, 2).toUpperCase() || "UN"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex gap-2">
                                <Textarea 
                                  id={`comment-${reply.id}`}
                                  placeholder="Add a comment..."
                                  className="min-h-[40px] text-sm py-2 resize-none"
                                  rows={1}
                                />
                                <Button 
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    const textarea = document.getElementById(`comment-${reply.id}`) as HTMLTextAreaElement;
                                    handleCommentSubmit(reply.id, Number(id), textarea.value);
                                    textarea.value = '';
                                  }}
                                  disabled={!user || createCommentMutation.isPending}
                                >
                                  {createCommentMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Comments list */}
                          {expandedComments[reply.id] && (
                            <div className="mt-2 space-y-3">
                              {reply.comments && reply.comments.length > 0 ? (
                                reply.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                                      <AvatarFallback>
                                        {comment.authorName?.slice(0, 2).toUpperCase() || "UN"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="bg-muted rounded-md px-3 py-2">
                                        <div className="flex justify-between">
                                          <p className="text-xs font-medium">{comment.authorName || "Unknown"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatRelativeTime(comment.createdAt)}
                                          </p>
                                        </div>
                                        <p className="text-sm mt-1">{comment.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No comments yet. Be the first to comment!</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        
        {/* Post Answer Form */}
        <Card className="mb-8" id="reply-form">
          <CardHeader>
            <CardTitle className="text-xl">Your Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...replyForm}>
              <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
                <FormField
                  control={replyForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Write your answer here..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    disabled={createReplyMutation.isPending || !user}
                  >
                    {createReplyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Your Answer"
                    )}
                  </Button>
                </div>
                
                {!user && (
                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 inline-block mr-1" />
                    You must be <a href="/auth" className="text-primary hover:underline">signed in</a> to post an answer.
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Related Questions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Related Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[1, 2, 3].map((_, i) => (
                <li key={i}>
                  <a href="#" className="text-sm hover:text-primary hover:underline block">
                    How to solve this differential equation problem?
                  </a>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" /> 5 answers
                    </span>
                    <span className="inline-flex items-center ml-3">
                      <Clock className="h-3 w-3 mr-1" /> 2 days ago
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
