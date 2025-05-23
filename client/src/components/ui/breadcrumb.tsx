import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  segments: {
    name: string;
    href?: string;
  }[];
  separator?: React.ReactNode;
  homeHref?: string;
  showHomeIcon?: boolean;
}

export const Breadcrumb = ({
  segments,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
  homeHref = "/",
  showHomeIcon = true,
  className,
  ...props
}: BreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm", className)}
      {...props}
    >
      <ol className="flex items-center space-x-1">
        {showHomeIcon && (
          <li>
            <a
              href={homeHref}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </a>
          </li>
        )}
        
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            {(index > 0 || showHomeIcon) && (
              <li className="flex items-center" aria-hidden="true">
                {separator}
              </li>
            )}
            <li>
              {segment.href ? (
                <a
                  href={segment.href}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    index === segments.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {segment.name}
                </a>
              ) : (
                <span
                  className={cn(
                    index === segments.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {segment.name}
                </span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};
