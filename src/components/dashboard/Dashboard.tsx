import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Key, Activity, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ApiKeyCard from "./ApiKeyCard";
import CreateApiKeyDialog from "./CreateApiKeyDialog";

interface Profile {
  email: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  duration: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchApiKeys = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "API Key Deleted",
        description: "API key has been successfully deleted",
      });

      fetchApiKeys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchApiKeys();
  }, []);

  const activeKeys = apiKeys.filter(key => key.is_active && (!key.expires_at || new Date(key.expires_at) > new Date()));
  const expiredKeys = apiKeys.filter(key => key.expires_at && new Date(key.expires_at) <= new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">ZETECH MD BOT</h1>
            <p className="text-muted-foreground">API Key Management Dashboard</p>
            {profile && (
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiKeys.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeKeys.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Keys</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredKeys.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">API Keys</h2>
            <CreateApiKeyDialog onApiKeyCreated={fetchApiKeys} />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first API key to get started with ZETECH MD BOT
                </p>
                <CreateApiKeyDialog onApiKeyCreated={fetchApiKeys} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onDelete={handleDeleteApiKey}
                />
              ))}
            </div>
          )}
        </div>

        {/* API Endpoint Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>API Verification Endpoint</CardTitle>
            <CardDescription>
              Use this endpoint to verify API keys in your Telegram bot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <div className="mb-2">
                <strong>Endpoint:</strong> https://gqvqvsbpszgbottgtcrf.supabase.co/functions/v1/verify-api-key
              </div>
              <div className="mb-2">
                <strong>Method:</strong> POST
              </div>
              <div className="mb-2">
                <strong>Headers:</strong> Content-Type: application/json
              </div>
              <div>
                <strong>Body:</strong> {"{ \"api_key\": \"your_api_key_here\" }"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}