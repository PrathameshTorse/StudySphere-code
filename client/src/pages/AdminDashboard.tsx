import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { User, AdminStats as BaseAdminStats, AdminAction, Paper } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <div className="p-4">{children}</div>}
    </div>
  );
}

interface Activity {
  id: number;
  createdAt: Date;
  metadata: {
    title: string;
  };
  userId: number;
  type: string;
  targetId: number;
  targetType: string;
}

interface AdminStats extends Omit<BaseAdminStats, 'recentActivities'> {
  recentActivities: Activity[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, statsRes, actionsRes, discussionsRes, papersRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/stats'),
          fetch('/api/admin/actions'),
          fetch('/api/admin/discussions'),
          fetch('/api/papers'),
        ]);

        if (!usersRes.ok || !statsRes.ok || !actionsRes.ok || !discussionsRes.ok || !papersRes.ok) {
          throw new Error('Failed to fetch admin data');
        }

        const [usersData, statsData, actionsData, discussionsData, papersData] = await Promise.all([
          usersRes.json(),
          statsRes.json(),
          actionsRes.json(),
          discussionsRes.json(),
          papersRes.json(),
        ]);

        setUsers(usersData);
        setStats(statsData);
        setActions(actionsData);
        setDiscussions(discussionsData);
        setPapers(papersData);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleBanUser = async (userId: number, reason: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) throw new Error('Failed to ban user');

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Failed to unban user');

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteContent = async (type: string, id: number) => {
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`Failed to delete ${type}`);

      // Update stats after deletion
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const newStats = await statsRes.json();
        setStats(newStats);
      }

      // If deleting a paper, update the papers state
      if (type === 'papers') {
        setPapers(papers.filter(paper => paper.id !== id));
      }

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Users</h3>
          <p className="text-2xl">{stats?.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Users</h3>
          <p className="text-2xl">{stats?.activeUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Papers</h3>
          <p className="text-2xl">{stats?.totalPapers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Discussions</h3>
          <p className="text-2xl">{stats?.totalDiscussions}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-4 py-2 ${activeTab === 0 ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setActiveTab(0)}
            >
              User Management
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 1 ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              Content Moderation
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 2 ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setActiveTab(2)}
            >
              Recent Actions
            </button>
          </nav>
        </div>

        {/* User Management Tab */}
        <TabPanel value={activeTab} index={0}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-4 py-2">{user.username}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">{user.role}</td>
                    <td className="px-4 py-2">
                      {user.isBanned ? (
                        <span className="text-red-500">Banned</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reason = prompt('Enter ban reason:');
                            if (reason) handleBanUser(user.id, reason);
                          }}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>

        {/* Content Moderation Tab */}
        <TabPanel value={activeTab} index={1}>
          {/* Papers Section */}
          <h3 className="text-xl font-semibold mb-4">Papers</h3>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.length > 0 ? (
                   papers.map(paper => (
                     <tr key={paper.id}>
                       <td className="px-4 py-2">{paper.title}</td>
                       <td className="px-4 py-2">
                         <button 
                           onClick={() => handleDeleteContent('papers', paper.id)}
                           className="bg-red-500 text-white px-3 py-1 rounded"
                         >
                           Delete
                         </button>
                       </td>
                     </tr>
                   ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-center text-muted-foreground">No papers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Discussions Section */}
          <h3 className="text-xl font-semibold mb-4">Discussions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discussions.length > 0 ? (
                  discussions.map(discussion => (
                    <tr key={discussion.id}>
                      <td className="px-4 py-2">{discussion.title}</td>
                      <td className="px-4 py-2">
                        <button 
                          onClick={() => handleDeleteContent('discussions', discussion.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-center text-muted-foreground">No discussions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabPanel>

        {/* Recent Actions Tab */}
        <TabPanel value={activeTab} index={2}>
          <div className="space-y-4">
            {actions.map(action => (
              <div key={action.id} className="bg-gray-50 p-4 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {action.action} {action.targetType} #{action.targetId}
                    </p>
                    <p className="text-sm text-gray-600">
                      By Admin #{action.adminId} on {new Date(action.createdAt).toLocaleString()}
                    </p>
                    {action.reason && (
                      <p className="text-sm text-gray-600">Reason: {action.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabPanel>
      </div>
    </div>
  );
} 