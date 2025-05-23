import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function useAuthCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAuthCheckingRef = useRef(false);
  const lastCheckedRef = useRef(0);
  const [isAuthValid, setIsAuthValid] = useState(!!user);
  
  // Function to verify authentication status directly with the server
  const checkAuthentication = async (force = false): Promise<boolean> => {
    // Avoid multiple simultaneous checks
    if (isAuthCheckingRef.current) return isAuthValid;
    
    // Throttle checks - only check once every 5 minutes unless forced
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckedRef.current;
    if (!force && timeSinceLastCheck < 5 * 60 * 1000 && lastCheckedRef.current > 0) {
      console.log(`Skipping auth check - last checked ${Math.round(timeSinceLastCheck/1000)} seconds ago`);
      return isAuthValid;
    }
    
    isAuthCheckingRef.current = true;
    
    try {
      console.log("Verifying authentication status with server...");
      // Make a direct request to the auth status endpoint
      const response = await fetch("/api/user", {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      // Check if response indicates authenticated
      const isAuthenticated = response.ok;
      setIsAuthValid(isAuthenticated);
      lastCheckedRef.current = now;
      
      if (!isAuthenticated && user) {
        // We have a user object but server says not authenticated
        console.error("Authentication mismatch: client thinks user is logged in but server disagrees");
        // Invalidate the cached user data
        queryClient.setQueryData(["/api/user"], null);
        
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
      }
      
      return isAuthenticated;
      
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthValid(false);
      return false;
    } finally {
      isAuthCheckingRef.current = false;
    }
  };
  
  // Verify authentication on component mount and set up refresh interval
  useEffect(() => {
    // Don't do anything if user status is already determined
    // This avoids the initial check on first render 
    if (typeof user !== 'undefined') {
      // Initialize auth valid state based on user
      setIsAuthValid(!!user);
      
      // Only do an initial check if we've never checked before
      if (lastCheckedRef.current === 0) {
        const timer = setTimeout(() => {
          checkAuthentication();
        }, 1000); // Delay initial check by 1 second
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);
  
  // Set up periodic refresh completely separate from the user effect
  useEffect(() => {
    // Set up periodic authentication check every 20 minutes
    const refreshInterval = setInterval(() => {
      checkAuthentication(true);
    }, 20 * 60 * 1000); // 20 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);
  
  return {
    isAuthChecking: isAuthCheckingRef.current,
    isAuthValid,
    checkAuthentication
  };
}

export function AuthRefresh() {
  // We don't need to destructure and use these values, which prevents rerenders
  useAuthCheck();
  
  // This component doesn't render anything visible
  return null;
} 