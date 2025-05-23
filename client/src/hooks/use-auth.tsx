import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo
} from "react";
import { User } from "@shared/schema";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// --- Auth Context Types ---
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  logoutMutation: ReturnType<typeof useMutation<void, Error, void>>;
  register: (userData: RegisterData) => Promise<User>;
  updateProfile: (profileData: Partial<User>) => Promise<User>;
};

type RegisterData = {
  username: string;
  password: string;
  displayName: string;
  email: string;
};

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | null>(null);

// --- Auth Provider Component ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Debounce mechanism
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const DEBOUNCE_TIME = 1000; // 1 second
  
  // Memoize the authentication fetch function to prevent recreation on renders
  const fetchUser = useCallback(async () => {
    // Check debounce
    const now = Date.now();
    if (now - lastFetchTime < DEBOUNCE_TIME) {
      // Return from cache if possible
      const cachedUser = queryClient.getQueryData<User | null>(["/api/user"]);
      if (cachedUser) return cachedUser;
      
      // If no cached user, wait until debounce period is over
      const waitTime = DEBOUNCE_TIME - (now - lastFetchTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    setLastFetchTime(now);
    
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          return null; // Not authenticated
        }
        throw new Error(`Authentication check failed: ${res.status}`);
      }
      
      return await res.json();
    } catch (error) {
      console.error("Auth check error:", error);
      return null;
    }
  }, [lastFetchTime, queryClient]);

  // User query with proper cache settings
  const { data: user, isFetching } = useQuery({
    queryKey: ["/api/user"],
    queryFn: fetchUser,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Clear all cache on logout
      window.location.href = "/auth"; // Redirect to login page
    },
    onError: (error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update loading state
  useEffect(() => {
    setIsLoading(isFetching);
  }, [isFetching]);

  // --- Authentication Methods ---
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!res.ok) {
        // Try to parse as JSON first, fallback to text
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || "Login failed");
        } catch (jsonError) {
          // If JSON parsing fails, try text
          const errorText = await res.text();
          throw new Error(errorText || "Login failed");
        }
      }

      const userData = await res.json();
      queryClient.setQueryData(["/api/user"], userData);
      queryClient.invalidateQueries(); // Refresh all queries
      return userData;
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    logoutMutation.mutate();
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      if (!res.ok) {
        // Try to parse as JSON first, fallback to text
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || "Registration failed");
        } catch (jsonError) {
          // If JSON parsing fails, try text
          const errorText = await res.text();
          throw new Error(errorText || "Registration failed");
        }
      }

      const newUser = await res.json();
      queryClient.setQueryData(["/api/user"], newUser);
      return newUser;
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update profile");
      }

      const updatedUser = await res.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      return updatedUser;
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      logoutMutation,
      register,
      updateProfile,
    }),
    [user, isLoading, logoutMutation]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
