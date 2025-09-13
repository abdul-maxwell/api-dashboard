import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, Users, Key, Plus, Pause, Play, Trash2, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface User {
  user_id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  api_keys: any[];
}

interface AdminResponse {
  success: boolean;
  message: string;
  api_key?: string;
  expires_at?: string;
}

interface CreateApiKeyForm {
  targetUserId: string;
  name: string;
  durationType: string;
  customDays: number;
  adminNotes: string;
}

interface ManageApiKeyForm {
  action: string;
  pauseDays: number;
  pauseReason: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createApiKeyForm, setCreateApiKeyForm] = useState<CreateApiKeyForm>({
    targetUserId: "",
    name: "",
    durationType: "1_week",
    customDays: 7,
    adminNotes: ""
  });
  const [manageApiKeyForm, setManageApiKeyForm] = useState<ManageApiKeyForm>({
    action: "",
    pauseDays: 7,
    pauseReason: ""
  });
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/isadmin");
        return;
      }

      // Check if user has admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error || !profile || !['admin', 'super_admin'].includes(profile.role)) {
        navigate("/isadmin");
        return;
      }

      fetchUsers();
    };

    checkAdminAuth();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // First, let's check the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      // Check if user has admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session?.user.id)
        .single();
      
      console.log('User profile:', profile);
      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        throw new Error('User does not have admin privileges');
      }

      // Try to call the admin function first
      console.log('Calling admin_get_all_users...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_all_users');
      console.log('RPC response:', { data: rpcData, error: rpcError });
      
      if (rpcError) {
        console.warn('RPC failed, trying fallback method:', rpcError);
        
        // Fallback: Get users and API keys separately
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          throw profilesError;
        }
        
        const { data: apiKeys, error: apiKeysError } = await supabase
          .from('api_keys')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (apiKeysError) {
          throw apiKeysError;
        }
        
        // Combine profiles with their API keys
        const usersWithKeys = (profiles || []).map((profile: any) => ({
          user_id: profile.user_id,
          email: profile.email,
          username: profile.username || 'user_' + profile.user_id.substring(0, 8),
          role: profile.role || 'user',
          created_at: profile.created_at,
          api_keys: (apiKeys || []).filter((key: any) => key.user_id === profile.user_id)
        }));
        
        console.log('Fallback users:', usersWithKeys);
        setUsers(usersWithKeys);
      } else {
        // Parse the JSON data properly
        const parsedUsers = (rpcData || []).map((user: any) => ({
          ...user,
          api_keys: Array.isArray(user.api_keys) ? user.api_keys : []
        }));
        console.log('Parsed users:', parsedUsers);
        setUsers(parsedUsers);
      }
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: `Failed to load users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCreateApiKey = async () => {
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_api_key', {
        p_target_user_id: createApiKeyForm.targetUserId,
        p_name: createApiKeyForm.name,
        p_duration_type: createApiKeyForm.durationType,
        p_custom_days: createApiKeyForm.durationType === 'custom' ? createApiKeyForm.customDays : null,
        p_admin_notes: createApiKeyForm.adminNotes
      });

      if (rpcError) {
        console.warn('RPC failed, trying fallback method:', rpcError);
        
        // Fallback: Create API key directly
        const keyValue = 'ak_' + Array.from({ length: 32 }, () => 
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            .charAt(Math.floor(Math.random() * 62))
        ).join('');

        // Calculate expiration date
        let expiresAt = null;
        let duration = createApiKeyForm.durationType;
        
        if (createApiKeyForm.durationType === 'custom') {
          expiresAt = new Date(Date.now() + createApiKeyForm.customDays * 24 * 60 * 60 * 1000).toISOString();
          duration = 'forever'; // Use forever for custom durations
        } else {
          switch (createApiKeyForm.durationType) {
            case '1_week':
              expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              break;
            case '1_month':
              expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              duration = '30_days';
              break;
            case '2_months':
              expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
              duration = '60_days';
              break;
            case '1_year':
              expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
              duration = 'forever';
              break;
            case 'lifetime':
              expiresAt = null;
              duration = 'forever';
              break;
          }
        }

        // Deactivate existing active API keys for the user
        await supabase
          .from('api_keys')
          .update({ is_active: false })
          .eq('user_id', createApiKeyForm.targetUserId)
          .eq('is_active', true);

        // Create the new API key
        const { error: insertError } = await supabase
          .from('api_keys')
          .insert({
            user_id: createApiKeyForm.targetUserId,
            name: createApiKeyForm.name,
            key_value: keyValue,
            duration: duration as "1_week" | "30_days" | "60_days" | "forever",
            expires_at: expiresAt,
            is_active: true,
            created_by_admin: true,
            admin_notes: createApiKeyForm.adminNotes
          });

        if (insertError) {
          throw insertError;
        }

        toast({
          title: "Success",
          description: `API key "${createApiKeyForm.name}" created successfully for user`,
        });
      } else {
        // RPC function worked
        const response = rpcData as unknown as AdminResponse;
        if (response.success) {
          toast({
            title: "Success",
            description: response.message,
          });
        } else {
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
          return;
        }
      }

      // Refresh users list and reset form
      fetchUsers();
      setCreateApiKeyForm({
        targetUserId: "",
        name: "",
        durationType: "1_week",
        customDays: 7,
        adminNotes: ""
      });
    } catch (error: any) {
      console.error('Create API key error:', error);
      toast({
        title: "Error",
        description: `Failed to create API key: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleManageApiKey = async () => {
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_manage_api_key', {
        p_api_key_id: selectedApiKeyId,
        p_action: manageApiKeyForm.action,
        p_pause_days: manageApiKeyForm.action === 'pause' ? manageApiKeyForm.pauseDays : null,
        p_pause_reason: manageApiKeyForm.action === 'pause' ? manageApiKeyForm.pauseReason : null
      });

      if (rpcError) {
        console.warn('RPC failed, trying fallback method:', rpcError);
        
        // Fallback: Manage API key directly
        let updateData: any = {};
        
        switch (manageApiKeyForm.action) {
          case 'delete':
            const { error: deleteError } = await supabase
              .from('api_keys')
              .delete()
              .eq('id', selectedApiKeyId);
            
            if (deleteError) throw deleteError;
            
            toast({
              title: "Success",
              description: "API key deleted successfully",
            });
            break;
            
          case 'deactivate':
            updateData = { is_active: false, status: 'inactive' };
            break;
            
          case 'activate':
            updateData = { is_active: true, status: 'active', paused_until: null, paused_reason: null };
            break;
            
          case 'pause':
            const pauseUntil = new Date(Date.now() + manageApiKeyForm.pauseDays * 24 * 60 * 60 * 1000).toISOString();
            updateData = { 
              is_active: false, 
              status: 'paused', 
              paused_until: pauseUntil,
              paused_reason: manageApiKeyForm.pauseReason 
            };
            break;
            
          default:
            throw new Error('Invalid action');
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('api_keys')
            .update(updateData)
            .eq('id', selectedApiKeyId);
          
          if (updateError) throw updateError;
          
          toast({
            title: "Success",
            description: `API key ${manageApiKeyForm.action}d successfully`,
          });
        }
      } else {
        // RPC function worked
        const response = rpcData as unknown as AdminResponse;
        if (response.success) {
          toast({
            title: "Success",
            description: response.message,
          });
        } else {
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
          return;
        }
      }

      // Refresh users list and reset form
      fetchUsers();
      setManageApiKeyForm({
        action: "",
        pauseDays: 7,
        pauseReason: ""
      });
      setSelectedApiKeyId("");
    } catch (error: any) {
      console.error('Manage API key error:', error);
      toast({
        title: "Error",
        description: `Failed to manage API key: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete user's API keys first
      const { error: apiKeysError } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId);

      if (apiKeysError) throw apiKeysError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (apiKey: any) => {
    if (!apiKey.is_active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (apiKey.status === 'paused') {
      return <Badge variant="secondary">Paused</Badge>;
    }
    if (apiKey.expires_at && new Date(apiKey.expires_at) <= new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Active</Badge>;
  };

  const totalApiKeys = users.reduce((acc, user) => acc + user.api_keys.length, 0);
  const activeApiKeys = users.reduce((acc, user) => 
    acc + user.api_keys.filter(key => key.is_active && (!key.expires_at || new Date(key.expires_at) > new Date())).length, 0);

  return (
    <div className="min-h-screen bg-gradient-secondary animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-in-right">
          <div>
            <h1 className="text-4xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">Manage users and API keys</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-bounce-in">
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Total Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-poppins">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Total API Keys</CardTitle>
              <Key className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-poppins">{totalApiKeys}</div>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Active Keys</CardTitle>
              <Shield className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success font-poppins">{activeApiKeys}</div>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Admin Actions</CardTitle>
              <Settings className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for a user
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="targetUser">Target User</Label>
                        <Select 
                          value={createApiKeyForm.targetUserId} 
                          onValueChange={(value) => setCreateApiKeyForm(prev => ({ ...prev, targetUserId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.user_id} value={user.user_id}>
                                {user.email} ({user.username})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="keyName">API Key Name</Label>
                        <Input
                          id="keyName"
                          value={createApiKeyForm.name}
                          onChange={(e) => setCreateApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Premium Access"
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration</Label>
                        <Select 
                          value={createApiKeyForm.durationType} 
                          onValueChange={(value) => setCreateApiKeyForm(prev => ({ ...prev, durationType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1_week">1 Week</SelectItem>
                            <SelectItem value="1_month">1 Month</SelectItem>
                            <SelectItem value="2_months">2 Months</SelectItem>
                            <SelectItem value="1_year">1 Year</SelectItem>
                            <SelectItem value="lifetime">Lifetime</SelectItem>
                            <SelectItem value="custom">Custom Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {createApiKeyForm.durationType === 'custom' && (
                        <div>
                          <Label htmlFor="customDays">Custom Days</Label>
                          <Input
                            id="customDays"
                            type="number"
                            value={createApiKeyForm.customDays}
                            onChange={(e) => setCreateApiKeyForm(prev => ({ ...prev, customDays: parseInt(e.target.value) }))}
                            min="1"
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="adminNotes">Admin Notes</Label>
                        <Textarea
                          id="adminNotes"
                          value={createApiKeyForm.adminNotes}
                          onChange={(e) => setCreateApiKeyForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                          placeholder="Internal notes about this API key"
                        />
                      </div>
                      <Button onClick={handleCreateApiKey} className="w-full">
                        Create API Key
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage all users and their API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {users.map((user) => (
                  <div key={user.user_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{user.email}</h3>
                        <p className="text-sm text-muted-foreground">
                          Username: {user.username} | Role: {user.role} | 
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </Button>
                    </div>
                    
                    {user.api_keys.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>API Key</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.api_keys.map((apiKey) => (
                            <TableRow key={apiKey.id}>
                              <TableCell>{apiKey.name}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {apiKey.key_value.substring(0, 20)}...
                              </TableCell>
                              <TableCell>{apiKey.duration.replace('_', ' ')}</TableCell>
                              <TableCell>
                                {apiKey.expires_at 
                                  ? new Date(apiKey.expires_at).toLocaleDateString()
                                  : 'Never'
                                }
                              </TableCell>
                              <TableCell>{getStatusBadge(apiKey)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedApiKeyId(apiKey.id)}
                                      >
                                        <Settings className="h-3 w-3" />
                                        Manage
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Manage API Key</DialogTitle>
                                        <DialogDescription>
                                          Pause, activate, or delete this API key
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Action</Label>
                                          <Select 
                                            value={manageApiKeyForm.action} 
                                            onValueChange={(value) => setManageApiKeyForm(prev => ({ ...prev, action: value }))}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select an action" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pause">Pause</SelectItem>
                                              <SelectItem value="activate">Activate</SelectItem>
                                              <SelectItem value="deactivate">Deactivate</SelectItem>
                                              <SelectItem value="delete">Delete</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {manageApiKeyForm.action === 'pause' && (
                                          <>
                                            <div>
                                              <Label htmlFor="pauseDays">Pause Duration (Days)</Label>
                                              <Input
                                                id="pauseDays"
                                                type="number"
                                                value={manageApiKeyForm.pauseDays}
                                                onChange={(e) => setManageApiKeyForm(prev => ({ ...prev, pauseDays: parseInt(e.target.value) }))}
                                                min="1"
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="pauseReason">Pause Reason</Label>
                                              <Textarea
                                                id="pauseReason"
                                                value={manageApiKeyForm.pauseReason}
                                                onChange={(e) => setManageApiKeyForm(prev => ({ ...prev, pauseReason: e.target.value }))}
                                                placeholder="Reason for pausing this API key"
                                              />
                                            </div>
                                          </>
                                        )}
                                        <Button onClick={handleManageApiKey} className="w-full">
                                          Execute Action
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No API keys found for this user
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}