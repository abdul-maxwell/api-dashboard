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
import { AlertTriangle, User, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  user_id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  api_keys: any[];
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirmDelete: (userId: string) => void;
}

export default function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirmDelete,
}: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      await onConfirmDelete(user.user_id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!user) return null;

  const apiKeysCount = user.api_keys?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user and all their data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this user will permanently remove all their data including API keys, payments, and profile information.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details</span>
            </div>
            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="font-medium">{user.email}</div>
              <div className="text-sm text-muted-foreground">
                Username: {user.username}
              </div>
              <div className="text-sm text-muted-foreground">
                Role: {user.role}
              </div>
              <div className="text-sm text-muted-foreground">
                Joined: {new Date(user.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">
                API Keys: {apiKeysCount}
              </div>
            </div>
          </div>

          {apiKeysCount > 0 && (
            <Alert>
              <Trash2 className="h-4 w-4" />
              <AlertDescription>
                This user has {apiKeysCount} API key{apiKeysCount > 1 ? 's' : ''} that will also be deleted.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            No, Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}