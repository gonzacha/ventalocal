import { TaxAdapter, InvoiceDraft, IssuedInvoice } from '../types/fiscal';

export class MockTaxAdapter implements TaxAdapter {
  async issueInvoice(draft: InvoiceDraft): Promise<IssuedInvoice> {
    // Simular latencia real de AFIP
    await new Promise(resolve => setTimeout(resolve, 1200));

    const now = new Date();
    const invoiceNumber = this.generateInvoiceNumber(draft.point_of_sale);

    return {
      invoice_id: `VL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      cae: this.generateCAE(),
      cae_due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      invoice_number: invoiceNumber,
      pdf_url: `/api/fiscal/invoices/${invoiceNumber}/pdf`,
      xml_url: `/api/fiscal/invoices/${invoiceNumber}/xml`,
      issued_at: now.toISOString()
    };
  }

  async cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
    console.log(`Mock: Cancelando factura ${invoiceId}. Motivo: ${reason || 'Sin motivo especificado'}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async getPdf(invoiceId: string): Promise<Buffer> {
    // Simular generación de PDF
    await new Promise(resolve => setTimeout(resolve, 800));
    return Buffer.from(`
      VentaLocal - Factura Electrónica
      ================================

      Factura ID: ${invoiceId}
      Fecha: ${new Date().toLocaleDateString('es-AR')}

      Este es un PDF simulado para demo NAVES.
      En producción se conectaría con TusFacturasAPP o AfipSDK.

      CAE: ${this.generateCAE()}
      Válido hasta: ${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')}
    `);
  }

  async health(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 150));
    const latencyMs = Date.now() - start;

    return {
      ok: true,
      latencyMs,
      adapter: 'MockTaxAdapter',
      environment: 'demo',
      last_check: new Date().toISOString()
    };
  }

  private generateCAE(): string {
    // Generar CAE falso pero realista (14 dígitos)
    return Math.random().toString().slice(2, 16);
  }

  private generateInvoiceNumber(pointOfSale: number): string {
    const pos = pointOfSale.toString().padStart(4, '0');
    const number = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
    return `${pos}-${number}`;
  }
}