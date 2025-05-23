import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";

export default function TestPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Test Page</h1>
        <p className="mt-4">
          This is a test page to check if routing works correctly.
        </p>
        {user ? (
          <p className="mt-2">
            You are logged in as: <strong>{user.username}</strong>
          </p>
        ) : (
          <p className="mt-2">You are not logged in.</p>
        )}
      </div>
    </AppShell>
  );
}