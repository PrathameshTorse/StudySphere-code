import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Query to get all users
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });
  
  // Query to get first admin
  console.log('Defining firstAdmin query');
  const { data: firstAdminData, isLoading: isLoadingFirstAdmin, error: firstAdminError } = useQuery({
    queryKey: ['/api/admin/first-admin'],
    queryFn: async () => {
      console.log('Fetching first admin...');
      const res = await fetch('/api/admin/first-admin');
      if (!res.ok) throw new Error('Failed to fetch first admin');
      return res.json();
    },
    enabled: false,
  });
  
  console.log('firstAdmin query state - data:', firstAdminData, 'isLoading:', isLoadingFirstAdmin, 'error:', firstAdminError);
  
  // Use useEffect to trigger the first admin query after mount
  useEffect(() => {
    console.log('AdminDashboard useEffect triggered');
    // Manually trigger the query after component mounts
    queryClient.refetchQueries(['/api/admin/first-admin']);
  }, []);
  
  // Use firstAdminData from the query result
  const firstAdmin = firstAdminData;
  
  // Mutation to make user admin
  const makeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/make-admin`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to make user admin');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User has been made an admin",
      });
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to remove admin
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/remove-admin`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to remove admin');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin privileges have been removed",
      });
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const isFirstAdmin = firstAdmin?.id === user?.id;
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Admin Management Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Admin Management</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user: any) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.profilePicture || '/default-avatar.png'} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.displayName || user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isAdmin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                    {user.id === firstAdmin?.id && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Owner
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isFirstAdmin && user.id !== firstAdmin?.id && (
                      <div className="space-x-2">
                        {!user.isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => makeAdminMutation.mutate(user.id)}
                            disabled={makeAdminMutation.isPending}
                          >
                            Make Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAdminMutation.mutate(user.id)}
                            disabled={removeAdminMutation.isPending}
                          >
                            Remove Admin
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Rest of your admin dashboard content */}
    </div>
  );
} 