import React, { useEffect, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/theme/theme-provider";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import TestPage from "@/pages/test-page";
import HomePage from "@/pages/home-page";
import ResourcesPage from "@/pages/resources-page";
import MyPapersPage from "@/pages/my-papers-page";
import DiscussionsPage from "@/pages/discussions-page";
import DiscussionDetailPage from "@/pages/discussion-detail-page";
import GroupsPage from "@/pages/groups-page";
import GroupDetailPage from "@/pages/group-detail-page";
import ProfilePage from "@/pages/profile-page";
import FriendsPage from "@/pages/friends-page";
import SettingsPage from "@/pages/settings-page";
import SessionsPage from "@/pages/sessions-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import { useToast } from "./hooks/use-toast";
import { ErrorBoundary } from "react-error-boundary";
import AdminDashboard from './pages/AdminDashboard';

// Flag to detect and prevent double mounting in development
const StrictModeApp = ({ children }: { children: React.ReactNode }) => {
  const isStrictModeSetup = React.useRef(false);

  useEffect(() => {
    if (isStrictModeSetup.current) {
      console.log('[StrictMode] Preventing double mount side effects');
      return;
    }
    
    isStrictModeSetup.current = true;
    console.log('[StrictMode] Initial mount - enabling API requests');
    
    // Return cleanup function
    return () => {
      console.log('[StrictMode] Cleaning up - React strict mode double render detected');
    };
  }, []);

  return <>{children}</>;
};

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-700 mb-4">An error occurred in the application:</p>
        <div className="bg-gray-100 p-4 rounded mb-4 overflow-auto">
          <pre className="text-sm text-red-500">{error.message}</pre>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="app min-h-screen bg-background text-foreground">
      <AuthProvider>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/test" component={TestPage} />
          <ProtectedRoute path="/" component={HomePage} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <ProtectedRoute path="/resources" component={ResourcesPage} />
          <ProtectedRoute path="/my-papers" component={MyPapersPage} />
          <ProtectedRoute path="/discussions" component={DiscussionsPage} />
          <ProtectedRoute path="/discussions/:id" component={DiscussionDetailPage} />
          <ProtectedRoute path="/groups" component={GroupsPage} />
          <ProtectedRoute path="/groups/:id" component={GroupDetailPage} />
          <Route path="/groups/new">
            {() => <Redirect to="/groups?create=true" />}
          </Route>
          <ProtectedRoute path="/settings" component={SettingsPage} />
          <ProtectedRoute path="/sessions" component={SessionsPage} />
          <ProtectedRoute path="/dashboard" component={DashboardPage} />
          <ProtectedRoute path="/friends" component={FriendsPage} />
          <Route path="/admin">
            {user?.role === 'admin' ? <AdminDashboard /> : <HomePage />}
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default function App() {
  // Add console logs for debugging
  console.log("Rendering App component");
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<div>Loading application...</div>}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="studysphere-theme">
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
