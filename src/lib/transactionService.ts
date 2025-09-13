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
        p_type: params.type,
        p_status: params.status,
        p_amount: params.amount || null,
        p_currency: params.currency || 'USD',
        p_description: params.description || null,
        p_payment_method: params.paymentMethod || null,
        p_payment_provider: params.paymentProvider || null,
        p_provider_transaction_id: params.providerTransactionId || null,
        p_error_message: params.errorMessage || null,
        p_success_message: params.successMessage || null,
        p_metadata: params.metadata || null,
        p_expires_at: params.expiresAt || null
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
        p_provider_transaction_id: params.providerTransactionId || null,
        p_metadata: params.metadata || null
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
}
