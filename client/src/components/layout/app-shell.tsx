import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Navbar } from "./navbar";

interface AppShellProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function AppShell({ 
  children,
  showSidebar = true
}: AppShellProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation bar */}
      <Navbar />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-16 pb-4 px-4 max-w-screen-xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
