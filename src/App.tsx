import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import {
  Archive, ArrowRight, BarChart3, Building2, Check, ChevronDown, CircleDollarSign,
  ClipboardList, Download, Edit3, Eye, FileSpreadsheet, FileText, Filter, LayoutDashboard,
  LogOut, Menu, PackageCheck, Paperclip, Plus, RefreshCw, Search, ShieldCheck, ShoppingCart,
  Trash2, Upload, Users, X, Zap
} from 'lucide-react'
import { isDemoMode } from './lib/supabase'
import {
  getCurrentUser, loadAll, onAuthChange, openAttachment, removeAttachment, removeRecord,
  resetDemoData, resetPassword, saveOrder, saveQuote, saveSupplier, signIn, signOut, signUp, uploadPdf
} from './services/api'
import type { AppData, Attachment, PurchaseOrder, Quote, Section, Supplier } from './types'

const EMPTY_DATA: AppData = { suppliers: [], quotes: [], orders: [], attachments: [] }
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const dateFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const today = new Date().toISOString().slice(0, 10)

const statusLabel: Record<string, string> = {
  activo: 'Activo', inactivo: 'Inactivo', borrador: 'Borrador', recibida: 'Recibida',
  aprobada: 'Aprobada', rechazada: 'Rechazada', vencida: 'Vencida', emitida: 'Emitida',
  en_proceso: 'En proceso', cancelada: 'Cancelada'
}

function fmtDate(value?: string) {
  if (!value) return '—'
  return dateFmt.format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status}`}><i />{statusLabel[status] || status}</span>
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string, eyebrow: string, onClose: () => void, children: React.ReactNode, wide?: boolean }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>
      {children}
    </section>
  </div>
}

function AuthScreen({ onUser }: { onUser: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('demo@procura.local')
  const [password, setPassword] = useState('Demo123!')
  const [name, setName] = useState('Usuario Demo')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'ok', text: string } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null)
    try {
      const user = mode === 'login' ? await signIn(email, password) : await signUp(email, password, name)
      if (user) onUser(user); else setMessage({ type: 'ok', text: 'Revisa tu correo para confirmar la cuenta.' })
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible continuar.' }) }
    finally { setBusy(false) }
  }

  async function forgot() {
    if (!email) return setMessage({ type: 'error', text: 'Escribe tu correo primero.' })
    setBusy(true)
    try { await resetPassword(email); setMessage({ type: 'ok', text: isDemoMode ? 'En modo demo no se envían correos.' : 'Enviamos el enlace de recuperación.' }) }
    catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible enviar el enlace.' }) }
    finally { setBusy(false) }
  }

  return <main className="auth-shell">
    <section className="auth-brand">
      <div className="brand-mark brand-mark-large"><span>P</span></div>
      <div className="auth-copy"><span className="kicker">CONTROL DE COMPRAS · SIN FRICCIÓN</span><h1>Cada compra,<br /><em>bajo control.</em></h1><p>Proveedores, cotizaciones, órdenes y documentos en un flujo trazable y listo para decidir.</p></div>
      <div className="auth-steps"><div><b>01</b><span>Compara</span></div><ArrowRight /><div><b>02</b><span>Aprueba</span></div><ArrowRight /><div><b>03</b><span>Ordena</span></div></div>
      <div className="grain" />
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <div className="auth-card-title"><span className="eyebrow">ACCESO SEGURO</span><h2>{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu espacio'}</h2><p>{mode === 'login' ? 'Ingresa para continuar con tus procesos.' : 'Configura tu cuenta de gestión.'}</p></div>
        {isDemoMode && <div className="demo-note"><Zap size={17} /><div><b>Modo demostración activo</b><span>Los datos se guardan en este navegador.</span></div></div>}
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <label>Nombre completo<input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" /></label>}
          <label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />}{mode === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}</button>
        </form>
        <div className="auth-actions">{mode === 'login' && <button className="text-button" onClick={forgot}>¿Olvidaste tu contraseña?</button>}<button className="text-button strong" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null) }}>{mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}</button></div>
      </div>
      <footer>PROCURA v1.0 · Gestión responsable</footer>
    </section>
  </main>
}

function SupplierForm({ current, onClose, onSaved }: { current?: Supplier, onClose: () => void, onSaved: () => void }) {
  const [form, setForm] = useState({ name: current?.name || '', tax_id: current?.tax_id || '', contact_name: current?.contact_name || '', email: current?.email || '', phone: current?.phone || '', status: current?.status || 'activo' })
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value })
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await saveSupplier({ ...current, ...form } as Supplier); onSaved() } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.') } finally { setBusy(false) } }
  return <Modal eyebrow="PROVEEDOR" title={current ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}><form className="entity-form" onSubmit={submit}><div className="form-grid"><label className="span-2">Razón social<input value={form.name} onChange={field('name')} required autoFocus /></label><label>NIT / Identificación<input value={form.tax_id} onChange={field('tax_id')} required /></label><label>Estado<select value={form.status} onChange={field('status')}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label><label>Persona de contacto<input value={form.contact_name} onChange={field('contact_name')} /></label><label>Teléfono<input value={form.phone} onChange={field('phone')} /></label><label className="span-2">Correo<input type="email" value={form.email} onChange={field('email')} /></label></div>{error && <div className="form-message error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}Guardar proveedor</button></div></form></Modal>
}

function AttachmentBox({ entityType, entityId, attachments, userId, onChanged }: { entityType: Attachment['entity_type'], entityId: string, attachments: Attachment[], userId: string, onChanged: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const own = attachments.filter(a => a.entity_type === entityType && a.entity_id === entityId)
  async function upload(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError(''); try { await uploadPdf(file, entityType, entityId, userId); onChanged() } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible adjuntar.') } finally { setBusy(false); e.target.value = '' } }
  async function remove(item: Attachment) { if (!confirm(`¿Eliminar ${item.file_name}?`)) return; setBusy(true); try { await removeAttachment(item); onChanged() } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible eliminar.') } finally { setBusy(false) } }
  return <div className="attachment-box"><div className="attachment-title"><div><Paperclip size={17} /><b>Adjuntos PDF</b></div><label className={`upload-button ${busy ? 'disabled' : ''}`}><Upload size={15} />Adjuntar PDF<input type="file" accept="application/pdf" onChange={upload} disabled={busy} /></label></div>{own.length === 0 ? <div className="empty-attachment"><FileText size={22} /><span>Sin documentos adjuntos</span></div> : <div className="attachment-list">{own.map(item => <div className="attachment-item" key={item.id}><FileText size={19} /><div><b>{item.file_name}</b><span>{(item.size_bytes / 1024).toFixed(0)} KB · {fmtDate(item.created_at)}</span></div><button type="button" className="icon-button" onClick={() => openAttachment(item)} aria-label="Abrir"><Eye size={17} /></button><button type="button" className="icon-button danger" onClick={() => remove(item)} aria-label="Eliminar"><Trash2 size={17} /></button></div>)}</div>}{error && <div className="form-message error">{error}</div>}<small>Máximo 10 MB por archivo. El acceso se protege con políticas RLS y enlaces temporales.</small></div>
}

function QuoteForm({ current, suppliers, attachments, userId, onClose, onSaved, onAttachmentsChanged }: { current?: Quote, suppliers: Supplier[], attachments: Attachment[], userId: string, onClose: () => void, onSaved: () => void, onAttachmentsChanged: () => void }) {
  const [form, setForm] = useState({ quote_number: current?.quote_number || `COT-${new Date().getFullYear()}-`, supplier_id: current?.supplier_id || suppliers[0]?.id || '', issue_date: current?.issue_date || today, valid_until: current?.valid_until || today, status: current?.status || 'borrador', currency: current?.currency || 'COP', subtotal: current?.subtotal || 0, tax: current?.tax || 0, notes: current?.notes || '' })
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string | number) => setForm({ ...form, [key]: value })
  const total = Number(form.subtotal) + Number(form.tax)
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await saveQuote({ ...current, ...form, subtotal: Number(form.subtotal), tax: Number(form.tax), total } as Quote); onSaved() } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.') } finally { setBusy(false) } }
  return <Modal eyebrow="COTIZACIÓN" title={current ? `Editar ${current.quote_number}` : 'Nueva cotización'} onClose={onClose} wide><form className="entity-form" onSubmit={submit}><div className="form-grid"><label>Número<input value={form.quote_number} onChange={e => set('quote_number', e.target.value)} required autoFocus /></label><label>Proveedor<select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required><option value="">Seleccionar…</option>{suppliers.filter(s => s.status === 'activo' || s.id === current?.supplier_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Fecha de emisión<input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} required /></label><label>Válida hasta<input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} required /></label><label>Estado<select value={form.status} onChange={e => set('status', e.target.value)}><option value="borrador">Borrador</option><option value="recibida">Recibida</option><option value="aprobada">Aprobada</option><option value="rechazada">Rechazada</option><option value="vencida">Vencida</option></select></label><label>Moneda<select value={form.currency} onChange={e => set('currency', e.target.value)}><option>COP</option><option>USD</option><option>EUR</option></select></label><label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal} onChange={e => set('subtotal', Number(e.target.value))} required /></label><label>Impuestos<input type="number" min="0" step="0.01" value={form.tax} onChange={e => set('tax', Number(e.target.value))} required /></label><label className="span-2">Notas<textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></label></div><div className="total-strip"><span>Total de la cotización</span><strong>{money.format(total)}</strong></div>{current && <AttachmentBox entityType="quote" entityId={current.id} attachments={attachments} userId={userId} onChanged={onAttachmentsChanged} />}{!current && <p className="form-hint">Guarda la cotización para habilitar sus adjuntos PDF.</p>}{error && <div className="form-message error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy || !form.supplier_id}>{busy ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}Guardar cotización</button></div></form></Modal>
}

function OrderForm({ current, fromQuote, suppliers, quotes, attachments, userId, onClose, onSaved, onAttachmentsChanged }: { current?: PurchaseOrder, fromQuote?: Quote, suppliers: Supplier[], quotes: Quote[], attachments: Attachment[], userId: string, onClose: () => void, onSaved: () => void, onAttachmentsChanged: () => void }) {
  const source = current || (fromQuote ? { supplier_id: fromQuote.supplier_id, quote_id: fromQuote.id, currency: fromQuote.currency, subtotal: fromQuote.subtotal, tax: fromQuote.tax, total: fromQuote.total, notes: `Generada desde ${fromQuote.quote_number}` } : undefined)
  const [form, setForm] = useState({ po_number: current?.po_number || `OC-${new Date().getFullYear()}-`, supplier_id: source?.supplier_id || suppliers[0]?.id || '', quote_id: source?.quote_id || '', order_date: current?.order_date || today, expected_date: current?.expected_date || today, status: current?.status || 'borrador', currency: source?.currency || 'COP', subtotal: source?.subtotal || 0, tax: source?.tax || 0, notes: source?.notes || '' })
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string | number) => setForm({ ...form, [key]: value })
  const total = Number(form.subtotal) + Number(form.tax)
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await saveOrder({ ...current, ...form, quote_id: form.quote_id || null, subtotal: Number(form.subtotal), tax: Number(form.tax), total } as PurchaseOrder); onSaved() } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.') } finally { setBusy(false) } }
  return <Modal eyebrow="ORDEN DE COMPRA" title={current ? `Editar ${current.po_number}` : 'Nueva orden de compra'} onClose={onClose} wide><form className="entity-form" onSubmit={submit}><div className="form-grid"><label>Número<input value={form.po_number} onChange={e => set('po_number', e.target.value)} required autoFocus /></label><label>Proveedor<select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required><option value="">Seleccionar…</option>{suppliers.filter(s => s.status === 'activo' || s.id === current?.supplier_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Cotización origen<select value={form.quote_id} onChange={e => set('quote_id', e.target.value)}><option value="">Sin cotización</option>{quotes.map(q => <option key={q.id} value={q.id}>{q.quote_number}</option>)}</select></label><label>Estado<select value={form.status} onChange={e => set('status', e.target.value)}><option value="borrador">Borrador</option><option value="emitida">Emitida</option><option value="en_proceso">En proceso</option><option value="recibida">Recibida</option><option value="cancelada">Cancelada</option></select></label><label>Fecha de orden<input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} required /></label><label>Entrega esperada<input type="date" value={form.expected_date} onChange={e => set('expected_date', e.target.value)} required /></label><label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal} onChange={e => set('subtotal', Number(e.target.value))} required /></label><label>Impuestos<input type="number" min="0" step="0.01" value={form.tax} onChange={e => set('tax', Number(e.target.value))} required /></label><label className="span-2">Notas<textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></label></div><div className="total-strip"><span>Total de la orden</span><strong>{money.format(total)}</strong></div>{current && <AttachmentBox entityType="purchase_order" entityId={current.id} attachments={attachments} userId={userId} onChanged={onAttachmentsChanged} />}{!current && <p className="form-hint">Guarda la orden para habilitar sus adjuntos PDF.</p>}{error && <div className="form-message error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy || !form.supplier_id}>{busy ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}Guardar orden</button></div></form></Modal>
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [section, setSection] = useState<Section>('dashboard')
  const [sidebar, setSidebar] = useState(false)
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [supplierModal, setSupplierModal] = useState<Supplier | 'new' | null>(null)
  const [quoteModal, setQuoteModal] = useState<Quote | 'new' | null>(null)
  const [orderModal, setOrderModal] = useState<PurchaseOrder | 'new' | null>(null)
  const [fromQuote, setFromQuote] = useState<Quote | undefined>()

  useEffect(() => { getCurrentUser().then(value => { setUser(value); setChecking(false) }); return onAuthChange(setUser) }, [])
  useEffect(() => { if (user) refresh() }, [user])

  async function refresh() { setLoading(true); setError(''); try { setData(await loadAll()) } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible cargar la información.') } finally { setLoading(false) } }
  async function logout() { await signOut(); setUser(null); setData(EMPTY_DATA) }
  function supplierName(id: string) { return data.suppliers.find(s => s.id === id)?.name || 'Proveedor eliminado' }
  const query = search.trim().toLowerCase()
  const filteredSuppliers = data.suppliers.filter(s => [s.name, s.tax_id, s.contact_name, s.email].some(v => v.toLowerCase().includes(query)))
  const filteredQuotes = data.quotes.filter(q => (!query || [q.quote_number, q.notes, supplierName(q.supplier_id)].some(v => v.toLowerCase().includes(query))) && (supplierFilter === 'all' || q.supplier_id === supplierFilter) && (statusFilter === 'all' || q.status === statusFilter) && (!dateFrom || q.issue_date >= dateFrom) && (!dateTo || q.issue_date <= dateTo))
  const filteredOrders = data.orders.filter(o => (!query || [o.po_number, o.notes, supplierName(o.supplier_id)].some(v => v.toLowerCase().includes(query))) && (supplierFilter === 'all' || o.supplier_id === supplierFilter) && (statusFilter === 'all' || o.status === statusFilter) && (!dateFrom || o.order_date >= dateFrom) && (!dateTo || o.order_date <= dateTo))
  const activity = useMemo(() => [...filteredQuotes.map(q => ({ id: q.id, type: 'Cotización', number: q.quote_number, supplier: supplierName(q.supplier_id), date: q.issue_date, status: q.status, total: q.total })), ...filteredOrders.map(o => ({ id: o.id, type: 'Orden', number: o.po_number, supplier: supplierName(o.supplier_id), date: o.order_date, status: o.status, total: o.total }))].sort((a, b) => b.date.localeCompare(a.date)), [filteredQuotes, filteredOrders, data.suppliers])
  const metrics = useMemo(() => ({ quoteValue: filteredQuotes.reduce((a, b) => a + Number(b.total), 0), orderValue: filteredOrders.filter(o => !['cancelada', 'recibida'].includes(o.status)).reduce((a, b) => a + Number(b.total), 0), activeSuppliers: data.suppliers.filter(s => s.status === 'activo').length, approval: data.quotes.length ? Math.round(data.quotes.filter(q => q.status === 'aprobada').length / data.quotes.length * 100) : 0 }), [filteredQuotes, filteredOrders, data])
  const chartData = useMemo(() => {
    const months: { key: string, label: string, quotes: number, orders: number }[] = []
    for (let i = 5; i >= 0; i--) { const date = new Date(); date.setMonth(date.getMonth() - i); const key = date.toISOString().slice(0, 7); months.push({ key, label: date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase(), quotes: 0, orders: 0 }) }
    data.quotes.forEach(q => { const m = months.find(x => x.key === q.issue_date.slice(0, 7)); if (m) m.quotes += Number(q.total) })
    data.orders.forEach(o => { const m = months.find(x => x.key === o.order_date.slice(0, 7)); if (m) m.orders += Number(o.total) })
    return months
  }, [data])
  const chartMax = Math.max(1, ...chartData.flatMap(x => [x.quotes, x.orders]))

  async function remove(kind: 'suppliers' | 'quotes' | 'purchase_orders', id: string, label: string) { if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return; try { await removeRecord(kind, id); await refresh() } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar.') } }
  function clearFilters() { setSearch(''); setSupplierFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo('') }
  function exportExcel() {
    const workbook = XLSX.utils.book_new()
    const summary = [{ Indicador: 'Valor cotizado filtrado', Valor: metrics.quoteValue }, { Indicador: 'Órdenes abiertas filtradas', Valor: metrics.orderValue }, { Indicador: 'Proveedores activos', Valor: metrics.activeSuppliers }, { Indicador: 'Tasa de aprobación (%)', Valor: metrics.approval }]
    const quotes = filteredQuotes.map(q => ({ Número: q.quote_number, Proveedor: supplierName(q.supplier_id), Emisión: q.issue_date, Vigencia: q.valid_until, Estado: statusLabel[q.status], Moneda: q.currency, Subtotal: q.subtotal, Impuestos: q.tax, Total: q.total, Notas: q.notes }))
    const orders = filteredOrders.map(o => ({ Número: o.po_number, Proveedor: supplierName(o.supplier_id), Fecha: o.order_date, Entrega: o.expected_date, Estado: statusLabel[o.status], Moneda: o.currency, Subtotal: o.subtotal, Impuestos: o.tax, Total: o.total, Notas: o.notes }))
    const suppliers = filteredSuppliers.map(s => ({ Proveedor: s.name, NIT: s.tax_id, Contacto: s.contact_name, Correo: s.email, Teléfono: s.phone, Estado: statusLabel[s.status] }))
    ;[['Resumen', summary], ['Cotizaciones', quotes], ['Órdenes', orders], ['Proveedores', suppliers]].forEach(([name, rows]) => { const sheet = XLSX.utils.json_to_sheet(rows as object[]); sheet['!cols'] = Object.keys((rows as object[])[0] || {}).map(key => ({ wch: Math.min(42, Math.max(13, key.length + 3)) })); XLSX.utils.book_append_sheet(workbook, sheet, name as string) })
    XLSX.writeFile(workbook, `procura-export-${today}.xlsx`)
  }
  async function restoreDemo() { if (!confirm('¿Restaurar todos los datos de demostración?')) return; resetDemoData(); await refresh() }
  function openNewOrder(quote?: Quote) { setFromQuote(quote); setOrderModal('new') }
  function changeSection(next: Section) { setSection(next); setSidebar(false); setSearch(''); if (next !== 'dashboard') { setSupplierFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo('') } }

  if (checking) return <div className="loading-screen"><div className="brand-mark"><span>P</span></div><RefreshCw className="spin" /></div>
  if (!user) return <AuthScreen onUser={setUser} />

  const nav = [{ id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard }, { id: 'suppliers' as Section, label: 'Proveedores', icon: Building2 }, { id: 'quotes' as Section, label: 'Cotizaciones', icon: FileSpreadsheet }, { id: 'orders' as Section, label: 'Órdenes de compra', icon: ShoppingCart }]
  const sectionTitles = { dashboard: ['Centro de control', 'Resumen de compras'], suppliers: ['Directorio', 'Proveedores'], quotes: ['Negociación', 'Cotizaciones'], orders: ['Ejecución', 'Órdenes de compra'] }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark"><span>P</span></div><div><b>PROCURA</b><span>control de compras</span></div><button className="icon-button sidebar-close" onClick={() => setSidebar(false)}><X /></button></div>
      <nav>{nav.map(item => <button key={item.id} onClick={() => changeSection(item.id)} className={section === item.id ? 'active' : ''}><item.icon size={19} /><span>{item.label}</span>{section === item.id && <i />}</button>)}</nav>
      <div className="sidebar-foot">{isDemoMode && <button className="demo-control" onClick={restoreDemo}><RefreshCw size={15} /><span>Restaurar demo</span></button>}<div className="secure-box"><ShieldCheck size={19} /><div><b>Datos protegidos</b><span>RLS activo</span></div></div><button className="user-card" onClick={logout}><div className="avatar">{(user.email || 'U').slice(0, 2).toUpperCase()}</div><div><b>{user.user_metadata?.full_name || user.email?.split('@')[0]}</b><span>{user.email}</span></div><LogOut size={17} /></button></div>
    </aside>
    {sidebar && <div className="sidebar-scrim" onClick={() => setSidebar(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebar(true)}><Menu /></button><div className="global-search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar en ${section === 'dashboard' ? 'todo el sistema' : sectionTitles[section][1].toLowerCase()}…`} />{search && <button onClick={() => setSearch('')}><X size={15} /></button>}</div><div className="top-actions"><span className={`environment ${isDemoMode ? 'demo' : 'live'}`}><i />{isDemoMode ? 'DEMO LOCAL' : 'SUPABASE LIVE'}</span><button className="secondary-button export-top" onClick={exportExcel}><Download size={17} />Exportar Excel</button></div></header>
      <div className="workspace">
        <div className="page-heading"><div><span className="eyebrow">{sectionTitles[section][0]}</span><h1>{sectionTitles[section][1]}</h1></div><div className="heading-actions"><button className="icon-button refresh" onClick={refresh} aria-label="Actualizar"><RefreshCw className={loading ? 'spin' : ''} size={19} /></button>{section === 'suppliers' && <button className="primary-button" onClick={() => setSupplierModal('new')}><Plus size={18} />Nuevo proveedor</button>}{section === 'quotes' && <button className="primary-button" onClick={() => setQuoteModal('new')}><Plus size={18} />Nueva cotización</button>}{section === 'orders' && <button className="primary-button" onClick={() => openNewOrder()}><Plus size={18} />Nueva orden</button>}</div></div>
        {error && <div className="page-error"><Archive size={18} /><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}

        {section === 'dashboard' && <>
          <section className="metrics-grid"><article className="metric-card"><div className="metric-icon amber"><CircleDollarSign /></div><div><span>VALOR COTIZADO</span><strong>{money.format(metrics.quoteValue)}</strong><small>{filteredQuotes.length} cotizaciones en el filtro</small></div></article><article className="metric-card"><div className="metric-icon teal"><ShoppingCart /></div><div><span>ÓRDENES ABIERTAS</span><strong>{money.format(metrics.orderValue)}</strong><small>Pendiente por completar</small></div></article><article className="metric-card"><div className="metric-icon blue"><Users /></div><div><span>PROVEEDORES ACTIVOS</span><strong>{metrics.activeSuppliers}</strong><small>de {data.suppliers.length} registrados</small></div></article><article className="metric-card"><div className="metric-icon green"><PackageCheck /></div><div><span>TASA DE APROBACIÓN</span><strong>{metrics.approval}%</strong><small>Sobre cotizaciones totales</small></div></article></section>
          <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">ÚLTIMOS 6 MESES</span><h3>Movimiento de compras</h3></div><div className="legend"><span><i className="quote-dot" />Cotizaciones</span><span><i className="order-dot" />Órdenes</span></div></div><div className="bar-chart">{chartData.map(m => <div className="bar-group" key={m.key}><div className="bars"><div className="bar quote-bar" style={{ height: `${Math.max(2, m.quotes / chartMax * 100)}%` }} title={`Cotizaciones: ${money.format(m.quotes)}`} /><div className="bar order-bar" style={{ height: `${Math.max(2, m.orders / chartMax * 100)}%` }} title={`Órdenes: ${money.format(m.orders)}`} /></div><span>{m.label}</span></div>)}</div></article><article className="panel pulse-panel"><div className="panel-head"><div><span className="eyebrow">PULSO OPERATIVO</span><h3>Estado del flujo</h3></div><BarChart3 /></div><div className="pulse-list"><div><span><i className="pulse amber" />Cotizaciones por revisar</span><b>{data.quotes.filter(q => q.status === 'recibida').length}</b></div><div><span><i className="pulse teal" />Órdenes en proceso</span><b>{data.orders.filter(o => o.status === 'en_proceso').length}</b></div><div><span><i className="pulse red" />Cotizaciones vencidas</span><b>{data.quotes.filter(q => q.status === 'vencida').length}</b></div><div><span><i className="pulse green" />Órdenes recibidas</span><b>{data.orders.filter(o => o.status === 'recibida').length}</b></div></div></article></section>
          <section className="panel activity-panel"><div className="panel-head activity-head"><div><span className="eyebrow">TRAZABILIDAD</span><h3>Actividad consolidada</h3></div><div className="filter-row"><label><Building2 size={15} /><select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}><option value="all">Todos los proveedores</option>{data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={14} /></label><label><Filter size={15} /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Todos los estados</option><option value="borrador">Borrador</option><option value="recibida">Recibida</option><option value="aprobada">Aprobada</option><option value="emitida">Emitida</option><option value="en_proceso">En proceso</option><option value="vencida">Vencida</option><option value="cancelada">Cancelada</option></select><ChevronDown size={14} /></label><label className="date-filter"><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="Desde" /></label><label className="date-filter"><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="Hasta" /></label>{(supplierFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || search) && <button className="text-button" onClick={clearFilters}>Limpiar</button>}</div></div><div className="table-wrap"><table><thead><tr><th>DOCUMENTO</th><th>TIPO</th><th>PROVEEDOR</th><th>FECHA</th><th>ESTADO</th><th className="number">TOTAL</th></tr></thead><tbody>{activity.length ? activity.slice(0, 12).map(item => <tr key={`${item.type}-${item.id}`}><td><b className="doc-number">{item.number}</b></td><td>{item.type}</td><td>{item.supplier}</td><td>{fmtDate(item.date)}</td><td><StatusBadge status={item.status} /></td><td className="number"><b>{money.format(item.total)}</b></td></tr>) : <tr><td colSpan={6}><EmptyState label="No hay movimientos con estos filtros." /></td></tr>}</tbody></table></div></section>
        </>}

        {section === 'suppliers' && <section className="panel table-panel"><div className="table-summary"><span>{filteredSuppliers.length} proveedores</span><p>Directorio central de aliados comerciales y datos de contacto.</p></div><div className="table-wrap"><table><thead><tr><th>PROVEEDOR</th><th>NIT / ID</th><th>CONTACTO</th><th>CORREO</th><th>ESTADO</th><th className="actions-col">ACCIONES</th></tr></thead><tbody>{filteredSuppliers.length ? filteredSuppliers.map(s => <tr key={s.id}><td><div className="supplier-cell"><span>{s.name.slice(0, 2).toUpperCase()}</span><b>{s.name}</b></div></td><td>{s.tax_id}</td><td><b>{s.contact_name || '—'}</b><small>{s.phone}</small></td><td>{s.email || '—'}</td><td><StatusBadge status={s.status} /></td><td><div className="row-actions"><button onClick={() => setSupplierModal(s)} aria-label="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => remove('suppliers', s.id, s.name)} aria-label="Eliminar"><Trash2 size={17} /></button></div></td></tr>) : <tr><td colSpan={6}><EmptyState label="No se encontraron proveedores." /></td></tr>}</tbody></table></div></section>}

        {section === 'quotes' && <section className="panel table-panel"><div className="table-summary"><span>{filteredQuotes.length} cotizaciones</span><p>Compara propuestas y conviértelas en órdenes de compra.</p></div><div className="table-wrap"><table><thead><tr><th>NÚMERO</th><th>PROVEEDOR</th><th>EMISIÓN / VIGENCIA</th><th>ESTADO</th><th>ADJUNTOS</th><th className="number">TOTAL</th><th className="actions-col">ACCIONES</th></tr></thead><tbody>{filteredQuotes.length ? filteredQuotes.map(q => <tr key={q.id}><td><b className="doc-number">{q.quote_number}</b><small>{q.currency}</small></td><td>{supplierName(q.supplier_id)}</td><td><b>{fmtDate(q.issue_date)}</b><small>hasta {fmtDate(q.valid_until)}</small></td><td><StatusBadge status={q.status} /></td><td><span className="attachment-count"><Paperclip size={14} />{data.attachments.filter(a => a.entity_type === 'quote' && a.entity_id === q.id).length}</span></td><td className="number"><b>{money.format(q.total)}</b></td><td><div className="row-actions"><button className="promote" onClick={() => openNewOrder(q)} aria-label="Crear orden" title="Crear orden"><ArrowRight size={17} /></button><button onClick={() => setQuoteModal(q)} aria-label="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => remove('quotes', q.id, q.quote_number)} aria-label="Eliminar"><Trash2 size={17} /></button></div></td></tr>) : <tr><td colSpan={7}><EmptyState label="No se encontraron cotizaciones." /></td></tr>}</tbody></table></div></section>}

        {section === 'orders' && <section className="panel table-panel"><div className="table-summary"><span>{filteredOrders.length} órdenes</span><p>Seguimiento desde la emisión hasta la recepción.</p></div><div className="table-wrap"><table><thead><tr><th>NÚMERO</th><th>PROVEEDOR</th><th>ORDEN / ENTREGA</th><th>ESTADO</th><th>ADJUNTOS</th><th className="number">TOTAL</th><th className="actions-col">ACCIONES</th></tr></thead><tbody>{filteredOrders.length ? filteredOrders.map(o => <tr key={o.id}><td><b className="doc-number">{o.po_number}</b><small>{data.quotes.find(q => q.id === o.quote_id)?.quote_number || 'Sin cotización'}</small></td><td>{supplierName(o.supplier_id)}</td><td><b>{fmtDate(o.order_date)}</b><small>entrega {fmtDate(o.expected_date)}</small></td><td><StatusBadge status={o.status} /></td><td><span className="attachment-count"><Paperclip size={14} />{data.attachments.filter(a => a.entity_type === 'purchase_order' && a.entity_id === o.id).length}</span></td><td className="number"><b>{money.format(o.total)}</b></td><td><div className="row-actions"><button onClick={() => setOrderModal(o)} aria-label="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => remove('purchase_orders', o.id, o.po_number)} aria-label="Eliminar"><Trash2 size={17} /></button></div></td></tr>) : <tr><td colSpan={7}><EmptyState label="No se encontraron órdenes de compra." /></td></tr>}</tbody></table></div></section>}
      </div>
    </main>

    {supplierModal && <SupplierForm current={supplierModal === 'new' ? undefined : supplierModal} onClose={() => setSupplierModal(null)} onSaved={async () => { setSupplierModal(null); await refresh() }} />}
    {quoteModal && <QuoteForm current={quoteModal === 'new' ? undefined : quoteModal} suppliers={data.suppliers} attachments={data.attachments} userId={user.id} onClose={() => setQuoteModal(null)} onSaved={async () => { setQuoteModal(null); await refresh() }} onAttachmentsChanged={refresh} />}
    {orderModal && <OrderForm current={orderModal === 'new' ? undefined : orderModal} fromQuote={orderModal === 'new' ? fromQuote : undefined} suppliers={data.suppliers} quotes={data.quotes} attachments={data.attachments} userId={user.id} onClose={() => { setOrderModal(null); setFromQuote(undefined) }} onSaved={async () => { setOrderModal(null); setFromQuote(undefined); await refresh() }} onAttachmentsChanged={refresh} />}
  </div>
}

function EmptyState({ label }: { label: string }) { return <div className="empty-state"><ClipboardList size={27} /><span>{label}</span></div> }

export default App
