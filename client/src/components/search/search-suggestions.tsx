import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Search, FileText, MessageSquare, Users, Calendar } from "lucide-react";
import { useLocation } from "wouter";

type SearchResult = {
  id: string | number;
  title: string;
  type: 'paper' | 'discussion' | 'group' | 'session';
  url: string;
}

export function SearchSuggestions() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current);
    }

    setLoading(true);

    // Set a new timeout to prevent too many API calls
    searchTimeout.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          console.error("Search error:", response.statusText);
          setResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        window.clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'paper':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'discussion':
        return <MessageSquare className="h-4 w-4 mr-2" />;
      case 'group':
        return <Users className="h-4 w-4 mr-2" />;
      case 'session':
        return <Calendar className="h-4 w-4 mr-2" />;
      default:
        return <Search className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <span className="sr-only">Search</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search papers, discussions, groups..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? "Searching..." : "No results found."}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result)}
                >
                  {getIcon(result.type)}
                  <span>{result.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {result.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
