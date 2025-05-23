import React, { useState, useRef, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  defaultFile?: File | null;
}

export function FileUpload({
  onFileChange,
  acceptedFileTypes = ".pdf,.doc,.docx",
  maxSizeMB = 10,
  defaultFile = null,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(defaultFile);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }

    // Check file type if acceptedFileTypes is specified
    if (acceptedFileTypes) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const acceptedTypesArray = acceptedFileTypes.split(',');
      
      if (!acceptedTypesArray.includes(fileExtension)) {
        setError(`Invalid file type. Accepted types: ${acceptedFileTypes}`);
        return false;
      }
    }

    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      console.log("File dropped:", droppedFile.name);
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        onFileChange(droppedFile);
        console.log("File validated and set successfully");
      } else {
        onFileChange(null);
        console.log("File validation failed");
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log("File selected via input:", selectedFile.name);
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        onFileChange(selectedFile);
        console.log("File validated and set successfully via input");
      } else {
        e.target.value = '';
        onFileChange(null);
        console.log("File validation failed via input");
      }
    }
  };

  const handleButtonClick = () => {
    console.log("File upload area clicked");
    inputRef.current?.click();
  };

  const handleClearFile = () => {
    console.log("Clearing selected file");
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileChange(null);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragActive
            ? "border-primary bg-primary/10"
            : "border-gray-300 hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleFileDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
        />
        <Upload className="h-10 w-10 mb-3 text-gray-400" />
        <p className="text-sm text-center text-gray-500 mb-1">
          <span className="font-medium text-primary">Click to upload</span> or drag and
          drop
        </p>
        <p className="text-xs text-gray-500">
          {acceptedFileTypes} (max {maxSizeMB}MB)
        </p>
      </div>

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-500">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {file && (
        <div className="mt-3 flex items-center p-2 border rounded-md">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          <div className="flex-1 text-sm truncate">{file.name}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClearFile();
            }}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
