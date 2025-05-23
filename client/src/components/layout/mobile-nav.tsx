import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Home, FileText, MessageSquareText, Users, CalendarClock, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  if (!user) {
    return null; // Don't show mobile nav on auth pages
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4">
          <div className="px-2 py-4">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/")}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={location === "/papers" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/papers")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Past Papers
            </Button>
            <Button
              variant={location === "/discussions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/discussions")}
            >
              <MessageSquareText className="mr-2 h-4 w-4" />
              Discussion Forums
            </Button>
            <Button
              variant={location === "/groups" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/groups")}
            >
              <Users className="mr-2 h-4 w-4" />
              Study Groups
            </Button>
            <Button
              variant={location === "/sessions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/sessions")}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Study Sessions
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
