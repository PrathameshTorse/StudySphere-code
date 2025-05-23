import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paper, insertPaperSchema } from "@shared/schema";
import { ExtendedPaper } from "@shared/types";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { CustomUploader } from "@/components/custom-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Filter,
  FileUp,
  Plus,
  Loader2,
  BookOpen,
  FileQuestion,
  ListFilter,
  FilePlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const filterSchema = z.object({
  course: z.string().optional(),
  year: z.string().optional(),
  institution: z.string().optional(),
  resourceType: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

// Extend the insertPaperSchema to include resourceType
const extendedPaperSchema = insertPaperSchema.extend({
  resourceType: z.string().default("past_paper"),
});

export default function ResourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Check URL for create param to open dialog automatically
  const urlParams = new URLSearchParams(window.location.search);
  const shouldOpenDialog = urlParams.get('create') === 'true';
  
  // Open dialog if create=true in URL
  useEffect(() => {
    if (shouldOpenDialog) {
      setIsDialogOpen(true);
    }
  }, [shouldOpenDialog]);

  // Fetch papers from the API
  const { data: resources = [], isLoading } = useQuery<ExtendedPaper[]>({
    queryKey: ["/api/papers", filters],
    queryFn: async ({ queryKey }) => {
      const [_, filterValues] = queryKey;
      const params = new URLSearchParams();
      
      // Add any filters to the query parameters
      if (filterValues) {
        Object.entries(filterValues).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      
      const res = await fetch(`/api/papers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });

  // Setup form for resource upload
  const uploadForm = useForm<z.infer<typeof extendedPaperSchema>>({
    resolver: zodResolver(extendedPaperSchema),
    defaultValues: {
      title: "",
      description: "",
      course: "",
      year: new Date().getFullYear().toString(),
      institution: user?.institution || "",
      uploaderId: user?.id,
      resourceType: "past_paper",
    },
  });

  // Setup form for filtering
  const filterForm = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: filters,
  });

  // Upload resource mutation
  const uploadMutation = useMutation({
    mutationFn: async (values: z.infer<typeof extendedPaperSchema> & { file: File }) => {
      try {
        console.log("Starting upload mutation with values:", values);
        
        const formData = new FormData();
        
        // Ensure uploaderId is always set to current user
        if (!values.uploaderId && user) {
          values.uploaderId = user.id;
        }
        
        // Append all form values to formData
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'file') {
            formData.append(key, value.toString());
          }
        });
        
        // Append the file
        formData.append("file", values.file);
        
        console.log("FormData prepared, sending to server");
        
        const response = await fetch('/api/papers', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error("Upload response not OK:", error);
          throw new Error(error || 'Failed to upload resource');
        }
        
        // Invalidate queries to refresh lists
        queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/papers/my-papers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
        
        return response.json();
      } catch (error) {
        console.error("Upload mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setUploadedFile(null);
      uploadForm.reset();
      
      toast({
        title: "Resource uploaded successfully",
        description: "Your resource has been added to the repository",
      });
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading your resource",
        variant: "destructive",
      });
    },
  });

  // Handle file change from the FileUpload component
  const handleFileChange = (file: File | null) => {
    console.log("File changed:", file);
    setUploadedFile(file);
  };

  // Form submission handler
  const onSubmit = (values: z.infer<typeof extendedPaperSchema>) => {
    console.log("Form submission triggered:", values);
    
    if (!uploadedFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Preparing to upload file:", uploadedFile.name);
      uploadMutation.mutate({
        ...values,
        file: uploadedFile,
      });
    } catch (error) {
      console.error("Error during upload preparation:", error);
      toast({
        title: "Upload error",
        description: "An error occurred preparing the upload",
        variant: "destructive",
      });
    }
  };

  // Handle paper download
  const handleDownload = async (paper: ExtendedPaper) => {
    if (!paper.fileUrl) {
      toast({
        title: "Download failed",
        description: "This resource doesn't have an associated file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a link element and click it to trigger the download
      const a = document.createElement("a");
      a.href = paper.fileUrl;
      a.download = paper.title || "resource";
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

  // Apply filters
  const applyFilters = (values: FilterValues) => {
    setFilters(values);
  };

  // Filter resources based on search query
  const filteredResources = resources.filter(resource => 
    !searchQuery || 
    resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter resources based on active tab
  const tabFilteredResources = activeTab === "all" 
    ? filteredResources 
    : filteredResources.filter(resource => 
        (activeTab === "past_papers" && resource.resourceType === "past_paper") ||
        (activeTab === "notes" && resource.resourceType === "notes") ||
        (activeTab === "other" && 
          resource.resourceType !== "past_paper" && 
          resource.resourceType !== "notes")
      );

  // Get resource type label
  const getResourceTypeLabel = (type: string | undefined) => {
    switch(type) {
      case "past_paper": return "Past Paper";
      case "notes": return "Notes";
      case "textbook": return "Textbook";
      case "solution": return "Solution";
      default: return "Other";
    }
  };

  // Create a ref for the form element
  const formRef = useRef<HTMLFormElement>(null);

  // Manual form submission handler
  const handleManualSubmit = () => {
    console.log("Manual form submission triggered");
    
    // Check for required title
    const formValues = uploadForm.getValues();
    if (!formValues.title) {
      toast({
        title: "Title required",
        description: "Please enter a title for the resource",
        variant: "destructive",
      });
      return;
    }
    
    if (!uploadedFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Manual submission with values:", formValues);
    
    // Set all optional fields to empty string if undefined
    const cleanedValues = {
      ...formValues,
      description: formValues.description || "",
      course: formValues.course || "",
      year: formValues.year || new Date().getFullYear().toString(),
      institution: formValues.institution || "",
      // Ensure user ID is set
      uploaderId: formValues.uploaderId || user?.id
    };
    
    uploadMutation.mutate({
      ...cleanedValues,
      file: uploadedFile,
    });
  };

  return (
    <AppShell>
      <div className="container py-6">
        <div className="flex text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:underline">Home</a>
          <span className="mx-2">›</span>
          <span>Study Resources</span>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center">
                <BookOpen className="mr-2" /> Study Resources
              </CardTitle>
              <CardDescription>
                Browse and download study materials shared by students and faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/my-papers")}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    My Uploads
                  </Button>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <FilePlus className="mr-2 h-4 w-4" />
                        Upload Resource
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                      <DialogHeader>
                        <DialogTitle>Upload Study Resource</DialogTitle>
                      </DialogHeader>
                      <Form {...uploadForm}>
                        <form 
                          ref={formRef}
                          onSubmit={(e) => {
                            e.preventDefault();
                            console.log("Form submit event triggered");
                            uploadForm.handleSubmit(onSubmit)(e);
                          }} 
                          className="space-y-4"
                        >
                          <FormField
                            control={uploadForm.control}
                            name="resourceType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Resource Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select resource type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="past_paper">Past Paper</SelectItem>
                                    <SelectItem value="notes">Notes</SelectItem>
                                    <SelectItem value="textbook">Textbook</SelectItem>
                                    <SelectItem value="solution">Solution</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <FormField
                            control={uploadForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title*</FormLabel>
                                <FormControl>
                                  <Input placeholder="E.g. Computer Science Midterm 2024" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={uploadForm.control}
                              name="course"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="E.g. CS101" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={uploadForm.control}
                              name="year"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Year (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="E.g. 2024" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        
                          <FormField
                            control={uploadForm.control}
                            name="institution"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Institution (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="E.g. MIT" 
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <FormField
                            control={uploadForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Add details about this resource" 
                                    className="resize-none" 
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div>
                            <FormLabel>File Upload*</FormLabel>
                            <div className="border rounded-md p-4 mt-1">
                              <FileUpload
                                onFileChange={handleFileChange}
                                acceptedFileTypes=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                maxSizeMB={25}
                              />
                            </div>
                            {uploadedFile && (
                              <p className="text-sm mt-2">
                                Selected file: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                              </p>
                            )}
                          </div>
                          
                          <DialogFooter className="flex justify-end gap-3 pt-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="button"
                              disabled={uploadMutation.isPending}
                              onClick={handleManualSubmit}
                            >
                              {uploadMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Upload Resource
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card className="mb-6">
                <CardContent className="p-4">
                  <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 mb-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="past_papers">Past Papers</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="other">Other</TabsTrigger>
                    </TabsList>
                    
                    <Form {...filterForm}>
                      <form onSubmit={filterForm.handleSubmit(applyFilters)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={filterForm.control}
                          name="course"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Course</FormLabel>
                              <FormControl>
                                <Input placeholder="E.g. CS101" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={filterForm.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year</FormLabel>
                              <FormControl>
                                <Input placeholder="E.g. 2024" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={filterForm.control}
                          name="institution"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Institution</FormLabel>
                              <FormControl>
                                <Input placeholder="E.g. MIT" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex items-end">
                          <Button type="submit" className="w-full">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Apply Filters
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </Tabs>
                </CardContent>
              </Card>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full" />
                </div>
              ) : tabFilteredResources.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No resources found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "Try adjusting your search or filter terms" : "Be the first to share a resource in this category"}
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Upload a Resource</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                      <DialogHeader>
                        <DialogTitle>Upload Study Resource</DialogTitle>
                      </DialogHeader>
                      <Form {...uploadForm}>
                        <form 
                          ref={formRef}
                          onSubmit={(e) => {
                            e.preventDefault();
                            console.log("Alternative dialog - Form submit event triggered");
                            uploadForm.handleSubmit(onSubmit)(e);
                          }} 
                          className="space-y-4"
                        >
                          <FormField
                            control={uploadForm.control}
                            name="resourceType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Resource Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select resource type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="past_paper">Past Paper</SelectItem>
                                    <SelectItem value="notes">Notes</SelectItem>
                                    <SelectItem value="textbook">Textbook</SelectItem>
                                    <SelectItem value="solution">Solution</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <FormField
                            control={uploadForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title*</FormLabel>
                                <FormControl>
                                  <Input placeholder="E.g. Computer Science Midterm 2024" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={uploadForm.control}
                              name="course"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="E.g. CS101" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={uploadForm.control}
                              name="year"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Year (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="E.g. 2024" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        
                          <FormField
                            control={uploadForm.control}
                            name="institution"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Institution (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="E.g. MIT" 
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                          <FormField
                            control={uploadForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Add details about this resource" 
                                    className="resize-none" 
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div>
                            <FormLabel>File Upload*</FormLabel>
                            <div className="border rounded-md p-4 mt-1">
                              <FileUpload
                                onFileChange={handleFileChange}
                                acceptedFileTypes=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                maxSizeMB={25}
                              />
                            </div>
                            {uploadedFile && (
                              <p className="text-sm mt-2">
                                Selected file: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                              </p>
                            )}
                          </div>
                          
                          <DialogFooter className="flex justify-end gap-3 pt-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="button"
                              disabled={uploadMutation.isPending}
                              onClick={handleManualSubmit}
                            >
                              {uploadMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Upload Resource
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Download</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabFilteredResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate max-w-[200px]" title={resource.title || ""}>
                                {resource.title || "Untitled Resource"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getResourceTypeLabel(resource.resourceType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {resource.course ? (
                              resource.course
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {resource.uploaderName || "Anonymous"}
                          </TableCell>
                          <TableCell>
                            {resource.uploadDate ? (
                              format(new Date(resource.uploadDate), 'MMM d, yyyy')
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resource.fileUrl && handleDownload(resource)}
                              disabled={!resource.fileUrl}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
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
