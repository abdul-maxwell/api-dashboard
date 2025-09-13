import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Key, Activity, Clock, Gift, Sparkles, Crown, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ApiKeyCard from "./ApiKeyCard";
import PaymentDialog from "./PaymentDialog";
import ClaimTrialDialog from "./ClaimTrialDialog";
import DeleteApiKeyDialog from "./DeleteApiKeyDialog";

interface Profile {
  email: string;
  has_ever_had_trial?: boolean;
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
  is_trial?: boolean;
  payment_status?: string;
  price_ksh?: number;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [hasEverHadTrial, setHasEverHadTrial] = useState(false);

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

      // Check if user has ever had a trial (including deleted ones)
      const trialKeys = data?.filter(key => key.is_trial) || [];
      const hasCurrentTrial = trialKeys.length > 0;
      const hasStoredTrial = localStorage.getItem(`trial_used_${user.id}`) === 'true';
      setHasEverHadTrial(hasCurrentTrial || hasStoredTrial);
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
      // Check if the key being deleted is a trial key
      const keyToDelete = apiKeys.find(key => key.id === id);
      const isTrialKey = keyToDelete?.is_trial;

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // If deleting a trial key, mark that the user has used their trial
      if (isTrialKey) {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          localStorage.setItem(`trial_used_${user.id}`, 'true');
          setHasEverHadTrial(true);
        }
      }

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

  const handleDeleteClick = (apiKey: ApiKey) => {
    setKeyToDelete(apiKey);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    fetchProfile();
    fetchApiKeys();
  }, []);

  const activeKeys = apiKeys.filter(key => key.is_active && (!key.expires_at || new Date(key.expires_at) > new Date()));
  const expiredKeys = apiKeys.filter(key => key.expires_at && new Date(key.expires_at) <= new Date());
  const trialKeys = apiKeys.filter(key => key.is_trial);
  const paidKeys = apiKeys.filter(key => !key.is_trial && key.payment_status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-secondary animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-in-right">
          <div>
            <h1 className="text-4xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent">
              ZETECH MD BOT
            </h1>
            <p className="text-muted-foreground text-lg">API Key Management Dashboard</p>
            {profile && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="font-medium">
                  {profile.email}
                </Badge>
                {trialKeys.length > 0 && (
                  <Badge className="bg-gradient-primary font-medium">
                    <Gift className="w-3 h-3 mr-1" />
                    Free Trial Active
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2 transition-smooth hover:shadow-[var(--shadow-card)]">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-bounce-in">
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Total API Keys</CardTitle>
              <Key className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-poppins">{apiKeys.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Active Keys</CardTitle>
              <Activity className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success font-poppins">{activeKeys.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently active</p>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Trial Keys</CardTitle>
              <Gift className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning font-poppins">{trialKeys.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Free trials</p>
            </CardContent>
          </Card>
          <Card className="card-hover transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-poppins">Paid Keys</CardTitle>
              <Crown className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-poppins">{paidKeys.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Premium access</p>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Section */}
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-poppins font-bold">API Keys</h2>
            <div className="flex gap-3">
              {!hasEverHadTrial && apiKeys.length === 0 ? (
                <ClaimTrialDialog onTrialClaimed={fetchApiKeys} />
              ) : (
                <PaymentDialog onPaymentInitiated={fetchApiKeys} />
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Gift className="h-16 w-16 text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-poppins font-bold mb-4">Welcome to ZETECH MD BOT!</h3>
                <p className="text-muted-foreground mb-6 text-lg">
                  Get started with your free 7-day trial and experience the power of our AI bot.
                </p>
                <ClaimTrialDialog onTrialClaimed={fetchApiKeys} />
                <p className="text-sm text-muted-foreground mt-4">
                  No payment required • Full access • Cancel anytime
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onDelete={handleDeleteClick}
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

        {/* Delete Confirmation Dialog */}
        <DeleteApiKeyDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          apiKey={keyToDelete}
          onConfirmDelete={handleDeleteApiKey}
        />
      </div>
    </div>
  );
}