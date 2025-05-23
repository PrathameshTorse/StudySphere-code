import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock, User, Bell, Globe, Moon, Sun, LogOut, KeyRound, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Theme type definitions
type ThemeVariant = 'professional' | 'tint' | 'vibrant';
type ThemeAppearance = 'light' | 'dark' | 'system';

interface ThemeSettings {
  variant: ThemeVariant;
  primary: string;
  appearance: ThemeAppearance;
  radius: number;
}

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    discussionReplies: true,
    studySessionReminders: true,
    resourceUpdates: false
  });
  
  // Theme states
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    variant: 'professional',
    primary: 'hsl(222.2 47.4% 11.2%)',
    appearance: 'system',
    radius: 0.5
  });
  const [saveThemePending, setSaveThemePending] = useState(false);
  
  // Load current theme settings
  useEffect(() => {
    const fetchThemeSettings = async () => {
      try {
        const response = await fetch('/theme.json');
        if (response.ok) {
          const data = await response.json();
          setThemeSettings(data);
        }
      } catch (error) {
        console.error('Error loading theme settings:', error);
      }
    };
    
    fetchThemeSettings();
  }, []);
  
  // Theme update mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (data: ThemeSettings) => {
      setSaveThemePending(true);
      try {
        const res = await apiRequest("POST", "/api/theme", data);
        return res.json();
      } finally {
        setSaveThemePending(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Theme updated",
        description: "Your appearance settings have been saved.",
      });
      // Force reload to apply new theme
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Theme update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleThemeChange = (appearance: ThemeAppearance) => {
    setThemeSettings(prev => ({ ...prev, appearance }));
  };
  
  const handleAccentColorChange = (color: string) => {
    setThemeSettings(prev => ({ ...prev, primary: color }));
  };
  
  const handleSaveTheme = () => {
    updateThemeMutation.mutate(themeSettings);
  };

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notificationSettings) => {
      const res = await apiRequest("PATCH", `/api/user/${user?.id}/notifications`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => {
      return { ...prev, [setting]: !prev[setting] };
    });
  };
  
  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(notificationSettings);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate(passwordData);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Settings" },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 mt-1">Manage your security and application preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Button className="w-full justify-start" size="sm" variant="outline" asChild>
                    <a href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile Information
                    </a>
                  </Button>
                  <Button className="w-full justify-start" size="sm" variant="default" asChild>
                    <a href="/settings">
                      <Lock className="mr-2 h-4 w-4" />
                      Security Settings
                    </a>
                  </Button>
                  <Button onClick={handleLogout} className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" variant="outline">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="password" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>
              
              {/* Password Tab */}
              <TabsContent value="password" className="space-y-4">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold">Change Password</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Update your password to maintain account security
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handlePasswordSubmit}>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-base font-medium">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordInputChange}
                            placeholder="Enter your current password"
                            disabled={updatePasswordMutation.isPending}
                            className="pl-10 py-6 text-base"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-base font-medium">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={handlePasswordInputChange}
                            placeholder="Enter new password"
                            disabled={updatePasswordMutation.isPending}
                            className="pl-10 py-6 text-base"
                          />
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Password should be at least 8 characters long and include numbers and special characters.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordInputChange}
                            placeholder="Confirm new password"
                            disabled={updatePasswordMutation.isPending}
                            className="pl-10 py-6 text-base"
                          />
                          <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="border-t pt-6 flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Use a strong password with at least 8 characters.
                      </div>
                      <Button 
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="px-6 transition-all duration-300 hover:shadow-md"
                        size="lg"
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Updating...
                          </>
                        ) : "Update Password"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold">Notification Preferences</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Configure how and when you'd like to be notified
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="space-y-0.5">
                          <Label htmlFor="emailNotifications" className="text-base font-medium">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="emailNotifications"
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={() => handleNotificationChange('emailNotifications')}
                          className="scale-110"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="space-y-0.5">
                          <Label htmlFor="discussionReplies" className="text-base font-medium">Discussion Replies</Label>
                          <p className="text-sm text-muted-foreground">Get notified when someone replies to your discussions</p>
                        </div>
                        <Switch
                          id="discussionReplies"
                          checked={notificationSettings.discussionReplies}
                          onCheckedChange={() => handleNotificationChange('discussionReplies')}
                          className="scale-110"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="space-y-0.5">
                          <Label htmlFor="studySessionReminders" className="text-base font-medium">Study Session Reminders</Label>
                          <p className="text-sm text-muted-foreground">Get reminders for upcoming study sessions</p>
                        </div>
                        <Switch
                          id="studySessionReminders"
                          checked={notificationSettings.studySessionReminders}
                          onCheckedChange={() => handleNotificationChange('studySessionReminders')}
                          className="scale-110"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="resourceUpdates" className="text-base font-medium">Resource Updates</Label>
                          <p className="text-sm text-muted-foreground">Get notified about new resources in your courses</p>
                        </div>
                        <Switch
                          id="resourceUpdates"
                          checked={notificationSettings.resourceUpdates}
                          onCheckedChange={() => handleNotificationChange('resourceUpdates')}
                          className="scale-110"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-6 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      You can change these settings at any time.
                    </div>
                    <Button 
                      onClick={handleSaveNotifications}
                      disabled={updateNotificationsMutation.isPending}
                      className="px-6 transition-all duration-300 hover:shadow-md"
                      size="lg"
                    >
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : "Save Preferences"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-4">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold">Appearance Settings</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Customize how StudySphere looks and feels to match your preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium mb-3 block">Appearance</Label>
                        <div className="grid grid-cols-3 gap-4">
                          <div 
                            className={`border rounded-md p-6 flex flex-col items-center space-y-3 cursor-pointer transition-all duration-200 ${
                              themeSettings.appearance === 'dark' 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'hover:border-primary hover:shadow-sm'
                            }`}
                            onClick={() => handleThemeChange('dark')}
                          >
                            <div className="bg-gray-900 w-full h-16 rounded-md flex items-center justify-center">
                              <Moon className={`h-6 w-6 text-gray-100 ${themeSettings.appearance === 'dark' ? 'text-white' : ''}`} />
                            </div>
                            <span className={`text-sm font-medium ${themeSettings.appearance === 'dark' ? 'text-primary' : ''}`}>Dark</span>
                          </div>
                          <div 
                            className={`border rounded-md p-6 flex flex-col items-center space-y-3 cursor-pointer transition-all duration-200 ${
                              themeSettings.appearance === 'system' 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'hover:border-primary hover:shadow-sm'
                            }`}
                            onClick={() => handleThemeChange('system')}
                          >
                            <div className="bg-gradient-to-r from-gray-900 to-gray-100 w-full h-16 rounded-md flex items-center justify-center">
                              <Globe className={`h-6 w-6 text-white ${themeSettings.appearance === 'system' ? 'text-white' : ''}`} />
                            </div>
                            <span className={`text-sm font-medium ${themeSettings.appearance === 'system' ? 'text-primary' : ''}`}>System</span>
                          </div>
                          <div 
                            className={`border rounded-md p-6 flex flex-col items-center space-y-3 cursor-pointer transition-all duration-200 ${
                              themeSettings.appearance === 'light' 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'hover:border-primary hover:shadow-sm'
                            }`}
                            onClick={() => handleThemeChange('light')}
                          >
                            <div className="bg-gray-100 w-full h-16 rounded-md flex items-center justify-center">
                              <Sun className={`h-6 w-6 text-gray-900 ${themeSettings.appearance === 'light' ? 'text-black' : ''}`} />
                            </div>
                            <span className={`text-sm font-medium ${themeSettings.appearance === 'light' ? 'text-primary' : ''}`}>Light</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Label className="text-base font-medium mb-3 block">Accent Color</Label>
                        <div className="grid grid-cols-6 gap-4 p-2">
                          <div 
                            className={`h-10 w-10 rounded-full bg-blue-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(221.2 83.2% 53.3%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(221.2 83.2% 53.3%)')}
                          ></div>
                          <div 
                            className={`h-10 w-10 rounded-full bg-purple-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(262.1 83.3% 57.8%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(262.1 83.3% 57.8%)')}
                          ></div>
                          <div 
                            className={`h-10 w-10 rounded-full bg-pink-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(330.1 81.2% 60.2%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(330.1 81.2% 60.2%)')}
                          ></div>
                          <div 
                            className={`h-10 w-10 rounded-full bg-red-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(0 72.2% 50.6%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(0 72.2% 50.6%)')}
                          ></div>
                          <div 
                            className={`h-10 w-10 rounded-full bg-amber-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(38 92.7% 50.2%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(38 92.7% 50.2%)')}
                          ></div>
                          <div 
                            className={`h-10 w-10 rounded-full bg-green-500 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                              themeSettings.primary === 'hsl(142.1 76.2% 36.3%)' ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                            }`}
                            onClick={() => handleAccentColorChange('hsl(142.1 76.2% 36.3%)')}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-6 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Changes will take effect immediately after saving.
                    </div>
                    <Button 
                      onClick={handleSaveTheme}
                      disabled={saveThemePending || updateThemeMutation.isPending}
                      className="px-6 transition-all duration-300 hover:shadow-md"
                      size="lg"
                    >
                      {saveThemePending || updateThemeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : "Save Preferences"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}