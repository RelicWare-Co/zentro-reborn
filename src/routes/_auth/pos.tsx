import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  Lock,
  Minus,
  Plus,
  Search,
  Trash2,
  Users,
  XIcon,
} from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/pos')({
  component: PosPage,
})

type Product = {
  id: string
  name: string
  category: string
  price: number
}

type CartItemModifier = {
  id: string
  name: string
  price: number
  quantity: number
}

type CartItem = {
  id: string // Unique ID for cart item to allow multiple same-products with different modifiers
  product: Product
  quantity: number
  modifiers: CartItemModifier[]
}

const mockProducts: Product[] = [
  { id: '1', name: 'Tuna Sushi', category: 'Mariscos', price: 124000 },
  { id: '2', name: 'Salmon Sushi', category: 'Mariscos', price: 126000 },
  { id: '3', name: 'Spinach Pkhali', category: 'Vegetales', price: 79000 },
  { id: '4', name: 'Dumplings', category: 'Pollo', price: 64000 },
  { id: '5', name: 'Ketoprak', category: 'Vegetales', price: 56000 },
  { id: '6', name: 'Siomay Ikan', category: 'Mariscos', price: 73000 },
  { id: '7', name: 'Chicken Katsu Vegie', category: 'Pollo', price: 36000 },
  { id: '8', name: 'Meat and Vegetables', category: 'Res', price: 246000 },
  { id: '9', name: 'Wagyu with Sambal', category: 'Res', price: 210000 },
  { id: '10', name: 'Doughnut', category: 'Postres', price: 92000 },
  { id: '11', name: 'Orange Juice', category: 'Bebidas', price: 24000 },
  { id: '12', name: 'Kintamani Mojito', category: 'Bebidas', price: 128000 },
]

const categories = [
  'Todos',
  'Aperitivos',
  'Mariscos',
  'Pollo',
  'Res',
  'Vegetales',
  'Bebidas',
  'Postres',
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function PosPage() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount] = useState(0)

  // Shift & Cash Management States
  const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false)
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false)
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false)
  const [startingCash, setStartingCash] = useState('')
  const [movementType, setMovementType] = useState('inflow')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [countedCash, setCountedCash] = useState('')

  // Checkout States
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [payments, setPayments] = useState<{id: string, method: string, amount: string, reference: string}[]>([{ id: crypto.randomUUID(), method: 'cash', amount: '', reference: '' }])
  const [isCreditSale, setIsCreditSale] = useState(false)
  
  // const selectedCustomerId = 'mostrador' // This would come from the actual select state in a real app

  const startingCashId = useId()
  const movementTypeId = useId()
  const movementAmountId = useId()
  const movementDescriptionId = useId()
  const countedCashId = useId()
  const creditSaleId = useId()

  const addPaymentMethod = () => {
    setPayments([...payments, { id: crypto.randomUUID(), method: 'cash', amount: '', reference: '' }])
  }
  const removePaymentMethod = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }
  const updatePayment = (index: number, field: string, value: string) => {
    const newPayments = [...payments]
    newPayments[index] = { ...newPayments[index], [field]: value }
    setPayments(newPayments)
  }

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todos' || product.category === activeCategory
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id && item.modifiers.length === 0
      )
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prevCart,
        {
          id: crypto.randomUUID(),
          product,
          quantity: 1,
          modifiers: [],
        },
      ]
    })
  }, [])

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId))
  }, [])

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === cartItemId) {
            const newQuantity = item.quantity + delta
            return { ...item, quantity: newQuantity > 0 ? newQuantity : 0 }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const getProductQuantity = useCallback((productId: string) => {
    return cart
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const subTotal = cart.reduce((sum, item) => {
    const itemTotal = item.product.price * item.quantity
    const modifiersTotal = item.modifiers.reduce(
      (mSum, m) => mSum + m.price * m.quantity * item.quantity,
      0
    )
    return sum + itemTotal + modifiersTotal
  }, 0)
  
  const tax = subTotal * 0.19 // 19% IVA por defecto
  const totalAmount = Math.max(0, subTotal + tax - discount)

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const remainingToPay = totalAmount - totalPaid

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
      {/* Top Header: Shift & Client Info */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 bg-[var(--color-carbon)] z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <span className="font-semibold text-white">Caja Principal</span>
            <span className="text-gray-400 text-xs px-1.5 py-0.5 bg-gray-800 rounded-md">Abierta</span>
          </div>
          <Separator orientation="vertical" className="h-5 border-gray-700" />
          <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800 focus-within:border-gray-600 transition-colors">
            <Users className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-sm text-white outline-none border-none focus:ring-0 cursor-pointer min-w-[150px] appearance-none"
              aria-label="Seleccionar cliente"
            >
              <option value="mostrador" className="bg-gray-900">Cliente Mostrador</option>
              <option value="1" className="bg-gray-900">Juan Pérez</option>
              <option value="2" className="bg-gray-900">Empresa XYZ</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCashMovementModalOpen(true)}
            className="h-9 border-gray-700 bg-gray-900/50 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-600 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Movimiento de Caja
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCloseShiftModalOpen(true)}
            className="h-9 border-red-900/30 bg-red-900/10 text-red-400 hover:text-red-300 hover:bg-red-900/30 hover:border-red-900/50 transition-all"
          >
            <Lock className="w-4 h-4 mr-2" />
            Cerrar Turno
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Menu */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800 h-full">
          {/* Categories & Search */}
          <div className="p-4 space-y-4 shrink-0 border-b border-gray-800/50 bg-[#0a0a0a]">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar productos, código de barras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus-visible:border-[var(--color-voltage)] focus-visible:ring-1 focus-visible:ring-[var(--color-voltage)] rounded-lg transition-all"
                />
              </div>
            </div>

            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex w-max space-x-1.5 pb-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? 'default' : 'outline'}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-lg px-4 h-8 text-sm font-medium transition-all ${
                      activeCategory === category
                        ? 'bg-[var(--color-voltage)] text-black hover:bg-[#c9e605] border-transparent shadow-sm'
                        : 'bg-transparent border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>

          {/* Product Grid - Compact Text-Oriented Layout */}
          <ScrollArea className="flex-1 p-4 min-h-0 bg-[#0a0a0a]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">
              {filteredProducts.map((product) => {
                const qty = getProductQuantity(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="text-left bg-[#151515] rounded-xl p-3 border border-gray-800/80 flex flex-col justify-between transition-all hover:border-[var(--color-voltage)]/50 hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-voltage)] group min-h-[100px] relative overflow-hidden"
                  >
                    {qty > 0 && (
                      <div className="absolute top-0 right-0 bg-[var(--color-voltage)] text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10">
                        x{qty}
                      </div>
                    )}
                    <div className="w-full">
                      <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[var(--color-voltage)] transition-colors" title={product.name}>
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-1 font-medium">{product.category}</p>
                    </div>
                    
                    <div className="mt-3">
                      <p className="font-bold text-[15px] text-white tracking-tight tabular-nums">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <p>No se encontraron productos.</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel: Order Detail */}
        <div className="w-[380px] bg-[var(--color-carbon)] flex flex-col shrink-0 h-full border-l border-gray-800">
          {/* Order Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Orden Actual</h2>
              <p className="text-xs text-gray-400 mt-1">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} artículos
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-medium h-8 px-2 text-xs rounded-md transition-all"
              aria-label="Limpiar carrito"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>

          {/* Selected Items */}
          <ScrollArea className="flex-1 px-2 py-1 min-h-0 bg-[#0f0f0f]">
            <div className="space-y-1 py-2">
              {cart.map((item) => (
                <div key={item.id} className="bg-[#151515] p-3 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors group">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-white truncate leading-tight">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-gray-500 font-medium mt-0.5 tabular-nums">
                          {formatCurrency(item.product.price)} / un
                        </div>
                      </div>
                      <div className="font-bold text-sm text-white text-right shrink-0 tabular-nums">
                        {formatCurrency(item.product.price * item.quantity)}
                      </div>
                    </div>
                    
                    {/* Controles de cantidad compactos */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center bg-black/50 rounded-md border border-gray-800/80">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-l-md transition-colors disabled:opacity-50"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div className="w-8 text-center text-sm font-semibold text-white">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-r-md transition-colors"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-400/10 transition-colors"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
                    <Search className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-sm">Escanea o selecciona un producto</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Payment Summary */}
          <div className="p-4 bg-[#0a0a0a] border-t border-gray-800 shrink-0">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-gray-200 tabular-nums">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Impuestos (19%)</span>
                  <span className="text-gray-200 tabular-nums">{formatCurrency(tax)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Descuento</span>
                    <span className="tabular-nums">-{formatCurrency(discount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-800/80 mt-2">
                  <span className="font-bold text-base text-white">Total</span>
                  <span className="font-bold text-xl text-[var(--color-voltage)] tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full h-12 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-bold text-base rounded-xl mt-2 transition-all shadow-[0_4px_14px_rgba(201,230,5,0.2)] hover:shadow-[0_6px_20px_rgba(201,230,5,0.3)]"
                disabled={cart.length === 0}
                onClick={() => setIsCheckoutModalOpen(true)}
              >
                Cobrar
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Shift Modals */}
      
      {/* Open Shift Modal */}
      <Dialog open={isShiftOpenModalOpen} onOpenChange={setIsShiftOpenModalOpen}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apertura de Turno</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-400 mb-4">Ingresa la base de efectivo inicial en la caja para comenzar a operar.</p>
            <div className="grid gap-2">
              <label htmlFor={startingCashId} className="text-sm font-medium text-gray-300">Base en Efectivo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id={startingCashId}
                  type="number"
                  placeholder="0"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="pl-7 bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)] text-lg h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsShiftOpenModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-gray-800">Cancelar</Button>
            <Button onClick={() => setIsShiftOpenModalOpen(false)} className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]">Abrir Turno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Movement Modal */}
      <Dialog open={isCashMovementModalOpen} onOpenChange={setIsCashMovementModalOpen}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Movimiento de Caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor={movementTypeId} className="text-sm font-medium text-gray-300">Tipo de Movimiento</label>
              <select
                id={movementTypeId}
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-voltage)] focus:border-transparent"
              >
                <option value="inflow">Ingreso (Entrada manual)</option>
                <option value="expense">Gasto Operativo</option>
                <option value="payout">Pago a Proveedor</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor={movementAmountId} className="text-sm font-medium text-gray-300">Monto</label>
              <Input
                id={movementAmountId}
                type="number"
                placeholder="0"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={movementDescriptionId} className="text-sm font-medium text-gray-300">Descripción</label>
              <Input
                id={movementDescriptionId}
                placeholder="Ej. Pago de internet, Base adicional..."
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCashMovementModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-gray-800">Cancelar</Button>
            <Button onClick={() => setIsCashMovementModalOpen(false)} className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]">Registrar Movimiento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cierre de Turno</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Resumen del Sistema</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Base inicial</span>
                  <span className="text-white font-medium tabular-nums">$50.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Ventas en efectivo</span>
                  <span className="text-white font-medium tabular-nums">$124.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Ventas tarjeta/transferencia</span>
                  <span className="text-white font-medium tabular-nums">$350.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Movimientos (Gastos)</span>
                  <span className="text-red-400 font-medium tabular-nums">-$10.000</span>
                </div>
                <Separator className="my-2 border-gray-700" />
                <div className="flex justify-between text-base">
                  <span className="text-gray-200 font-semibold">Total Efectivo Esperado</span>
                  <span className="text-[var(--color-voltage)] font-bold tabular-nums">$164.000</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor={countedCashId} className="text-sm font-medium text-gray-300">Efectivo en Caja (Arqueo)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id={countedCashId}
                  type="number"
                  placeholder="0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="pl-7 bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)] text-lg h-12"
                />
              </div>
              {countedCash && (
                <div className={`text-sm mt-1 flex items-center justify-between tabular-nums ${Number(countedCash) === 164000 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>Diferencia:</span>
                  <span className="font-semibold">{formatCurrency(Number(countedCash) - 164000)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCloseShiftModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-gray-800">Cancelar</Button>
            <Button onClick={() => setIsCloseShiftModalOpen(false)} className="bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 border border-red-900/50">Cerrar Turno Definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Cobrar Orden</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-lg border border-gray-800">
              <span className="text-gray-400 font-medium">Total a Pagar</span>
              <span className="text-3xl font-bold text-[var(--color-voltage)]">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-300">Métodos de Pago</h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id={creditSaleId}
                    checked={isCreditSale}
                    onChange={(e) => setIsCreditSale(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-[#0a0a0a] text-[var(--color-voltage)] focus:ring-[var(--color-voltage)]"
                  />
                  <label htmlFor={creditSaleId} className="text-sm text-gray-400 cursor-pointer">Venta a Crédito (Fiado)</label>
                </div>
              </div>

              {!isCreditSale && (
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div key={payment.id} className="flex flex-col gap-2 p-3 bg-[#0a0a0a] rounded-lg border border-gray-800 relative group">
                      {payments.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removePaymentMethod(index)}
                          className="absolute -top-2 -right-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Eliminar método de pago"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      )}
                      <div className="flex gap-2">
                        <select
                          value={payment.method}
                          onChange={(e) => updatePayment(index, 'method', e.target.value)}
                          className="flex-1 h-10 rounded-md border border-gray-700 bg-[#151515] px-3 text-sm text-white focus:outline-none focus:border-[var(--color-voltage)]"
                        >
                          <option value="cash">Efectivo</option>
                          <option value="card">Tarjeta</option>
                          <option value="transfer_nequi">Nequi</option>
                          <option value="transfer_bancolombia">Bancolombia</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            type="number"
                            placeholder="Monto"
                            value={payment.amount}
                            onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                            className="pl-7 h-10 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)]"
                          />
                        </div>
                      </div>
                      {payment.method !== 'cash' && (
                        <Input
                          placeholder="Referencia (Ej. últimos 4 dígitos o voucher)"
                          value={payment.reference}
                          onChange={(e) => updatePayment(index, 'reference', e.target.value)}
                          className="h-9 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)] text-sm"
                        />
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    onClick={addPaymentMethod}
                    className="w-full h-9 border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Dividir Pago (Otro método)
                  </Button>
                </div>
              )}
            </div>

            {!isCreditSale && payments.length > 1 && (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-800">
                <span className="text-gray-400">Restante por pagar:</span>
                <span className={`font-semibold ${remainingToPay > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(Math.max(0, remainingToPay))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
            <Button 
              onClick={() => {
                setIsCheckoutModalOpen(false)
                clearCart()
              }} 
              disabled={!isCreditSale && remainingToPay > 0}
              className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
            >
              {isCreditSale ? 'Confirmar Fiado' : 'Finalizar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
