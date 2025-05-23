import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Add a simple local cache to prevent duplicate requests
const requestCache = new Map<string, {data: any, timestamp: number, status: number}>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const CACHE_MAX_SIZE = 100; // Prevent memory leaks by limiting cache size

// Helper function to safely parse JSON
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return text;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    } catch (e) {
      // If there's an error reading the response text, use statusText
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

/**
 * Custom API request function with consistent error handling
 */
export const apiRequest = async (
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response;
};

// Function to manage cache size
function trimCache() {
  if (requestCache.size > CACHE_MAX_SIZE) {
    // Remove oldest entries first
    const entries = Array.from(requestCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Delete oldest items until we're below max size
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    for (const [key] of toDelete) {
      requestCache.delete(key);
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const cacheKey = queryKey[0] as string;
    
    // Check local request cache first
    const now = Date.now();
    const cached = requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log(`Using cached data for ${cacheKey}`);
      return cached.data;
    }
    
    try {
      console.log(`Making query request: ${cacheKey}`);
      const res = await fetch(cacheKey, {
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "max-age=300"
        }
      });

      console.log(`Query response status: ${res.status} ${res.statusText}`);
      
      // Handle 401 specially
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized request, returning null");
        // Cache null result for unauthorized requests
        requestCache.set(cacheKey, {data: null, timestamp: now, status: 401});
        trimCache(); // Ensure cache doesn't grow too large
        return null;
      }

      // For other non-ok responses
      if (!res.ok) {
        const errorText = await res.text();
        const error = new Error(`${res.status}: ${errorText || res.statusText}`);
        throw error;
      }
      
      // For successful responses
      const contentType = res.headers.get('content-type') || '';
      let data;
      
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        // Try to parse as JSON in case Content-Type is wrong
        data = safeJsonParse(text);
      }
      
      // Cache successful response
      requestCache.set(cacheKey, {data, timestamp: now, status: res.status});
      trimCache(); // Ensure cache doesn't grow too large
      return data;
    } catch (error) {
      console.error(`Query error (${cacheKey}):`, error);
      throw error;
    }
  };

// Function to check if we should even make a network request
// Used to determine if a query should run at all
const shouldQueryFn = ({ queryKey }: { queryKey: unknown[] }) => {
  // Don't run additional queries for auth user if we already made one recently
  if (queryKey[0] === '/api/user') {
    const cached = requestCache.get('/api/user');
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log('Skipping /api/user query - using cached data');
      return false;
    }
  }
  return true;
};

// Set up cache cleanup interval
setInterval(() => {
  const now = Date.now();
  requestCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  });
}, 60000); // Clean every minute

/**
 * Global QueryClient with optimized settings
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time to reduce unnecessary refetches
      staleTime: 1000 * 60, // 1 minute
      
      // Increase cache time to keep data in memory longer
      gcTime: 1000 * 60 * 5, // 5 minutes
      
      // Limit retries to prevent excessive failed requests
      retry: 1, 
      
      // Disable automatic refetching when window regains focus
      refetchOnWindowFocus: false,
      
      // Disable automatic refetching on reconnect
      refetchOnReconnect: false,
      
      // Add a small delay between retries to prevent hammering the server
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Only run the query if we should
      enabled: shouldQueryFn,
    },
    mutations: {
      retry: false,
    },
  },
});
