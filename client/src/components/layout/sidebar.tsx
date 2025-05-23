import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  MessageSquareText,
  FileEdit,
  Users,
  Clock,
  ChevronDown,
  File,
  CalendarClock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StudyGroup } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [openStudyGroups, setOpenStudyGroups] = useState(true);

  // Fetch user's study groups
  const { data: studyGroups = [] } = useQuery<StudyGroup[]>({
    queryKey: [`/api/groups/user/${user?.id}`],
    enabled: !!user,
  });

  const navigationLinks = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Past Papers", href: "/papers", icon: File },
    { name: "Discussions", href: "/discussions", icon: MessageSquareText },
    { name: "Study Groups", href: "/groups", icon: Users },
    { name: "Study Sessions", href: "/sessions", icon: CalendarClock },
  ];

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className={cn("h-full border-r border-gray-200 bg-white", className)}>
      <nav className="h-full overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigationLinks.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-left",
                isActive(item.href)
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        
        <Collapsible
          open={openStudyGroups}
          onOpenChange={setOpenStudyGroups}
          className="mt-8 space-y-1"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Your Study Groups</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                openStudyGroups && "transform rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {studyGroups.length > 0 ? (
              studyGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 group text-left"
                >
                  <span
                    className="w-2 h-2 mr-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  ></span>
                  <span className="truncate">{group.name}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 italic">
                No groups joined yet
              </div>
            )}
            <button
              onClick={() => navigate("/groups/new")}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-primary hover:bg-gray-100 text-left"
            >
              + Create new group
            </button>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Upcoming Sessions
          </h3>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => navigate("/sessions")}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 text-left"
            >
              <Clock className="mr-3 h-4 w-4 text-gray-400" />
              <span>View all sessions</span>
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
