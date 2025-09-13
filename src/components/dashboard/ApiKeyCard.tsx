import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, Trash2, TestTube } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onDelete: (apiKey: ApiKey) => void;
}

export default function ApiKeyCard({ apiKey, onDelete }: ApiKeyCardProps) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy API key to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = () => {
    if (!apiKey.is_active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    
    if (apiKey.expires_at) {
      const isExpired = new Date(apiKey.expires_at) < new Date();
      if (isExpired) {
        return <Badge variant="destructive">Expired</Badge>;
      }
    }
    
    return <Badge variant="secondary">Active</Badge>;
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case "1_week":
        return "1 Week";
      case "30_days":
        return "30 Days";
      case "60_days":
        return "60 Days";
      case "forever":
        return "Forever";
      default:
        return duration;
    }
  };

  const testApiKey = async () => {
    setTesting(true);
    try {
      const response = await fetch('https://gqvqvsbpszgbottgtcrf.supabase.co/functions/v1/verify-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey.key_value
        })
      });

      const result = await response.json();
      
      if (response.ok && result.valid) {
        toast({
          title: "API Key Valid",
          description: `Key verified successfully for user: ${result.user_id}`,
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: result.error || "API key verification failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not connect to verification endpoint",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{apiKey.name}</CardTitle>
            <CardDescription>
              Created {formatDate(apiKey.created_at)} • Duration: {getDurationLabel(apiKey.duration)}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Key</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
                className="h-8 w-8 p-0"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(apiKey.key_value)}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="font-mono text-sm bg-muted p-2 rounded border">
            {showKey ? apiKey.key_value : `${"•".repeat(32)}...${apiKey.key_value.slice(-4)}`}
          </div>
        </div>

        {apiKey.expires_at && (
          <div className="text-sm text-muted-foreground">
            Expires: {formatDate(apiKey.expires_at)}
          </div>
        )}

        {apiKey.last_used_at && (
          <div className="text-sm text-muted-foreground">
            Last used: {formatDate(apiKey.last_used_at)}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testApiKey}
            disabled={testing || !apiKey.is_active}
            className="gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? "Testing..." : "Test Key"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(apiKey)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}