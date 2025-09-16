import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  DollarSign,
  Calendar,
  User,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  transaction_id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  type: string;
  status: string;
  amount: number | null;
  currency: string;
  description: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  provider_transaction_id: string | null;
  error_message: string | null;
  success_message: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  expires_at: string | null;
}

interface TransactionManagementProps {
  onTransactionUpdated?: () => void;
}

export default function TransactionManagement({ onTransactionUpdated }: TransactionManagementProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    error_message: '',
    success_message: '',
    provider_transaction_id: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
    limit: 50,
    offset: 0
  });

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    if (isFetching) return;
    
    setIsFetching(true);
    setLoading(true);
    try {
      console.log('Fetching transactions with filters:', filters);
      
      const { data, error } = await supabase.rpc('admin_get_all_transactions', {
        p_limit: filters.limit,
        p_offset: filters.offset,
        p_status: filters.status === 'all' ? null : filters.status,
        p_type: filters.type === 'all' ? null : filters.type,
        p_user_id: null
      });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      const result = data as any;
      console.log('Transactions result:', result);

      if (result.success) {
        setTransactions(result.transactions || []);
        setTotalCount(result.total_count || 0);
      } else {
        throw new Error(result.message || 'Failed to fetch transactions');
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: `Failed to load transactions: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      const { data, error } = await supabase.rpc('update_transaction_status', {
        p_transaction_id: selectedTransaction.transaction_id,
        p_status: updateForm.status,
        p_error_message: updateForm.error_message || null,
        p_success_message: updateForm.success_message || null,
        // p_provider_transaction_id removed as it doesn't exist in the function
      });

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      const result = data as any;
      if (result.success) {
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
        setIsUpdateDialogOpen(false);
        setSelectedTransaction(null);
        fetchTransactions();
        onTransactionUpdated?.();
      } else {
        throw new Error(result.message || 'Failed to update transaction');
      }
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: `Failed to update transaction: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'attempted':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'attempted':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number | null, currency: string) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        transaction.transaction_id.toLowerCase().includes(searchLower) ||
        transaction.user_email.toLowerCase().includes(searchLower) ||
        transaction.user_username.toLowerCase().includes(searchLower) ||
        (transaction.description && transaction.description.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transaction Management
            </CardTitle>
            <CardDescription>
              Monitor and manage all user transactions
            </CardDescription>
          </div>
          <Button
            onClick={fetchTransactions}
            disabled={isFetching}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="attempted">Attempted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="api_usage">API Usage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(
                      transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                      'USD'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-lg font-semibold">
                    {transactions.filter(t => t.status === 'success').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-lg font-semibold">
                    {transactions.filter(t => t.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold">
                    {transactions.filter(t => t.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.transaction_id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.user_username}</p>
                        <p className="text-sm text-muted-foreground">{transaction.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatAmount(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transaction.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setUpdateForm({
                              status: transaction.status,
                              error_message: transaction.error_message || '',
                              success_message: transaction.success_message || '',
                              provider_transaction_id: transaction.provider_transaction_id || ''
                            });
                            setIsUpdateDialogOpen(true);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Transaction Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                Complete information about this transaction
              </DialogDescription>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedTransaction.transaction_id}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedTransaction.status)}
                      <Badge className={getStatusColor(selectedTransaction.status)}>
                        {selectedTransaction.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>User</Label>
                    <p>{selectedTransaction.user_username} ({selectedTransaction.user_email})</p>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <p>{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p>{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <p>{selectedTransaction.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p>{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div>
                    <Label>Processed</Label>
                    <p>{selectedTransaction.processed_at ? formatDate(selectedTransaction.processed_at) : 'N/A'}</p>
                  </div>
                </div>
                {selectedTransaction.description && (
                  <div>
                    <Label>Description</Label>
                    <p>{selectedTransaction.description}</p>
                  </div>
                )}
                {selectedTransaction.error_message && (
                  <div>
                    <Label>Error Message</Label>
                    <p className="text-red-600">{selectedTransaction.error_message}</p>
                  </div>
                )}
                {selectedTransaction.success_message && (
                  <div>
                    <Label>Success Message</Label>
                    <p className="text-green-600">{selectedTransaction.success_message}</p>
                  </div>
                )}
                {selectedTransaction.metadata && (
                  <div>
                    <Label>Metadata</Label>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Transaction Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Transaction</DialogTitle>
              <DialogDescription>
                Update the status and details of this transaction
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(value) => setUpdateForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attempted">Attempted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="provider_transaction_id">Provider Transaction ID</Label>
                <Input
                  id="provider_transaction_id"
                  value={updateForm.provider_transaction_id}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, provider_transaction_id: e.target.value }))}
                  placeholder="External transaction ID"
                />
              </div>
              <div>
                <Label htmlFor="success_message">Success Message</Label>
                <Textarea
                  id="success_message"
                  value={updateForm.success_message}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, success_message: e.target.value }))}
                  placeholder="Success details"
                />
              </div>
              <div>
                <Label htmlFor="error_message">Error Message</Label>
                <Textarea
                  id="error_message"
                  value={updateForm.error_message}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, error_message: e.target.value }))}
                  placeholder="Error details"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateTransaction}>
                  Update Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
