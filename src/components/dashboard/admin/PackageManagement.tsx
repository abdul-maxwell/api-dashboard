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
  Calendar, 
  Star,
  Save,
  X,
  Eye,
  EyeOff
} from "lucide-react";

interface Package {
  id: string;
  name: string;
  description: string;
  duration: string;
  duration_days: number;
  price_ksh: number;
  original_price_ksh: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

interface PackageFormData {
  name: string;
  description: string;
  duration: string;
  duration_days: number;
  price_ksh: number;
  original_price_ksh: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  features: string[];
}

const durationOptions = [
  { value: '1_week', label: '1 Week', days: 7 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: '1_year', label: '1 Year', days: 365 },
  { value: '2_years', label: '2 Years', days: 730 },
];

export default function PackageManagement() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    duration: '',
    duration_days: 30,
    price_ksh: 0,
    original_price_ksh: 0,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    features: []
  });

  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const packageData = {
        ...formData,
        original_price_ksh: formData.original_price_ksh || formData.price_ksh
      };

      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package updated successfully!",
        });
      } else {
        // Create new package
        const { error } = await supabase
          .from('packages')
          .insert(packageData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package created successfully!",
        });
      }

      setIsDialogOpen(false);
      setEditingPackage(null);
      resetForm();
      fetchPackages();
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

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      duration: pkg.duration,
      duration_days: pkg.duration_days,
      price_ksh: pkg.price_ksh,
      original_price_ksh: pkg.original_price_ksh,
      is_active: pkg.is_active,
      is_featured: pkg.is_featured,
      sort_order: pkg.sort_order,
      features: pkg.features
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Package deleted successfully!",
      });

      fetchPackages();
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
      duration: '',
      duration_days: 30,
      price_ksh: 0,
      original_price_ksh: 0,
      is_active: true,
      is_featured: false,
      sort_order: 0,
      features: []
    });
    setNewFeature('');
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleDurationChange = (duration: string) => {
    const option = durationOptions.find(opt => opt.value === duration);
    setFormData(prev => ({
      ...prev,
      duration,
      duration_days: option?.days || 30
    }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(price);
  };

  const getDiscountPercentage = (original: number, current: number) => {
    if (original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Package Management</h2>
          <p className="text-muted-foreground">Manage API packages, pricing, and features</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPackage(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Package' : 'Create New Package'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage ? 'Update package details' : 'Create a new API package'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Package Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Professional"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Package description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={handleDurationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (Days)</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_ksh">Current Price (KES)</Label>
                  <Input
                    id="price_ksh"
                    type="number"
                    step="0.01"
                    value={formData.price_ksh}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_ksh: parseFloat(e.target.value) || 0 }))}
                    placeholder="1000.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="original_price_ksh">Original Price (KES)</Label>
                  <Input
                    id="original_price_ksh"
                    type="number"
                    step="0.01"
                    value={formData.original_price_ksh}
                    onChange={(e) => setFormData(prev => ({ ...prev, original_price_ksh: parseFloat(e.target.value) || 0 }))}
                    placeholder="1200.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add feature..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
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
                      {editingPackage ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={`${!pkg.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {pkg.is_featured && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {!pkg.is_active && (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{pkg.duration.replace('_', ' ')} ({pkg.duration_days} days)</span>
                </div>
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
                          -{getDiscountPercentage(pkg.original_price_ksh, pkg.price_ksh)}%
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {pkg.features.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {pkg.features.slice(0, 3).map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                    {pkg.features.length > 3 && (
                      <li>• +{pkg.features.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(pkg)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(pkg.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No packages found</h3>
          <p className="text-muted-foreground mb-4">Create your first package to get started.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>
      )}
    </div>
  );
}
