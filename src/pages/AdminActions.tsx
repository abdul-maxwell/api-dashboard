import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  Key, 
  Bell, 
  Database, 
  Settings, 
  Shield, 
  BarChart3,
  FileText,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SupportChatbot from "@/components/chat/SupportChatbot";
import CreateUserDialog from "@/components/dashboard/CreateUserDialog";
import EmailDiagnostics from "@/components/dashboard/EmailDiagnostics";

interface SystemStats {
  totalUsers: number;
  totalApiKeys: number;
  activeApiKeys: number;
  expiredApiKeys: number;
  trialKeys: number;
  paidKeys: number;
  totalNotifications: number;
  unreadNotifications: number;
}

export default function AdminActions() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalApiKeys: 0,
    activeApiKeys: 0,
    expiredApiKeys: 0,
    trialKeys: 0,
    paidKeys: 0,
    totalNotifications: 0,
    unreadNotifications: 0
  });

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    
    initializeUser();
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch API keys stats
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('is_active, expires_at, is_trial, payment_status');

      // Fetch notifications stats
      const { count: totalNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      const { count: unreadNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      const now = new Date();
      const activeKeys = apiKeys?.filter(key => key.is_active && (!key.expires_at || new Date(key.expires_at) > now)) || [];
      const expiredKeys = apiKeys?.filter(key => key.expires_at && new Date(key.expires_at) <= now) || [];
      const trialKeys = apiKeys?.filter(key => key.is_trial) || [];
      const paidKeys = apiKeys?.filter(key => !key.is_trial && key.payment_status === 'completed') || [];

      setSystemStats({
        totalUsers: usersCount || 0,
        totalApiKeys: apiKeys?.length || 0,
        activeApiKeys: activeKeys.length,
        expiredApiKeys: expiredKeys.length,
        trialKeys: trialKeys.length,
        paidKeys: paidKeys.length,
        totalNotifications: totalNotifications || 0,
        unreadNotifications: unreadNotifications || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      switch (action) {
        case 'cleanup_expired':
          const { error: cleanupError } = await supabase
            .from('api_keys')
            .update({ is_active: false })
            .eq('is_active', true)
            .lt('expires_at', new Date().toISOString());
          
          if (cleanupError) throw cleanupError;
          
          toast({
            title: "Cleanup Complete",
            description: "Expired API keys have been deactivated",
          });
          break;

        case 'cleanup_notifications':
          const { error: notificationError } = await supabase
            .from('notifications')
            .delete()
            .eq('is_read', true)
            .lt('read_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days ago
          
          if (notificationError) throw notificationError;
          
          toast({
            title: "Cleanup Complete",
            description: "Old read notifications have been deleted",
          });
          break;

        case 'refresh_stats':
          await fetchSystemStats();
          toast({
            title: "Stats Refreshed",
            description: "System statistics have been updated",
          });
          break;

        default:
          toast({
            title: "Action Not Implemented",
            description: "This action is not yet implemented",
            variant: "destructive",
          });
      }
    } catch (error: any) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to execute ${action}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const actionCategories = [
    {
      title: "User Management",
      description: "Manage users and their accounts",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      actions: [
        {
          title: "View All Users",
          description: "Browse and manage user accounts",
          icon: Users,
          onClick: () => navigate('/admin'),
          available: true,
          isDialog: false
        },
        {
          title: "Create New User",
          description: "Add new users to the system",
          icon: Users,
          onClick: () => {}, // Will be handled by the dialog
          available: true,
          isDialog: true
        },
        {
          title: "Bulk User Actions",
          description: "Perform actions on multiple users",
          icon: Users,
          onClick: () => toast({ title: "Coming Soon", description: "Bulk user actions will be available soon" }),
          available: false,
          isDialog: false
        }
      ]
    },
    {
      title: "API Key Management",
      description: "Manage API keys and access",
      icon: Key,
      color: "text-green-500",
      bgColor: "bg-green-50",
      actions: [
        {
          title: "Create API Keys",
          description: "Generate new API keys for users",
          icon: Key,
          onClick: () => navigate('/admin'),
          available: true,
          isDialog: false
        },
        {
          title: "Bulk Key Operations",
          description: "Manage multiple API keys at once",
          icon: Key,
          onClick: () => toast({ title: "Coming Soon", description: "Bulk key operations will be available soon" }),
          available: false,
          isDialog: false
        }
      ]
    },
    {
      title: "Notification System",
      description: "Send and manage notifications",
      icon: Bell,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      actions: [
        {
          title: "Send Notifications",
          description: "Send messages to users",
          icon: Bell,
          onClick: () => navigate('/admin'),
          available: true,
          isDialog: false
        },
        {
          title: "Notification Templates",
          description: "Create reusable notification templates",
          icon: FileText,
          onClick: () => toast({ title: "Coming Soon", description: "Notification templates will be available soon" }),
          available: false,
          isDialog: false
        }
      ]
    },
    {
      title: "System Maintenance",
      description: "System cleanup and maintenance tasks",
      icon: Settings,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      actions: [
        {
          title: "Cleanup Expired Keys",
          description: "Deactivate expired API keys",
          icon: Trash2,
          onClick: () => handleBulkAction('cleanup_expired'),
          available: true,
          isDialog: false
        },
        {
          title: "Cleanup Old Notifications",
          description: "Remove old read notifications",
          icon: Trash2,
          onClick: () => handleBulkAction('cleanup_notifications'),
          available: true,
          isDialog: false
        },
        {
          title: "Refresh Statistics",
          description: "Update system statistics",
          icon: RefreshCw,
          onClick: () => handleBulkAction('refresh_stats'),
          available: true,
          isDialog: false
        }
      ]
    },
    {
      title: "Security & Monitoring",
      description: "Security and system monitoring",
      icon: Shield,
      color: "text-red-500",
      bgColor: "bg-red-50",
      actions: [
        {
          title: "Security Audit",
          description: "Review system security settings",
          icon: Shield,
          onClick: () => toast({ title: "Coming Soon", description: "Security audit will be available soon" }),
          available: false,
          isDialog: false
        },
        {
          title: "Activity Logs",
          description: "View system activity and logs",
          icon: Activity,
          onClick: () => toast({ title: "Coming Soon", description: "Activity logs will be available soon" }),
          available: false,
          isDialog: false
        }
      ]
    },
    {
      title: "Analytics & Reports",
      description: "System analytics and reporting",
      icon: BarChart3,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      actions: [
        {
          title: "Usage Analytics",
          description: "View system usage statistics",
          icon: BarChart3,
          onClick: () => toast({ title: "Coming Soon", description: "Usage analytics will be available soon" }),
          available: false,
          isDialog: false
        },
        {
          title: "Export Data",
          description: "Export system data and reports",
          icon: Download,
          onClick: () => toast({ title: "Coming Soon", description: "Data export will be available soon" }),
          available: false,
          isDialog: false
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary animate-fade-in">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-in-right">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-4xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent">
                Admin Actions
              </h1>
              <p className="text-muted-foreground text-lg">Advanced admin functions and system management</p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-bounce-in">
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalApiKeys}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.activeApiKeys} active, {systemStats.expiredApiKeys} expired
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Key Types</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.trialKeys + systemStats.paidKeys}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.trialKeys} trial, {systemStats.paidKeys} paid
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalNotifications}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.unreadNotifications} unread
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Diagnostics */}
        <div className="mb-6">
          <EmailDiagnostics />
        </div>

        {/* Action Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionCategories.map((category, index) => (
            <Card key={category.title} className="card-hover transition-smooth animate-slide-in-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-poppins">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.actions.map((action, actionIndex) => (
                    <div key={actionIndex}>
                      {action.isDialog && action.available ? (
                        <CreateUserDialog onUserCreated={fetchSystemStats} />
                      ) : (
                        <Button
                          variant={action.available ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={action.onClick}
                          disabled={!action.available}
                        >
                          <action.icon className="h-4 w-4" />
                          {action.title}
                          {!action.available && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Soon
                            </Badge>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Support Chatbot */}
        <SupportChatbot userId={user?.id} isAdmin={true} />
      </div>
    </div>
  );
}
