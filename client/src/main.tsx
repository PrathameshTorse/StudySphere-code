import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth.tsx";
import { queryClient } from "./lib/queryClient.ts";

// Create a request cache to prevent duplicate API calls
const requestCache = new Map<string, {data: any, timestamp: number}>();
const CACHE_EXPIRY = 2000; // 2 seconds

// Intercept all fetch requests to implement caching
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  // Only cache GET requests
  if (!init || init.method === 'GET' || !init.method) {
    const url = typeof input === 'string' ? input : input.url;
    const cacheKey = url + (init?.headers ? JSON.stringify(init.headers) : '');
    
    // Check cache for a valid entry
    const cachedResponse = requestCache.get(cacheKey);
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_EXPIRY) {
      console.log(`Using cached response for ${url}`);
      return new Response(JSON.stringify(cachedResponse.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If not in cache or expired, make the actual request
    const response = await originalFetch(input, init);
    
    // Only cache successful responses
    if (response.ok) {
      try {
        // Clone the response to avoid consuming it
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        // Store in cache
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error caching response:", error);
      }
    }
    
    return response;
  }
  
  // For non-GET requests, proceed normally
  return originalFetch(input, init);
};

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      requestCache.delete(key);
    }
  }
}, 10000); // Clean up every 10 seconds

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
