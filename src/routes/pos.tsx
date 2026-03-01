import { createFileRoute } from '@tanstack/react-router'
import { Image as ImageIcon, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/pos')({
  component: PosPage,
})

type Product = {
  id: string
  name: string
  category: string
  price: number
  image?: string
}

type CartItem = {
  product: Product
  quantity: number
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
  const [discount, setDiscount] = useState(50000)

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

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id)
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta
            return { ...item, quantity: newQuantity > 0 ? newQuantity : 0 }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }

  const clearCart = () => setCart([])

  const getProductQuantity = (productId: string) => {
    const item = cart.find((item) => item.product.id === productId)
    return item ? item.quantity : 0
  }

  const subTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const tax = subTotal * 0.1 // 10% tax based on the image
  const totalAmount = subTotal + tax - discount > 0 ? subTotal + tax - discount : 0

  return (
    <div className="flex h-full w-full bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
      {/* Left Panel: Menu */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800 h-full">
        {/* Header / Categories */}
        <div className="p-6 pb-2 space-y-6 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">List Menu</h1>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-[var(--color-carbon)] border-gray-800 text-white placeholder:text-gray-600 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 rounded-xl transition-all"
              />
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-xl px-6 h-10 font-medium transition-all ${
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

        {/* Product Grid */}
        <ScrollArea className="flex-1 px-6 pb-6 min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-6">
            {filteredProducts.map((product) => {
              const qty = getProductQuantity(product.id)
              return (
                <div
                  key={product.id}
                  className="bg-[#151515] rounded-2xl p-3 border border-gray-800 flex flex-col gap-3 transition-all hover:border-gray-700 group hover:bg-[#1a1a1a]"
                >
                  <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center relative">
                    <ImageIcon className="h-10 w-10 text-gray-800" />
                  </div>
                  
                  <div className="flex flex-col min-w-0 flex-1 px-1">
                    <h3 className="font-semibold text-[15px] truncate text-white" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{product.category}</p>
                    <p className="font-bold text-[15px] mt-2 text-[var(--color-voltage)]">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between bg-black/40 rounded-xl p-1 mt-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQuantity(product.id, -1)}
                      disabled={qty === 0}
                      className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-all"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-[15px] w-8 text-center text-white">{qty}</span>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => addToCart(product)}
                      className="h-8 w-8 rounded-lg bg-[var(--color-voltage)] text-black hover:bg-[#c9e605] shadow-sm transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>No se encontraron productos.</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel: Order Detail */}
      <div className="w-[400px] bg-[var(--color-carbon)] flex flex-col shrink-0 h-full">
        {/* Order Header */}
        <div className="p-6 pb-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Detalle de Orden</h2>
            <p className="text-sm text-gray-400 mt-1">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} artículos seleccionados
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-medium h-9 px-3 rounded-lg transition-all"
          >
            Limpiar Todo
          </Button>
        </div>

        {/* Selected Items */}
        <ScrollArea className="flex-1 px-6 py-2 min-h-0">
          <div className="space-y-1 py-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-4 py-3 group border-b border-gray-800/50 last:border-0">
                <div className="h-16 w-16 bg-gray-900 rounded-xl flex items-center justify-center shrink-0 border border-gray-800">
                  <ImageIcon className="h-6 w-6 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-[15px] text-white truncate leading-tight">
                      {item.product.name}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1 -mt-1 -mr-1 rounded-md hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-sm text-gray-400 font-medium">
                      {item.quantity} <span className="text-gray-600">x</span> {formatCurrency(item.product.price)}
                    </div>
                    <div className="font-bold text-[15px] text-white">
                      {formatCurrency(item.product.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <p>El carrito está vacío</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Payment Summary */}
        <div className="p-6 bg-[#111111] border-t border-gray-800 shrink-0">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 text-white">Resumen de Pago</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-[15px] text-gray-400 font-medium">
                <span>Sub Total</span>
                <span className="text-white">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between text-[15px] text-gray-400 font-medium">
                <span>Impuesto (10%)</span>
                <span className="text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-[15px] text-gray-400 font-medium">
                <span>Descuento</span>
                <span className="text-red-400">-{formatCurrency(discount)}</span>
              </div>
              
              <Separator className="my-4 border-gray-800" />
              
              <div className="flex justify-between items-center">
                <span className="font-bold text-[16px] text-white">Monto Total</span>
                <span className="font-bold text-2xl text-[var(--color-voltage)]">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Input
                placeholder="Código promocional"
                defaultValue="MakanSepuasnya"
                className="h-12 bg-black/40 border-gray-800 text-white focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 rounded-xl"
              />
              <Button variant="secondary" className="h-12 px-6 bg-gray-800 hover:bg-gray-700 text-white border-0 rounded-xl font-semibold transition-colors">
                Aplicar
              </Button>
            </div>

            <Button 
              className="w-full h-14 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-bold text-[16px] rounded-xl mt-4 transition-all shadow-sm"
              disabled={cart.length === 0}
            >
              Procesar Pago
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
