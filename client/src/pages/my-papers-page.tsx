import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Paper } from "@shared/schema";
import { ExtendedPaper } from "@shared/types";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Search,
  Trash2,
  Edit,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MyPapersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [paperToDelete, setPaperToDelete] = useState<ExtendedPaper | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch only the current user's papers
  const { data: myPapers = [], isLoading } = useQuery<ExtendedPaper[]>({
    queryKey: ["/api/papers/my-papers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/papers/my-papers?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch your papers");
      return res.json();
    },
    enabled: !!user, // Only run the query if user is logged in
  });

  // Handle paper download
  const handleDownload = async (paper: ExtendedPaper) => {
    if (!paper.fileUrl) {
      toast({
        title: "Download failed",
        description: "This paper doesn't have an associated file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a link element and click it to trigger the download
      const a = document.createElement("a");
      a.href = paper.fileUrl;
      a.download = paper.title || "paper";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading this file",
        variant: "destructive",
      });
    }
  };

  // Handle paper deletion
  const handleDelete = async (paper: ExtendedPaper) => {
    if (!paper.id || !user) return;
    
    try {
      const res = await fetch(`/api/papers/${paper.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) throw new Error("Failed to delete paper");
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/papers/my-papers"] });
      
      toast({
        title: "Paper deleted",
        description: "Your paper has been removed from the repository",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting this paper",
        variant: "destructive",
      });
    }
  };

  // Filter papers based on search query
  const filteredPapers = myPapers.filter(paper => 
    !searchQuery || 
    paper.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="container py-6">
        <div className="flex text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:underline">Home</a>
          <span className="mx-2">›</span>
          <a href="/resources" className="hover:underline">Study Resources</a>
          <span className="mx-2">›</span>
          <span>My Uploads</span>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center">
                <FileText className="mr-2" /> My Uploaded Resources
              </CardTitle>
              <CardDescription>
                Manage all the study resources you've uploaded to StudySphere
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your resources..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="default" 
                  onClick={() => window.location.href = "/resources?create=true"}
                >
                  Upload New Resource
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full" />
                </div>
              ) : filteredPapers.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No resources found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "Try adjusting your search terms" : "You haven't uploaded any resources yet"}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = "/resources?create=true"}
                  >
                    Upload Your First Resource
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource Name</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Uploaded On</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPapers.map((paper) => (
                        <TableRow key={paper.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate max-w-[200px]" title={paper.title || ""}>
                                {paper.title || "Untitled Resource"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {paper.course ? (
                              <Badge variant="outline">{paper.course}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {paper.uploadDate ? (
                              format(new Date(paper.uploadDate), 'MMM d, yyyy')
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {paper.views || 0}
                          </TableCell>
                          <TableCell>
                            {paper.downloads || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => paper.fileUrl && handleDownload(paper)}
                                disabled={!paper.fileUrl}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.location.href = `/resources/${paper.id}`}
                                title="Open"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={confirmDialogOpen && paperToDelete?.id === paper.id}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setPaperToDelete(paper);
                                      setConfirmDialogOpen(true);
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{paper.title || 'Untitled Resource'}"? 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => {
                                        handleDelete(paper);
                                        setConfirmDialogOpen(false);
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
