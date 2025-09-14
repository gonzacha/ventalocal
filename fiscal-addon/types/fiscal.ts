export interface InvoiceDraft {
  order_id: string;
  customer: {
    cuit?: string;
    name: string;
    email: string;
    tax_condition: 'RI' | 'MONO' | 'CF' | 'EX';
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }>;
  invoice_type: 'A' | 'B' | 'C' | 'E' | 'M';
  point_of_sale: number;
}

export interface IssuedInvoice {
  invoice_id: string;
  cae: string;
  cae_due_date: string;
  invoice_number: string;
  pdf_url: string;
  xml_url?: string;
  issued_at: string;
}

export interface TaxAdapter {
  issueInvoice(draft: InvoiceDraft): Promise<IssuedInvoice>;
  cancelInvoice(invoiceId: string, reason?: string): Promise<void>;
  getPdf(invoiceId: string): Promise<Buffer>;
  health(): Promise<{ ok: boolean; latencyMs: number }>;
}

export interface FiscalConfig {
  adapter_type: 'mock' | 'tusfacturas' | 'afip_sdk';
  api_key?: string;
  api_secret?: string;
  environment: 'development' | 'staging' | 'production';
  default_point_of_sale: number;
}