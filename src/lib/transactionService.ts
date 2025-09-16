import { supabase } from "@/integrations/supabase/client";

export interface CreateTransactionParams {
  userId: string;
  transactionId: string;
  type: 'payment' | 'refund' | 'subscription' | 'trial' | 'api_usage';
  status: 'attempted' | 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  amount?: number;
  currency?: string;
  description?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  providerTransactionId?: string;
  errorMessage?: string;
  successMessage?: string;
  metadata?: any;
  expiresAt?: string;
}

export interface UpdateTransactionParams {
  transactionId: string;
  status: 'attempted' | 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  errorMessage?: string;
  successMessage?: string;
  providerTransactionId?: string;
  metadata?: any;
}

export class TransactionService {
  /**
   * Create a new transaction record
   */
  static async createTransaction(params: CreateTransactionParams) {
    try {
      console.log('Creating transaction:', params);
      
      const { data, error } = await supabase.rpc('create_transaction', {
        p_user_id: params.userId,
        p_transaction_id: params.transactionId,
        p_amount: params.amount || null,
        p_currency: params.currency || 'KES',
        p_description: params.description || null,
        p_payment_method: params.paymentMethod || null,
        // p_checkout_request_id removed as checkoutId doesn't exist in interface
      });

      if (error) {
        console.error('Error creating transaction:', error);
        // Don't throw error, just log it - transaction tracking is optional
        console.warn('Transaction tracking failed, continuing without it');
        return { success: false, message: 'Transaction tracking unavailable' };
      }

      const result = data as any;
      if (result.success) {
        console.log('Transaction created successfully:', result);
        return result;
      } else {
        throw new Error(result.message || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('TransactionService.createTransaction error:', error);
      // Don't throw error, just log it - transaction tracking is optional
      console.warn('Transaction tracking failed, continuing without it');
      return { success: false, message: 'Transaction tracking unavailable' };
    }
  }

  /**
   * Update an existing transaction
   */
  static async updateTransaction(params: UpdateTransactionParams) {
    try {
      console.log('Updating transaction:', params);
      
      const { data, error } = await supabase.rpc('update_transaction_status', {
        p_transaction_id: params.transactionId,
        p_status: params.status,
        p_error_message: params.errorMessage || null,
        p_success_message: params.successMessage || null,
        // p_provider_transaction_id removed as it doesn't exist in the function
        // p_metadata removed as it doesn't exist in the function
      });

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      const result = data as any;
      if (result.success) {
        console.log('Transaction updated successfully:', result);
        return result;
      } else {
        throw new Error(result.message || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('TransactionService.updateTransaction error:', error);
      throw error;
    }
  }

  /**
   * Track a payment attempt
   */
  static async trackPaymentAttempt(
    userId: string,
    transactionId: string,
    amount: number,
    currency: string = 'USD',
    paymentMethod: string = 'mpesa',
    description?: string
  ) {
    return this.createTransaction({
      userId,
      transactionId,
      type: 'payment',
      status: 'attempted',
      amount,
      currency,
      description: description || `Payment attempt for ${currency} ${amount}`,
      paymentMethod,
      paymentProvider: 'safaricom',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    });
  }

  /**
   * Track a successful payment
   */
  static async trackPaymentSuccess(
    transactionId: string,
    providerTransactionId: string,
    successMessage?: string
  ) {
    return this.updateTransaction({
      transactionId,
      status: 'success',
      providerTransactionId,
      successMessage: successMessage || 'Payment completed successfully'
    });
  }

  /**
   * Track a failed payment
   */
  static async trackPaymentFailure(
    transactionId: string,
    errorMessage: string,
    providerTransactionId?: string
  ) {
    return this.updateTransaction({
      transactionId,
      status: 'failed',
      errorMessage,
      providerTransactionId
    });
  }

  /**
   * Track a cancelled payment
   */
  static async trackPaymentCancellation(
    transactionId: string,
    reason: string = 'User cancelled payment'
  ) {
    return this.updateTransaction({
      transactionId,
      status: 'cancelled',
      errorMessage: reason
    });
  }

  /**
   * Track a trial claim
   */
  static async trackTrialClaim(
    userId: string,
    transactionId: string,
    description?: string
  ) {
    return this.createTransaction({
      userId,
      transactionId,
      type: 'trial',
      status: 'success',
      description: description || 'Trial API key claimed',
      paymentMethod: 'trial',
      successMessage: 'Trial API key successfully claimed'
    });
  }

  /**
   * Track API key creation
   */
  static async trackApiKeyCreation(
    userId: string,
    transactionId: string,
    keyType: 'trial' | 'paid',
    amount?: number,
    description?: string
  ) {
    return this.createTransaction({
      userId,
      transactionId,
      type: keyType === 'trial' ? 'trial' : 'payment',
      status: 'success',
      amount: keyType === 'paid' ? amount : 0,
      description: description || `${keyType} API key created`,
      paymentMethod: keyType === 'trial' ? 'trial' : 'paid',
      successMessage: `${keyType} API key created successfully`
    });
  }

  /**
   * Track subscription events
   */
  static async trackSubscription(
    userId: string,
    transactionId: string,
    status: 'attempted' | 'pending' | 'processing' | 'success' | 'failed' | 'cancelled',
    amount?: number,
    description?: string,
    errorMessage?: string,
    successMessage?: string
  ) {
    return this.createTransaction({
      userId,
      transactionId,
      type: 'subscription',
      status,
      amount,
      description: description || `Subscription ${status}`,
      paymentMethod: 'subscription',
      errorMessage,
      successMessage
    });
  }

  /**
   * Track refunds
   */
  static async trackRefund(
    userId: string,
    transactionId: string,
    amount: number,
    currency: string = 'USD',
    description?: string,
    originalTransactionId?: string
  ) {
    return this.createTransaction({
      userId,
      transactionId,
      type: 'refund',
      status: 'success',
      amount,
      currency,
      description: description || `Refund of ${currency} ${amount}`,
      paymentMethod: 'refund',
      successMessage: 'Refund processed successfully',
      metadata: originalTransactionId ? { originalTransactionId } : null
    });
  }

  /**
   * Get user's transactions
   */
  static async getUserTransactions(
    limit: number = 50,
    offset: number = 0,
    status?: string,
    type?: string
  ) {
    try {
      console.log('Getting user transactions:', { limit, offset, status, type });
      
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_limit: limit,
        p_offset: offset,
        p_status: status || null,
        p_type: type || null
      });

      if (error) {
        console.error('Error getting user transactions:', error);
        throw error;
      }

      const result = data as any;
      if (result.success) {
        console.log('User transactions retrieved successfully:', result);
        return result;
      } else {
        throw new Error(result.message || 'Failed to get user transactions');
      }
    } catch (error) {
      console.error('TransactionService.getUserTransactions error:', error);
      throw error;
    }
  }

  /**
   * Get transaction by checkout request ID
   */
  static async getTransactionByCheckoutId(checkoutRequestId: string) {
    try {
      console.log('Getting transaction by checkout ID:', checkoutRequestId);
      
      const { data, error } = await supabase.rpc('get_transaction_by_checkout_id', {
        p_checkout_request_id: checkoutRequestId
      });

      if (error) {
        console.error('Error getting transaction by checkout ID:', error);
        throw error;
      }

      const result = data as any;
      if (result.success) {
        console.log('Transaction retrieved successfully:', result);
        return result;
      } else {
        throw new Error(result.message || 'Failed to get transaction');
      }
    } catch (error) {
      console.error('TransactionService.getTransactionByCheckoutId error:', error);
      throw error;
    }
  }

  /**
   * Query transaction status from M-Pesa
   */
  static async queryTransactionStatus(checkoutRequestId: string) {
    try {
      console.log('Querying transaction status:', checkoutRequestId);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-transaction-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          checkout_request_id: checkoutRequestId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Transaction status query result:', result);
      return result;
    } catch (error) {
      console.error('TransactionService.queryTransactionStatus error:', error);
      throw error;
    }
  }

  // Package Management
  static async getPackages(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
  }

  // Discount Management
  static async validatePromoCode(promoCode: string, packageId: string, userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('promo_code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { valid: false, message: 'Invalid promo code' };
      }

      // Check if discount is still valid
      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (validFrom > now || (validUntil && validUntil < now)) {
        return { valid: false, message: 'Promo code has expired' };
      }

      // Check usage limits
      if (data.usage_limit > 0 && (data as any).used_count >= data.usage_limit) {
        return { valid: false, message: 'Promo code usage limit reached' };
      }

      // Check if applicable to this package
      if (Array.isArray(data.applicable_packages) && data.applicable_packages.length > 0 && !data.applicable_packages.includes(packageId)) {
        return { valid: false, message: 'Promo code not applicable to this package' };
      }

      // Check user usage limit
      const { data: userUsage, error: usageError } = await supabase
        .from('user_discount_usage')
        .select('id')
        .eq('user_id', userId)
        .eq('discount_id', data.id);

      if (!usageError && userUsage && userUsage.length >= data.usage_limit) {
        return { valid: false, message: 'You have reached the usage limit for this promo code' };
      }

      return { valid: true, discount: data };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, message: 'Error validating promo code' };
    }
  }

  static async applyPromoCode(promoCode: string, packageId: string, userId: string, originalPrice: number): Promise<any> {
    try {
      const validation = await this.validatePromoCode(promoCode, packageId, userId);
      
      if (!validation.valid) {
        return validation;
      }

      const discount = validation.discount;
      let discountAmount = 0;
      let finalPrice = originalPrice;

      if (discount.discount_type === 'percentage') {
        discountAmount = (originalPrice * discount.discount_value) / 100;
        if (discount.max_discount > 0 && discountAmount > discount.max_discount) {
          discountAmount = discount.max_discount;
        }
      } else {
        discountAmount = discount.discount_value;
      }

      finalPrice = Math.max(0, originalPrice - discountAmount);

      return {
        valid: true,
        discount,
        discountAmount,
        finalPrice,
        originalPrice
      };
    } catch (error) {
      console.error('Error applying promo code:', error);
      return { valid: false, message: 'Error applying promo code' };
    }
  }
}
