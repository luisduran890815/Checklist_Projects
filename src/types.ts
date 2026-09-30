export type SupplierStatus = 'activo' | 'inactivo'
export type QuoteStatus = 'borrador' | 'recibida' | 'aprobada' | 'rechazada' | 'vencida'
export type OrderStatus = 'borrador' | 'emitida' | 'en_proceso' | 'recibida' | 'cancelada'

export interface Supplier {
  id: string
  owner_id: string
  name: string
  tax_id: string
  contact_name: string
  email: string
  phone: string
  status: SupplierStatus
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  owner_id: string
  quote_number: string
  supplier_id: string
  issue_date: string
  valid_until: string
  status: QuoteStatus
  currency: string
  subtotal: number
  tax: number
  total: number
  notes: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  owner_id: string
  po_number: string
  supplier_id: string
  quote_id: string | null
  order_date: string
  expected_date: string
  status: OrderStatus
  currency: string
  subtotal: number
  tax: number
  total: number
  notes: string
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  owner_id: string
  entity_type: 'quote' | 'purchase_order'
  entity_id: string
  file_name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  created_at: string
  url?: string
}

export interface AppData {
  suppliers: Supplier[]
  quotes: Quote[]
  orders: PurchaseOrder[]
  attachments: Attachment[]
}

export type Section = 'dashboard' | 'suppliers' | 'quotes' | 'orders'
