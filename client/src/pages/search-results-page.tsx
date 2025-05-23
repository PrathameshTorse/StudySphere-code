import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Paper, Resource, DiscussionPost } from "@shared/schema";
import { SearchBar } from "@/components/ui/search-bar";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, MessageSquare, Calendar, User, Download, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';

export default function SearchResultsPage() {
  // Parse query parameter
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split('?')[1] || '');
  const searchQuery = queryParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'all' | 'papers' | 'resources' | 'discussions'>('all');

  // Search queries for different content types
  const { data: papers, isLoading: papersLoading } = useQuery<Paper[]>({
    queryKey: ['/api/search/papers', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      return fetch(`/api/search/papers?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: !!searchQuery
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ['/api/search/resources', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      return fetch(`/api/search/resources?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: !!searchQuery
  });

  const { data: discussions, isLoading: discussionsLoading } = useQuery<DiscussionPost[]>({
    queryKey: ['/api/search/discussions', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      return fetch(`/api/search/discussions?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: !!searchQuery
  });

  const isLoading = papersLoading || resourcesLoading || discussionsLoading;
  
  // Calculate total results
  const totalResults = (papers?.length || 0) + (resources?.length || 0) + (discussions?.length || 0);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Search Results" },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold mb-4">Search Results</h1>
          
          {/* Search bar */}
          <div className="mb-6">
            <SearchBar defaultValue={searchQuery} fullWidth={true} />
          </div>
          
          {searchQuery && (
            <p className="text-gray-500 mb-4">
              {isLoading 
                ? "Searching..." 
                : `Found ${totalResults} results for "${searchQuery}"`
              }
            </p>
          )}
          
          {/* Results tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-6">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="all">
                All Results
                {!isLoading && totalResults > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalResults}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="papers">
                Papers
                {!isLoading && papers && papers.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{papers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resources">
                Resources
                {!isLoading && resources && resources.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{resources.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="discussions">
                Discussions
                {!isLoading && discussions && discussions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{discussions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* All results tab */}
            <TabsContent value="all" className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : totalResults === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try using different keywords or check your spelling</p>
                </div>
              ) : (
                <>
                  {papers && papers.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3 flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        Papers
                      </h2>
                      <div className="space-y-4">
                        {papers.slice(0, 3).map(paper => (
                          <PaperResultCard key={paper.id} paper={paper} />
                        ))}
                        {papers.length > 3 && (
                          <Button variant="outline" className="w-full" onClick={() => setActiveTab('papers')}>
                            View all {papers.length} papers
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {resources && resources.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3 flex items-center mt-8">
                        <BookOpen className="mr-2 h-5 w-5" />
                        Resources
                      </h2>
                      <div className="space-y-4">
                        {resources.slice(0, 3).map(resource => (
                          <ResourceResultCard key={resource.id} resource={resource} />
                        ))}
                        {resources.length > 3 && (
                          <Button variant="outline" className="w-full" onClick={() => setActiveTab('resources')}>
                            View all {resources.length} resources
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {discussions && discussions.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3 flex items-center mt-8">
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Discussions
                      </h2>
                      <div className="space-y-4">
                        {discussions.slice(0, 3).map(discussion => (
                          <DiscussionResultCard key={discussion.id} discussion={discussion} />
                        ))}
                        {discussions.length > 3 && (
                          <Button variant="outline" className="w-full" onClick={() => setActiveTab('discussions')}>
                            View all {discussions.length} discussions
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            {/* Papers tab */}
            <TabsContent value="papers">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : papers && papers.length > 0 ? (
                <div className="space-y-4">
                  {papers.map(paper => (
                    <PaperResultCard key={paper.id} paper={paper} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No papers found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>
            
            {/* Resources tab */}
            <TabsContent value="resources">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : resources && resources.length > 0 ? (
                <div className="space-y-4">
                  {resources.map(resource => (
                    <ResourceResultCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No resources found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>
            
            {/* Discussions tab */}
            <TabsContent value="discussions">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : discussions && discussions.length > 0 ? (
                <div className="space-y-4">
                  {discussions.map(discussion => (
                    <DiscussionResultCard key={discussion.id} discussion={discussion} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No discussions found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}

// Card component for Paper search results
function PaperResultCard({ paper }: { paper: Paper }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
            <a href={`/papers/${paper.id}`}>{paper.title}</a>
          </CardTitle>
          <Badge variant="outline">{paper.course}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{paper.description}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          <span>{new Date(paper.year).getFullYear()}</span>
          {paper.institution && (
            <>
              <span className="mx-1">•</span>
              <span>{paper.institution}</span>
            </>
          )}
          <span className="mx-1">•</span>
          <User className="h-3 w-3 mr-1" />
          <span>Uploader ID: {paper.uploaderId}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <div className="flex items-center text-xs">
          <Download className="h-3 w-3 mr-1" />
          <span>{paper.downloads || 0} downloads</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/papers/${paper.id}`}>View Details</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Card component for Resource search results
function ResourceResultCard({ resource }: { resource: Resource }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
            <a href={`/resources/${resource.id}`}>{resource.title}</a>
          </CardTitle>
          <Badge variant="outline">{resource.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{resource.description}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          <span>Uploader ID: {resource.uploaderId}</span>
          <span className="mx-1">•</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span>{formatDistanceToNow(new Date(resource.uploadDate))} ago</span>
          {resource.course && (
            <>
              <span className="mx-1">•</span>
              <span>{resource.course}</span>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <div className="flex items-center text-xs">
          <Download className="h-3 w-3 mr-1" />
          <span>{resource.downloads || 0} downloads</span>
          {resource.rating && resource.rating > 0 && (
            <>
              <span className="mx-1">•</span>
              <span>Rating: {resource.rating.toFixed(1)}/5</span>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/resources/${resource.id}`}>View Resource</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Card component for Discussion search results
function DiscussionResultCard({ discussion }: { discussion: DiscussionPost }) {
  const formattedDate = formatDistanceToNow(new Date(discussion.createdAt));
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
          <a href={`/discussions/${discussion.id}`}>{discussion.title}</a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{discussion.content}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          <span>Author ID: {discussion.authorId}</span>
          <span className="mx-1">•</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span>{formattedDate} ago</span>
          {discussion.course && (
            <>
              <span className="mx-1">•</span>
              <span>{discussion.course}</span>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <div className="flex items-center text-xs">
          <ThumbsUp className="h-3 w-3 mr-1" />
          <span>{discussion.votes ? discussion.votes : 0} votes</span>
          <span className="mx-1">•</span>
          <MessageSquare className="h-3 w-3 mr-1" />
          <span>0 replies</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/discussions/${discussion.id}`}>Join Discussion</a>
        </Button>
      </CardFooter>
    </Card>
  );
}