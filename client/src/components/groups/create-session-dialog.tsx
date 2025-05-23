import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStudySessionSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { CalendarIcon, Clock, Loader2, MapPin, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

// Define a schema that properly handles the date conversions
const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  // We'll use Date objects in the form but convert to ISO strings for the API
  startDate: z.date({ required_error: "Start date is required" }),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.date({ required_error: "End date is required" }),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  isVirtual: z.boolean().default(false),
  meetingLink: z.string().optional().refine(
    (val) => !val || val.startsWith('http'), 
    {
      message: "Meeting link must be a valid URL",
    }
  ),
  groupId: z.number(),
  createdBy: z.number(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface CreateSessionDialogProps {
  groupId: number;
  onSessionCreated?: () => void;
}

export function CreateSessionDialog({ groupId, onSessionCreated }: CreateSessionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Create form with schema validation
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: new Date(),
      startTime: "10:00",
      endDate: new Date(),
      endTime: "11:00",
      location: "",
      isVirtual: false,
      meetingLink: "",
      groupId: groupId,
      createdBy: user?.id || 0,
    },
  });
  
  // Watch isVirtual to conditionally require meeting link
  const isVirtual = form.watch("isVirtual");
  
  // Create mutation for submitting session
  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormValues) => {
      try {
        // Convert the form data to the format expected by the API
        const startDateTime = combineDateTime(data.startDate, data.startTime);
        const endDateTime = combineDateTime(data.endDate, data.endTime);
        
        console.log("Combined date/time values:", {
          startDateTime,
          endDateTime,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        });
        
        const apiData = {
          title: data.title,
          description: data.description || "",
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: data.location || "",
          isVirtual: data.isVirtual,
          meetingLink: data.meetingLink || "",
          groupId: data.groupId,
          createdBy: data.createdBy,
        };
        
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to create study session");
        }
        
        return response.json();
      } catch (error) {
        console.error("Session creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsOpen(false);
      form.reset();
      
      toast({
        title: "Session scheduled",
        description: "Your study session has been scheduled successfully",
      });
      
      // Invalidate sessions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: [`/api/groups/${groupId}/sessions`],
      });
      
      // Call the callback if provided
      if (onSessionCreated) {
        onSessionCreated();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule session",
        description: error.message || "There was a problem scheduling your session",
        variant: "destructive",
      });
    },
  });
  
  // Helper to combine date and time
  function combineDateTime(date: Date, timeString: string): Date {
    try {
      console.log("Combining date", date, "with time", timeString);
      const [hours, minutes] = timeString.split(":").map(Number);
      const combined = new Date(date);
      combined.setHours(hours);
      combined.setMinutes(minutes);
      console.log("Combined result:", combined);
      return combined;
    } catch (error) {
      console.error("Error combining date and time:", error);
      throw new Error("Invalid date or time format");
    }
  }
  
  // Form submission handler
  function onSubmit(data: SessionFormValues) {
    createSessionMutation.mutate(data);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule a Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Schedule a Study Session</DialogTitle>
          <DialogDescription>
            Create a new study session for your group
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title*</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Exam Preparation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add details about topics, materials to bring, etc." 
                      className="resize-none h-24"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(selectedDate) => {
                            if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
                              // Get the current time from the startTime field
                              const currentTime = form.getValues("startTime");
                              const [hours, minutes] = currentTime.split(':').map(Number);
                              
                              // Create a new Date object with the selected date and current time
                              const combinedDateTime = new Date(selectedDate);
                              combinedDateTime.setHours(hours, minutes);
                              
                              field.onChange(combinedDateTime);
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time*</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(selectedDate) => {
                            if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
                              // Get the current time from the endTime field
                              const currentTime = form.getValues("endTime");
                              const [hours, minutes] = currentTime.split(':').map(Number);
                              
                              // Create a new Date object with the selected date and current time
                              const combinedDateTime = new Date(selectedDate);
                              combinedDateTime.setHours(hours, minutes);
                              
                              field.onChange(combinedDateTime);
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          disabled={(date) => date < form.getValues("startDate")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time*</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isVirtual"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Virtual Meeting</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This session will be conducted online
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              {isVirtual ? (
                <FormField
                  control={form.control}
                  name="meetingLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Link*</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Video className="mr-2 h-4 w-4 mt-2.5 text-muted-foreground" />
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <MapPin className="mr-2 h-4 w-4 mt-2.5 text-muted-foreground" />
                          <Input placeholder="E.g. Library, Room 101" {...field} value={field.value || ""} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <DialogFooter className="pt-4">
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
