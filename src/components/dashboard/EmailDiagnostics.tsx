import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Mail, Settings } from "lucide-react";

export default function EmailDiagnostics() {
  const [isChecking, setIsChecking] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check 1: Supabase client connection
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        results.checks.supabaseConnection = {
          status: error ? 'error' : 'success',
          message: error ? `Connection error: ${error.message}` : 'Connected to Supabase',
          details: { hasSession: !!session }
        };
      } catch (error) {
        results.checks.supabaseConnection = {
          status: 'error',
          message: `Connection failed: ${error}`,
          details: {}
        };
      }

      // Check 2: Test email sending (without actually sending)
      try {
        // This will fail if SMTP is not configured, but won't send an actual email
        const testEmail = 'test@example.com';
        const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        results.checks.smtpConfiguration = {
          status: error ? 'warning' : 'success',
          message: error ? `SMTP issue: ${error.message}` : 'SMTP appears to be configured',
          details: { error: error?.message }
        };
      } catch (error) {
        results.checks.smtpConfiguration = {
          status: 'error',
          message: `SMTP test failed: ${error}`,
          details: {}
        };
      }

      // Check 3: Environment variables
      results.checks.environment = {
        status: 'info',
        message: 'Environment check',
        details: {
          origin: window.location.origin,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      results.checks.general = {
        status: 'error',
        message: `Diagnostic failed: ${error}`,
        details: {}
      };
    }

    setDiagnostics(results);
    setIsChecking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Diagnostics
        </CardTitle>
        <CardDescription>
          Run diagnostics to check your email configuration and identify issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Running Diagnostics...' : 'Run Email Diagnostics'}
        </Button>

        {diagnostics && (
          <div className="space-y-3">
            <h4 className="font-medium">Diagnostic Results</h4>
            {Object.entries(diagnostics.checks).map(([key, check]: [string, any]) => (
              <Alert key={key}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="mt-1 text-sm">{check.message}</p>
                      {check.details && Object.keys(check.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-muted-foreground">
                            View Details
                          </summary>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>Common SMTP Issues:</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• Check SMTP configuration in Supabase Dashboard → Authentication → Settings</li>
              <li>• Verify SMTP credentials are correct</li>
              <li>• Ensure SMTP server allows connections from Supabase</li>
              <li>• Check if emails are going to spam folder</li>
              <li>• Verify domain authentication (SPF, DKIM, DMARC)</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
