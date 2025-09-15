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
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_amount: number;
  max_discount: number;
  usage_limit: number;
  usage_count: number;
  user_limit: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  applicable_packages: string[];
  created_at: string;
  updated_at: string;
}

interface DiscountFormData {
  name: string;
  description: string;
  promo_code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_amount: number;
  max_discount: number;
  usage_limit: number;
  user_limit: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  applicable_packages: string[];
}

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<DiscountFormData>({
    name: '',
    description: '',
    promo_code: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_amount: 0,
    max_discount: 0,
    usage_limit: 0,
    user_limit: 1,
    is_active: true,
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: '',
    applicable_packages: []
  });

  useEffect(() => {
    fetchDiscounts();
    fetchPackages();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data || []);
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

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
    }
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, promo_code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const discountData = {
        ...formData,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
      };

      if (editingDiscount) {
        // Update existing discount
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Discount updated successfully!",
        });
      } else {
        // Create new discount
        const { error } = await supabase
          .from('discounts')
          .insert(discountData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Discount created successfully!",
        });
      }

      setIsDialogOpen(false);
      setEditingDiscount(null);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description,
      promo_code: discount.promo_code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_amount: discount.min_amount,
      max_discount: discount.max_discount,
      usage_limit: discount.usage_limit,
      user_limit: discount.user_limit,
      is_active: discount.is_active,
      valid_from: new Date(discount.valid_from).toISOString().slice(0, 16),
      valid_until: discount.valid_until ? new Date(discount.valid_until).toISOString().slice(0, 16) : '',
      applicable_packages: discount.applicable_packages
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount deleted successfully!",
      });

      fetchDiscounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      promo_code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_amount: 0,
      max_discount: 0,
      usage_limit: 0,
      user_limit: 1,
      is_active: true,
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: '',
      applicable_packages: []
    });
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Promo code copied to clipboard",
    });
  };

  const isExpired = (validUntil: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isActive = (discount: Discount) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from);
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;
    
    return discount.is_active && 
           validFrom <= now && 
           (!validUntil || validUntil > now) &&
           (discount.usage_limit === 0 || discount.usage_count < discount.usage_limit);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading discounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discount Management</h2>
          <p className="text-muted-foreground">Manage promo codes and discounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingDiscount(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
              </DialogTitle>
              <DialogDescription>
                {editingDiscount ? 'Update discount details' : 'Create a new discount or promo code'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Discount Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Discount"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo_code">Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promo_code"
                      value={formData.promo_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                      placeholder="WELCOME20"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generatePromoCode}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Discount description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(value: 'percentage' | 'fixed_amount') => setFormData(prev => ({ ...prev, discount_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    {formData.discount_type === 'percentage' ? 'Discount Percentage' : 'Discount Amount (KES)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '100'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">Minimum Amount (KES)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    step="0.01"
                    value={formData.min_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                {formData.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="max_discount">Max Discount (KES)</Label>
                    <Input
                      id="max_discount"
                      type="number"
                      step="0.01"
                      value={formData.max_discount}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_discount: parseFloat(e.target.value) || 0 }))}
                      placeholder="1000"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usage_limit">Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: parseInt(e.target.value) || 0 }))}
                    placeholder="0 (unlimited)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_limit">Per User Limit</Label>
                  <Input
                    id="user_limit"
                    type="number"
                    value={formData.user_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_limit: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Valid From</Label>
                  <Input
                    id="valid_from"
                    type="datetime-local"
                    value={formData.valid_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="datetime-local"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Applicable Packages</Label>
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`package-${pkg.id}`}
                        checked={formData.applicable_packages.includes(pkg.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              applicable_packages: [...prev.applicable_packages, pkg.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              applicable_packages: prev.applicable_packages.filter(id => id !== pkg.id)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`package-${pkg.id}`} className="text-sm">
                        {pkg.name}
                      </Label>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Leave empty to apply to all packages
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingDiscount ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {discounts.map((discount) => (
          <Card key={discount.id} className={`${!discount.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  <CardTitle className="text-lg">{discount.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {isActive(discount) && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                  {isExpired(discount.valid_until) && (
                    <Badge variant="destructive" className="text-xs">
                      Expired
                    </Badge>
                  )}
                  {!discount.is_active && (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>{discount.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Promo Code:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {discount.promo_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPromoCode(discount.promo_code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {discount.discount_type === 'percentage' ? (
                    <Percent className="h-4 w-4" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                  <span>
                    {discount.discount_type === 'percentage' 
                      ? `${discount.discount_value}% off`
                      : `${formatPrice(discount.discount_value)} off`
                    }
                  </span>
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
                    {discount.usage_count}/{discount.usage_limit || '∞'} uses
                  </span>
                </div>
              </div>

              {discount.min_amount > 0 && (
                <div className="text-xs text-muted-foreground">
                  Min. order: {formatPrice(discount.min_amount)}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(discount)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(discount.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {discounts.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No discounts found</h3>
          <p className="text-muted-foreground mb-4">Create your first discount or promo code.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Discount
          </Button>
        </div>
      )}
    </div>
  );
}

