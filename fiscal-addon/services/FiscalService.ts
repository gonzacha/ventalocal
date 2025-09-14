import { TaxAdapter, InvoiceDraft, IssuedInvoice, FiscalConfig } from '../types/fiscal';

export class FiscalService {
  private adapter: TaxAdapter;
  private config: FiscalConfig;
  private outboxQueue: Array<{
    id: string;
    draft: InvoiceDraft;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    attempts: number;
  }> = [];

  constructor(adapter: TaxAdapter, config: FiscalConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  async issueInvoice(draft: InvoiceDraft): Promise<IssuedInvoice> {
    // Verificar idempotencia
    const existing = this.findByOrderId(draft.order_id);
    if (existing) {
      console.log(`Invoice for order ${draft.order_id} already exists`);
      return existing;
    }

    // Validar draft
    this.validateDraft(draft);

    // Agregar al outbox pattern para reliability
    const queueItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      draft,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      attempts: 0
    };
    this.outboxQueue.push(queueItem);

    try {
      queueItem.status = 'processing';
      queueItem.attempts += 1;

      // Procesar facturación
      const result = await this.adapter.issueInvoice(draft);

      queueItem.status = 'completed';

      // Log para auditoría
      console.log(`Invoice issued successfully: ${result.invoice_id} for order ${draft.order_id}`);

      return result;
    } catch (error) {
      queueItem.status = 'failed';
      console.error(`Failed to issue invoice for order ${draft.order_id}:`, error.message);

      // Retry logic para casos específicos
      if (this.shouldRetry(error) && queueItem.attempts < 3) {
        console.log(`Scheduling retry for order ${draft.order_id}`);
        setTimeout(() => this.retryInvoice(queueItem.id), 5000);
      }

      throw new Error(`Failed to issue invoice: ${error.message}`);
    }
  }

  async cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
    console.log(`Attempting to cancel invoice ${invoiceId}. Reason: ${reason || 'No reason provided'}`);

    try {
      await this.adapter.cancelInvoice(invoiceId, reason);
      console.log(`Invoice ${invoiceId} cancelled successfully`);
    } catch (error) {
      console.error(`Failed to cancel invoice ${invoiceId}:`, error.message);
      throw new Error(`Failed to cancel invoice: ${error.message}`);
    }
  }

  async getPdf(invoiceId: string): Promise<Buffer> {
    try {
      return await this.adapter.getPdf(invoiceId);
    } catch (error) {
      console.error(`Failed to get PDF for invoice ${invoiceId}:`, error.message);
      throw new Error(`Failed to get PDF: ${error.message}`);
    }
  }

  async getHealth(): Promise<{ ok: boolean; latencyMs: number; adapter?: string; queue_size: number }> {
    try {
      const health = await this.adapter.health();
      return {
        ...health,
        queue_size: this.outboxQueue.filter(item => item.status === 'pending').length
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: -1,
        error: error.message,
        queue_size: this.outboxQueue.filter(item => item.status === 'pending').length
      };
    }
  }

  // Métodos privados
  private findByOrderId(orderId: string): IssuedInvoice | null {
    // En una implementación real, buscaría en base de datos
    // Por ahora retornamos null para permitir procesamiento
    return null;
  }

  private validateDraft(draft: InvoiceDraft): void {
    if (!draft.order_id) throw new Error('order_id is required');
    if (!draft.customer.name) throw new Error('customer name is required');
    if (!draft.customer.email) throw new Error('customer email is required');
    if (!draft.items || draft.items.length === 0) throw new Error('at least one item is required');

    draft.items.forEach((item, index) => {
      if (!item.description) throw new Error(`item ${index + 1}: description is required`);
      if (!item.quantity || item.quantity <= 0) throw new Error(`item ${index + 1}: quantity must be greater than 0`);
      if (!item.unit_price || item.unit_price <= 0) throw new Error(`item ${index + 1}: unit_price must be greater than 0`);
    });
  }

  private shouldRetry(error: any): boolean {
    // Definir cuándo reintentar basado en el tipo de error
    const retryableErrors = ['network', 'timeout', 'temporary', '5xx'];
    return retryableErrors.some(type =>
      error.message.toLowerCase().includes(type) ||
      error.code?.toString().startsWith('5')
    );
  }

  private async retryInvoice(queueItemId: string): Promise<void> {
    const item = this.outboxQueue.find(i => i.id === queueItemId);
    if (!item || item.status !== 'failed') return;

    console.log(`Retrying invoice for order ${item.draft.order_id}`);

    try {
      await this.issueInvoice(item.draft);
    } catch (error) {
      console.error(`Retry failed for order ${item.draft.order_id}:`, error.message);
    }
  }

  // Utilidad para obtener estadísticas del outbox
  getOutboxStats() {
    const stats = {
      total: this.outboxQueue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    this.outboxQueue.forEach(item => {
      stats[item.status]++;
    });

    return stats;
  }
}