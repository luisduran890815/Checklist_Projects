import type { User } from '@supabase/supabase-js'
import { isDemoMode, supabase } from '../lib/supabase'
import type { AppData, Attachment, PurchaseOrder, Quote, Supplier } from '../types'

const STORE_KEY = 'procura-demo-data-v1'
const USER_KEY = 'procura-demo-user-v1'
const now = new Date().toISOString()
const owner = 'demo-user'

const initialData: AppData = {
  suppliers: [
    { id: 's-1', owner_id: owner, name: 'Suministros del Caribe', tax_id: '901.245.870-3', contact_name: 'Andrea Torres', email: 'ventas@caribe.demo', phone: '+57 300 555 0198', status: 'activo', created_at: now, updated_at: now },
    { id: 's-2', owner_id: owner, name: 'Tecnología Horizonte', tax_id: '900.881.420-1', contact_name: 'Samuel Ortiz', email: 'comercial@horizonte.demo', phone: '+57 301 555 0284', status: 'activo', created_at: now, updated_at: now },
    { id: 's-3', owner_id: owner, name: 'Papeles & Oficina Norte', tax_id: '802.144.991-8', contact_name: 'Mónica Díaz', email: 'pedidos@oficinanorte.demo', phone: '+57 302 555 0371', status: 'inactivo', created_at: now, updated_at: now }
  ],
  quotes: [
    { id: 'q-1', owner_id: owner, quote_number: 'COT-2026-0142', supplier_id: 's-1', issue_date: '2026-09-18', valid_until: '2026-10-18', status: 'aprobada', currency: 'COP', subtotal: 4850000, tax: 921500, total: 5771500, notes: 'Dotación operativa trimestral.', created_at: now, updated_at: now },
    { id: 'q-2', owner_id: owner, quote_number: 'COT-2026-0143', supplier_id: 's-2', issue_date: '2026-09-23', valid_until: '2026-10-08', status: 'recibida', currency: 'COP', subtotal: 7200000, tax: 1368000, total: 8568000, notes: 'Renovación de periféricos.', created_at: now, updated_at: now },
    { id: 'q-3', owner_id: owner, quote_number: 'COT-2026-0144', supplier_id: 's-1', issue_date: '2026-09-28', valid_until: '2026-10-12', status: 'borrador', currency: 'COP', subtotal: 1960000, tax: 372400, total: 2332400, notes: 'Elementos de señalización.', created_at: now, updated_at: now }
  ],
  orders: [
    { id: 'o-1', owner_id: owner, po_number: 'OC-2026-0087', supplier_id: 's-1', quote_id: 'q-1', order_date: '2026-09-22', expected_date: '2026-10-03', status: 'en_proceso', currency: 'COP', subtotal: 4850000, tax: 921500, total: 5771500, notes: 'Entrega en sede principal.', created_at: now, updated_at: now },
    { id: 'o-2', owner_id: owner, po_number: 'OC-2026-0086', supplier_id: 's-2', quote_id: null, order_date: '2026-09-12', expected_date: '2026-09-26', status: 'recibida', currency: 'COP', subtotal: 3150000, tax: 598500, total: 3748500, notes: 'Recibida a satisfacción.', created_at: now, updated_at: now }
  ],
  attachments: []
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function readDemo(): AppData {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) {
    localStorage.setItem(STORE_KEY, JSON.stringify(initialData))
    return structuredClone(initialData)
  }
  try { return JSON.parse(raw) as AppData } catch { return structuredClone(initialData) }
}

function writeDemo(data: AppData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data))
}

export async function getCurrentUser(): Promise<User | null> {
  if (isDemoMode) {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) as User : null
  }
  const { data, error } = await supabase!.auth.getUser()
  if (error) return null
  return data.user
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (isDemoMode) return () => undefined
  const { data } = supabase!.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<User> {
  if (isDemoMode) {
    if (!email || password.length < 6) throw new Error('Usa un correo válido y una contraseña de al menos 6 caracteres.')
    const user = { id: owner, email, user_metadata: { full_name: email.split('@')[0] } } as unknown as User
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  }
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signUp(email: string, password: string, fullName: string): Promise<User | null> {
  if (isDemoMode) return signIn(email, password)
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
  if (error) throw error
  return data.user
}

export async function resetPassword(email: string) {
  if (isDemoMode) return
  const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
  if (error) throw error
}

export async function signOut() {
  if (isDemoMode) { localStorage.removeItem(USER_KEY); return }
  const { error } = await supabase!.auth.signOut()
  if (error) throw error
}

export async function loadAll(): Promise<AppData> {
  if (isDemoMode) return readDemo()
  const [suppliers, quotes, orders, attachments] = await Promise.all([
    supabase!.from('suppliers').select('*').order('name'),
    supabase!.from('quotes').select('*').order('issue_date', { ascending: false }),
    supabase!.from('purchase_orders').select('*').order('order_date', { ascending: false }),
    supabase!.from('attachments').select('*').order('created_at', { ascending: false })
  ])
  const error = suppliers.error || quotes.error || orders.error || attachments.error
  if (error) throw error
  return { suppliers: suppliers.data, quotes: quotes.data, orders: orders.data, attachments: attachments.data }
}

async function saveDemo<T extends Supplier | Quote | PurchaseOrder>(collection: 'suppliers' | 'quotes' | 'orders', record: Partial<T>, prefix: string): Promise<T> {
  const data = readDemo()
  const list = data[collection] as T[]
  const timestamp = new Date().toISOString()
  const saved = { ...record, id: record.id || uid(prefix), owner_id: owner, created_at: record.created_at || timestamp, updated_at: timestamp } as T
  const index = list.findIndex(item => item.id === saved.id)
  if (index >= 0) list[index] = saved; else list.unshift(saved)
  writeDemo(data)
  return saved
}

export async function saveSupplier(record: Partial<Supplier>) {
  if (isDemoMode) return saveDemo<Supplier>('suppliers', record, 's')
  const { data, error } = await supabase!.from('suppliers').upsert(record).select().single()
  if (error) throw error
  return data as Supplier
}

export async function saveQuote(record: Partial<Quote>) {
  if (isDemoMode) return saveDemo<Quote>('quotes', record, 'q')
  // `total` es una columna generada en PostgreSQL y no debe enviarse en INSERT/UPDATE.
  const { total: _generatedTotal, ...payload } = record
  const { data, error } = await supabase!.from('quotes').upsert(payload).select().single()
  if (error) throw error
  return data as Quote
}

export async function saveOrder(record: Partial<PurchaseOrder>) {
  if (isDemoMode) return saveDemo<PurchaseOrder>('orders', record, 'o')
  // `total` es una columna generada en PostgreSQL y no debe enviarse en INSERT/UPDATE.
  const { total: _generatedTotal, ...payload } = record
  const { data, error } = await supabase!.from('purchase_orders').upsert(payload).select().single()
  if (error) throw error
  return data as PurchaseOrder
}

export async function removeRecord(table: 'suppliers' | 'quotes' | 'purchase_orders', id: string) {
  if (isDemoMode) {
    const data = readDemo()
    if (table === 'suppliers') {
      const inUse = data.quotes.some(item => item.supplier_id === id) || data.orders.some(item => item.supplier_id === id)
      if (inUse) throw new Error('No puedes eliminar un proveedor con documentos relacionados. Cámbialo a inactivo.')
      data.suppliers = data.suppliers.filter(item => item.id !== id)
    }
    if (table === 'quotes') data.quotes = data.quotes.filter(item => item.id !== id)
    if (table === 'purchase_orders') data.orders = data.orders.filter(item => item.id !== id)
    data.attachments = data.attachments.filter(item => item.entity_id !== id)
    writeDemo(data)
    return
  }
  if (table === 'quotes' || table === 'purchase_orders') {
    const entityType = table === 'quotes' ? 'quote' : 'purchase_order'
    const { data: files, error: listError } = await supabase!.from('attachments').select('storage_path').eq('entity_type', entityType).eq('entity_id', id)
    if (listError) throw listError
    const paths = (files || []).map(file => file.storage_path)
    if (paths.length) {
      const { error: storageError } = await supabase!.storage.from('attachments').remove(paths)
      if (storageError) throw storageError
      const { error: attachmentError } = await supabase!.from('attachments').delete().eq('entity_type', entityType).eq('entity_id', id)
      if (attachmentError) throw attachmentError
    }
  }
  const { error } = await supabase!.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function uploadPdf(file: File, entityType: Attachment['entity_type'], entityId: string, userId: string): Promise<Attachment> {
  if (file.type !== 'application/pdf') throw new Error('Solo se permiten archivos PDF.')
  if (file.size > 10 * 1024 * 1024) throw new Error('El PDF no puede superar 10 MB.')
  if (isDemoMode) {
    const data = readDemo()
    const attachment: Attachment = { id: uid('a'), owner_id: owner, entity_type: entityType, entity_id: entityId, file_name: file.name, storage_path: 'demo/local', mime_type: file.type, size_bytes: file.size, created_at: new Date().toISOString(), url: URL.createObjectURL(file) }
    data.attachments.unshift(attachment); writeDemo(data); return attachment
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${entityType}/${entityId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase!.storage.from('attachments').upload(path, file, { contentType: 'application/pdf' })
  if (uploadError) throw uploadError
  const { data, error } = await supabase!.from('attachments').insert({ entity_type: entityType, entity_id: entityId, file_name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size }).select().single()
  if (error) { await supabase!.storage.from('attachments').remove([path]); throw error }
  return data as Attachment
}

export async function openAttachment(attachment: Attachment) {
  if (attachment.url) { window.open(attachment.url, '_blank', 'noopener,noreferrer'); return }
  const { data, error } = await supabase!.storage.from('attachments').createSignedUrl(attachment.storage_path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export async function removeAttachment(attachment: Attachment) {
  if (isDemoMode) {
    const data = readDemo(); data.attachments = data.attachments.filter(item => item.id !== attachment.id); writeDemo(data); return
  }
  const { error: storageError } = await supabase!.storage.from('attachments').remove([attachment.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase!.from('attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

export function resetDemoData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(initialData))
}
