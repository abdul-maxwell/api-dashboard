import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  Star,
  Eye,
  EyeOff
} from "lucide-react";

interface Package {
  id: string;
  name: string;
  description: string;
  duration: string;
  price_ksh: number;
  original_price_ksh: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  features: any;
  created_at: string;
  updated_at: string;
}

export default function PackageManagement() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_packages');
      
      if (error) throw error;
      
      const result = data as any;
      if (result.success) {
        setPackages(result.packages);
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
          <h2 className="text-2xl font-bold">Package Management</h2>
          <p className="text-muted-foreground">Manage API key packages and pricing</p>
        </div>
      </div>

      <div className="grid gap-6">
        {packages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No packages found.</p>
            </CardContent>
          </Card>
        ) : (
          packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {pkg.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      {pkg.is_featured && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {pkg.is_active ? (
                        <Badge variant="default">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatPrice(pkg.price_ksh)}</span>
                      {pkg.original_price_ksh > pkg.price_ksh && (
                        <>
                          <span className="text-muted-foreground line-through">
                            {formatPrice(pkg.original_price_ksh)}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {Math.round(((pkg.original_price_ksh - pkg.price_ksh) / pkg.original_price_ksh) * 100)}% OFF
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Features:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {pkg.features.map((feature: string, index: number) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
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