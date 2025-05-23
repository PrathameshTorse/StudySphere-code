import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import React from "react";

// Simplified version to avoid potential issues
export const ProtectedRoute = React.memo(({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showLoading, setShowLoading] = useState(false);

  // Show loading indicator after a brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowLoading(true);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Not authenticated, redirecting to login");
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Return a function that renders the appropriate content
  return (
    <Route path={path}>
      {() => {
        // Show loading indicator
        if (isLoading && showLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">Loading your session...</p>
            </div>
          );
        }

        // Return nothing while we check auth status or redirect
        if (isLoading || !user) {
          return null;
        }

        // User is authenticated, render the component
        return <Component />;
      }}
    </Route>
  );
});

// Add display name for debugging
ProtectedRoute.displayName = "ProtectedRoute";
