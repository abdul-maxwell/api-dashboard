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
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscounts();
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
    </div>
  );
}