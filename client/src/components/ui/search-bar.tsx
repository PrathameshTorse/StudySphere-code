import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { useLocation } from 'wouter';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  fullWidth?: boolean;
  defaultValue?: string;
}

export function SearchBar({ 
  placeholder = "Search for papers, resources, discussions...", 
  className = "", 
  onSearch,
  fullWidth = false,
  defaultValue = ""
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [, setLocation] = useLocation();
  
  // Update query when defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        setLocation(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`flex items-center ${fullWidth ? 'w-full' : 'max-w-md'} ${className}`}
    >
      <div className="relative flex-grow">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 py-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      <Button 
        type="submit" 
        className="rounded-l-none"
        disabled={!query.trim()}
      >
        Search
      </Button>
    </form>
  );
}