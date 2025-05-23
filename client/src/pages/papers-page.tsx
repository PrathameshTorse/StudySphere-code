import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paper, insertPaperSchema } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

const filterSchema = z.object({
  course: z.string().optional(),
  year: z.string().optional(),
  institution: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function PapersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Fetch papers from the API
  const { data: papers = [], isLoading } = useQuery<Paper[]>({
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
      if (!res.ok) throw new Error("Failed to fetch papers");
      return res.json();
    },
  });

  // Setup form for paper upload
  const uploadForm = useForm<z.infer<typeof insertPaperSchema>>({
    resolver: zodResolver(insertPaperSchema),
    defaultValues: {
      title: "",
      description: "",
      course: "",
      year: new Date().getFullYear().toString(),
      institution: user?.institution || "",
      uploaderId: user?.id,
    },
  });

  // Setup form for filtering
  const filterForm = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: filters,
  });

  // Handle file upload
  const handleFileUpload = async (values: z.infer<typeof insertPaperSchema>) => {
    console.log("Form submission triggered", { values, uploadedFile });
    
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      
      // Append all form values to formData
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Append the file
      formData.append("file", uploadedFile);
      
      console.log("Sending upload request", { 
        formData: Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : 'File']),
        fileSize: uploadedFile.size,
        fileName: uploadedFile.name
      });
      
      // Make the API request
      const response = await fetch("/api/papers", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      console.log("Upload response status:", response.status);
      
      if (!response.ok) {
        let errorMessage = "Failed to upload paper";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      const paper = await response.json();
      console.log("Upload successful:", paper);
      
      toast({
        title: "Paper uploaded successfully",
        description: "Your paper has been added to the repository",
      });
      
      // Reset form and close dialog
      uploadForm.reset();
      setUploadedFile(null);
      setIsDialogOpen(false);
      
      // Invalidate the papers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle paper download
  const handleDownload = async (paper: Paper) => {
    try {
      // Increment download count
      await apiRequest("POST", `/api/papers/${paper.id}/download`);
      
      // Open file in new tab
      window.open(paper.fileUrl, "_blank");
      
      // Invalidate the papers query to refresh download count
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the paper",
        variant: "destructive",
      });
    }
  };

  // Apply filters
  const applyFilters = (values: FilterValues) => {
    setFilters(values);
  };

  // Filter papers by search query
  const filteredPapers = papers.filter(paper => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      paper.title.toLowerCase().includes(query) ||
      (paper.description && paper.description.toLowerCase().includes(query)) ||
      paper.course.toLowerCase().includes(query) ||
      paper.year.toLowerCase().includes(query) ||
      paper.institution.toLowerCase().includes(query)
    );
  });

  // Get unique course, years, and institutions for filters
  const coursesSet = new Set<string>();
  const yearsSet = new Set<string>();
  const institutionsSet = new Set<string>();
  
  papers.forEach(paper => {
    coursesSet.add(paper.course);
    yearsSet.add(paper.year);
    institutionsSet.add(paper.institution);
  });
  
  const courses = Array.from(coursesSet);
  const years = Array.from(yearsSet);
  const institutions = Array.from(institutionsSet);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Past Papers" },
            ]}
            className="mb-2"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Past Papers Repository</h1>
              <p className="text-gray-500 mt-1">Access and share previous year question papers</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <FileUp className="mr-2 h-4 w-4" />
                  <span>Upload Paper</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Upload Past Paper</DialogTitle>
                </DialogHeader>
                <Form {...uploadForm}>
                  <div className="space-y-4 mt-4">
                    <FormField
                      control={uploadForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paper Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Data Structures Mid Term 2023" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={uploadForm.control}
                        name="course"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. CS301" {...field} />
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
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 2023" {...field} />
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
                          <FormLabel>Institution</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. IIT" {...field} />
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
                              placeholder="Add details about this paper" 
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
                      <CustomUploader
                        endpoint="/api/papers"
                        allowedFileTypes=".pdf,.doc,.docx"
                        onUploadComplete={(fileUrl) => {
                          console.log("Upload completed, file URL:", fileUrl);
                          // File is already uploaded, close dialog and refresh the list
                          setIsDialogOpen(false);
                          // Invalidate the papers query to refresh the list
                          queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
                          // Show success message
                          toast({
                            title: "Paper uploaded successfully",
                            description: "Your paper has been added to the repository",
                          });
                        }}
                        getAdditionalData={() => {
                          if (!user) {
                            setTimeout(() => {
                              toast({
                                title: "Authentication required",
                                description: "You must be logged in to upload files",
                                variant: "destructive",
                              });
                            }, 0);
                            
                            return {
                              title: "",
                              course: "",
                              year: "",
                              institution: "",
                              description: "",
                              uploaderId: ""
                            };
                          }
                          
                          return {
                            title: uploadForm.getValues("title") || "",
                            course: uploadForm.getValues("course") || "",
                            year: uploadForm.getValues("year") || "",
                            institution: uploadForm.getValues("institution") || "",
                            description: uploadForm.getValues("description") || "",
                            uploaderId: user.id.toString()
                          };
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Search and filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search papers by title, course, or year..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <Form {...filterForm}>
                <form 
                  onSubmit={filterForm.handleSubmit(applyFilters)}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4 md:col-span-2"
                >
                  <FormField
                    control={filterForm.control}
                    name="course"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Course" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(course => (
                              <SelectItem key={course} value={course}>{course}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={filterForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years.map(year => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <Button type="submit" variant="outline" className="w-full">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Apply Filters</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
        
        {/* Papers list */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPapers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paper Details</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPapers.map((paper) => (
                      <TableRow key={paper.id}>
                        <TableCell>
                          <div className="flex items-start space-x-3">
                            <div className="h-10 w-10 bg-primary-50 rounded-md flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{paper.title}</div>
                              {paper.description && (
                                <div className="text-sm text-gray-500 line-clamp-1">
                                  {paper.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{paper.course}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell>{paper.institution}</TableCell>
                        <TableCell>{paper.downloads}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(paper)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No papers found</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  {searchQuery || Object.values(filters).some(v => v)
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Be the first to contribute to our past papers repository!"}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload a Paper
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Upload Past Paper</DialogTitle>
                    </DialogHeader>
                    <Form {...uploadForm}>
                      <div className="space-y-4 mt-4">
                        <FormField
                          control={uploadForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Paper Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Data Structures Mid Term 2023" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={uploadForm.control}
                            name="course"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Course Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. CS301" {...field} />
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
                                <FormLabel>Year</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. 2023" {...field} />
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
                              <FormLabel>Institution</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. IIT" {...field} />
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
                                  placeholder="Add details about this paper" 
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
                          <CustomUploader
                            endpoint="/api/papers"
                            allowedFileTypes=".pdf,.doc,.docx"
                            onUploadComplete={(fileUrl) => {
                              console.log("Upload completed, file URL:", fileUrl);
                              // File is already uploaded, close dialog and refresh the list
                              setIsDialogOpen(false);
                              // Invalidate the papers query to refresh the list
                              queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
                              // Show success message
                              toast({
                                title: "Paper uploaded successfully",
                                description: "Your paper has been added to the repository",
                              });
                            }}
                            getAdditionalData={() => {
                              if (!user) {
                                setTimeout(() => {
                                  toast({
                                    title: "Authentication required",
                                    description: "You must be logged in to upload files",
                                    variant: "destructive",
                                  });
                                }, 0);
                                
                                return {
                                  title: "",
                                  course: "",
                                  year: "",
                                  institution: "",
                                  description: "",
                                  uploaderId: ""
                                };
                              }
                              
                              return {
                                title: uploadForm.getValues("title") || "",
                                course: uploadForm.getValues("course") || "",
                                year: uploadForm.getValues("year") || "",
                                institution: uploadForm.getValues("institution") || "",
                                description: uploadForm.getValues("description") || "",
                                uploaderId: user.id.toString()
                              };
                            }}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
