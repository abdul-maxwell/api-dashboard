import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Percent, 
  DollarSign, 
  Calendar, 
  Users,
  Save,
  X,
  Copy,
  Eye,
  EyeOff,
  Tag
} from "lucide-react";

interface Discount {
  id: string;
  name: string;
  description: string;
  promo_code: string;
  discount_type: string;
  discount_value: number;
  min_amount: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  applicable_packages: any;
  created_at: string;
  updated_at: string;
}

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscounts();
    
    // Set up real-time subscription for discounts
    const channel = supabase
      .channel('discounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discounts'
        },
        () => {
          fetchDiscounts(); // Refresh discounts when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_discounts');
      
      if (error) throw error;
      
      const result = data as any;
      if (result.success) {
        setDiscounts(result.discounts);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(price);
  };

  const handleCreateDiscount = async (discountData: any) => {
    try {
      const { data, error } = await supabase.rpc('admin_create_discount', {
        p_promo_code: discountData.promo_code,
        p_name: discountData.name,
        p_description: discountData.description,
        p_discount_type: discountData.discount_type,
        p_discount_value: discountData.discount_value,
        p_max_uses: discountData.max_uses,
        p_expires_at: discountData.expires_at,
        p_is_active: discountData.is_active
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Discount created successfully",
        });
        setIsCreateDialogOpen(false);
        fetchDiscounts();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateDiscount = async (discountData: any) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_discount', {
        p_discount_id: editingDiscount?.id,
        p_promo_code: discountData.promo_code,
        p_name: discountData.name,
        p_description: discountData.description,
        p_discount_type: discountData.discount_type,
        p_discount_value: discountData.discount_value,
        p_max_uses: discountData.max_uses,
        p_expires_at: discountData.expires_at,
        p_is_active: discountData.is_active
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Discount updated successfully",
        });
        setIsEditDialogOpen(false);
        setEditingDiscount(null);
        fetchDiscounts();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_delete_discount', {
        p_discount_id: discountId
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Discount deleted successfully",
        });
        fetchDiscounts();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discount Management</h2>
          <p className="text-muted-foreground">Create and manage discount codes and promotions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discount</DialogTitle>
              <DialogDescription>
                Create a new discount code or promotion.
              </DialogDescription>
            </DialogHeader>
            <DiscountForm onSubmit={handleCreateDiscount} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {discounts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No discounts found.</p>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => (
            <Card key={discount.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      {discount.discount_type === 'percentage' ? (
                        <Percent className="h-5 w-5" />
                      ) : (
                        <DollarSign className="h-5 w-5" />
                      )}
                      {discount.name}
                    </CardTitle>
                    {discount.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(discount)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDiscount(discount.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                <CardDescription>{discount.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4" />
                      <span className="font-mono font-semibold">{discount.promo_code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(discount.valid_from).toLocaleDateString()} - 
                        {discount.valid_until ? new Date(discount.valid_until).toLocaleDateString() : 'No expiry'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>
                        {discount.used_count}/{discount.usage_limit || '∞'} uses
                      </span>
                    </div>
                  </div>
                </div>

                {discount.min_amount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Min. order: {formatPrice(discount.min_amount)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Discount Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Discount</DialogTitle>
            <DialogDescription>
              Update the discount details and settings.
            </DialogDescription>
          </DialogHeader>
          {editingDiscount && (
            <DiscountForm 
              onSubmit={handleUpdateDiscount} 
              initialData={editingDiscount}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Discount Form Component
function DiscountForm({ onSubmit, initialData }: { 
  onSubmit: (data: any) => void; 
  initialData?: Discount;
}) {
  const [formData, setFormData] = useState({
    promo_code: initialData?.promo_code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    discount_type: initialData?.discount_type || 'percentage',
    discount_value: initialData?.discount_value || 0,
    max_uses: initialData?.max_uses || null,
    expires_at: initialData?.expires_at || null,
    is_active: initialData?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="promo_code">Promo Code</Label>
          <Input
            id="promo_code"
            value={formData.promo_code}
            onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
            required
            placeholder="e.g., SAVE20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount_type">Discount Type</Label>
          <Select
            value={formData.discount_type}
            onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Discount Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount_value">
            {formData.discount_type === 'percentage' ? 'Discount Percentage' : 'Discount Amount (KES)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
            required
            min="0"
            max={formData.discount_type === 'percentage' ? 100 : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_uses">Max Uses (optional)</Label>
          <Input
            id="max_uses"
            type="number"
            value={formData.max_uses || ''}
            onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
            min="1"
            placeholder="Leave empty for unlimited"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires_at">Expiry Date (optional)</Label>
        <Input
          id="expires_at"
          type="datetime-local"
          value={formData.expires_at ? new Date(formData.expires_at).toISOString().slice(0, 16) : ''}
          onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {initialData ? 'Update Discount' : 'Create Discount'}
        </Button>
      </div>
    </form>
  );
}