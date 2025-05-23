import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAuthCheck } from "./auth-refresh";

interface CustomUploaderProps {
  onUploadComplete: (fileUrl: string) => void;
  endpoint: string;
  allowedFileTypes?: string;
  maxFileSizeMB?: number;
  getAdditionalData?: () => Record<string, string>;
}

export function CustomUploader({
  onUploadComplete,
  endpoint,
  allowedFileTypes = ".pdf,.doc,.docx",
  maxFileSizeMB = 10,
  getAdditionalData = () => ({})
}: CustomUploaderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAuthChecking, isAuthValid, checkAuthentication } = useAuthCheck();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${maxFileSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    // Verify authentication before proceeding
    const authValid = await checkAuthentication();
    if (!authValid) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to upload files. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);

    try {
      // Get the latest form data at upload time
      const additionalData = getAdditionalData();
      const formData = new FormData();
      
      // Add the file to the form data
      formData.append("file", selectedFile);
      
      // Add any additional data
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      
      // Add the user ID explicitly
      if (user) {
        formData.append("uploaderId", user.id.toString());
      }

      console.log("Starting upload to", endpoint);
      console.log("Form data:", Array.from(formData.entries()).map(([key, val]) => 
        [key, typeof val === 'string' ? val : `File: ${selectedFile.name} (${selectedFile.size} bytes, ${selectedFile.type})`]
      ));

      console.log("Authentication status:", isAuthValid ? "Authenticated" : "Not authenticated");
      console.log("User info:", user ? `ID: ${user.id}, Username: ${user.username}` : "No user");

      // Add additional headers for better request identification
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          // No Content-Type header with FormData - browser sets it with boundary
          "X-Requested-With": "XMLHttpRequest" 
        },
        body: formData,
        credentials: "include",
      });

      console.log("Upload response status:", response.status, response.statusText);
      console.log("Response headers:", [...response.headers.entries()].map(([k, v]) => `${k}: ${v}`).join(", "));
      
      // Try to get the response text for debugging
      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      // If not OK, try to parse as JSON or use the raw text
      if (!response.ok) {
        let errorMessage = "Upload failed";
        try {
          // Try to parse the response text as JSON
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If parsing fails, use the raw response text if available
          console.error("Error parsing error response:", parseError);
          if (responseText) {
            errorMessage = `Server error: ${responseText}`;
          } else {
            errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Try to parse the successful response
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("Upload successful:", result);
      } catch (parseError) {
        console.error("Error parsing success response:", parseError);
        result = { success: true };
      }

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully",
      });

      // Call the callback with the file URL
      if (result && result.fileUrl) {
        onUploadComplete(result.fileUrl);
      } else {
        onUploadComplete(selectedFile.name); // Fallback if fileUrl not provided
      }

      // Reset the file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  // Display a loading state if we're checking authentication
  if (isAuthChecking) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
        <input
          type="file"
          accept={allowedFileTypes}
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          id="file-input"
        />
        
        {!selectedFile ? (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="font-medium mb-2">Select a file to upload</p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: {allowedFileTypes}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum size: {maxFileSizeMB}MB
            </p>
          </>
        ) : (
          <>
            <p className="font-medium mb-2">Selected file:</p>
            <p className="text-sm mb-4">{selectedFile.name}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                variant="outline"
              >
                Change
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 