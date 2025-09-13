import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface DeleteApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey | null;
  onConfirmDelete: (id: string) => void;
}

export default function DeleteApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  onConfirmDelete,
}: DeleteApiKeyDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!apiKey || confirmationText !== apiKey.name) {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirmDelete(apiKey.id);
      setConfirmationText("");
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmationText("");
    onOpenChange(false);
  };

  const isConfirmationValid = apiKey && confirmationText === apiKey.name;

  if (!apiKey) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete API Key
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the API key and remove all access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this API key will immediately revoke access to your bot.
              {apiKey.is_trial && (
                <span className="block mt-1 text-sm">
                  <strong>Note:</strong> This is a trial key. Once deleted, you will not be able to claim another free trial.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="api-key-name">API Key Details</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{apiKey.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(apiKey.created_at).toLocaleDateString()}
              </div>
              {apiKey.expires_at && (
                <div className="text-sm text-muted-foreground">
                  Expires: {new Date(apiKey.expires_at).toLocaleDateString()}
                </div>
              )}
              {apiKey.is_trial && (
                <div className="text-sm text-warning font-medium">
                  Free Trial Key
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <strong>"{apiKey.name}"</strong> to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${apiKey.name}" here`}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="gap-2"
          >
            {isDeleting ? "Deleting..." : "Delete API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
