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
  Package, 
  DollarSign, 
  Star,
  Eye,
  EyeOff,
  Save,
  X
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
    
    // Set up real-time subscription for packages
    const channel = supabase
      .channel('packages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        () => {
          fetchPackages(); // Refresh packages when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleCreatePackage = async (packageData: any) => {
    try {
      const { data, error } = await supabase.rpc('admin_create_package', {
        p_name: packageData.name,
        p_description: packageData.description,
        p_price_ksh: packageData.price_ksh,
        p_original_price_ksh: packageData.original_price_ksh,
        p_duration: packageData.duration,
        p_duration_days: 30, // Default value
        p_features: packageData.features,
        p_is_featured: packageData.is_featured,
        p_sort_order: packageData.sort_order
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Package created successfully",
        });
        setIsCreateDialogOpen(false);
        fetchPackages();
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

  const handleUpdatePackage = async (packageData: any) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_package', {
        p_package_id: editingPackage?.id,
        p_name: packageData.name,
        p_description: packageData.description,
        p_price_ksh: packageData.price_ksh,
        p_original_price_ksh: packageData.original_price_ksh,
        p_duration: packageData.duration,
        p_features: packageData.features,
        p_is_featured: packageData.is_featured,
        p_sort_order: packageData.sort_order
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Package updated successfully",
        });
        setIsEditDialogOpen(false);
        setEditingPackage(null);
        fetchPackages();
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

  const handleDeletePackage = async (packageId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_delete_package', {
        p_package_id: packageId
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Package deleted successfully",
        });
        fetchPackages();
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

  const openEditDialog = (pkg: Package) => {
    setEditingPackage(pkg);
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
          <h2 className="text-2xl font-bold">Package Management</h2>
          <p className="text-muted-foreground">Manage API key packages and pricing</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Create a new API key package with pricing and features.
              </DialogDescription>
            </DialogHeader>
            <PackageForm onSubmit={handleCreatePackage} />
          </DialogContent>
        </Dialog>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(pkg)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePackage(pkg.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
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

      {/* Edit Package Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update the package details and pricing.
            </DialogDescription>
          </DialogHeader>
          {editingPackage && (
            <PackageForm 
              onSubmit={handleUpdatePackage} 
              initialData={editingPackage}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Package Form Component
function PackageForm({ onSubmit, initialData }: { 
  onSubmit: (data: any) => void; 
  initialData?: Package;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price_ksh: initialData?.price_ksh || 0,
    original_price_ksh: initialData?.original_price_ksh || 0,
    duration: initialData?.duration || '30_days',
    features: initialData?.features || [],
    is_featured: initialData?.is_featured || false,
    sort_order: initialData?.sort_order || 0
  });

  const [featuresText, setFeaturesText] = useState(
    Array.isArray(formData.features) ? formData.features.join('\n') : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    onSubmit({
      ...formData,
      features
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Package Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Select
            value={formData.duration}
            onValueChange={(value) => setFormData({ ...formData, duration: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_week">1 Week</SelectItem>
              <SelectItem value="30_days">30 Days</SelectItem>
              <SelectItem value="60_days">60 Days</SelectItem>
              <SelectItem value="forever">Forever</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          <Label htmlFor="price_ksh">Price (KES)</Label>
          <Input
            id="price_ksh"
            type="number"
            value={formData.price_ksh}
            onChange={(e) => setFormData({ ...formData, price_ksh: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="original_price_ksh">Original Price (KES)</Label>
          <Input
            id="original_price_ksh"
            type="number"
            value={formData.original_price_ksh}
            onChange={(e) => setFormData({ ...formData, original_price_ksh: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          placeholder="Enter features, one per line"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
            <Label htmlFor="is_featured">Featured Package</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_popular"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
            <Label htmlFor="is_popular">Popular Package</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {initialData ? 'Update Package' : 'Create Package'}
        </Button>
      </div>
    </form>
  );
}