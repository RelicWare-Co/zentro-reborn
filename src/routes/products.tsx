import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Plus, Search, MoreHorizontal, Filter, Image as ImageIcon } from 'lucide-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

type Product = {
  id: string
  name: string
  category: string
  sku: string
  incoming: number
  stock: number
  price: number
}

const initialProducts: Product[] = [
  { id: '1', name: 'Computer paper', category: 'Finished Good', sku: 'FG758949', incoming: 45, stock: 463, price: 56.99 },
  { id: '2', name: 'Linen paper', category: 'Raw material', sku: 'FH85T940', incoming: 56, stock: 463, price: 167.99 },
  { id: '3', name: 'Smooth cardstock', category: 'Finished Good', sku: 'W748939', incoming: 123, stock: 0, price: 747.99 },
  { id: '4', name: 'Marble cardstock', category: 'Raw Material', sku: 'GFD7890', incoming: 35, stock: 463, price: 34.76 },
  { id: '5', name: 'Canvas cardstock', category: 'Finished Good', sku: 'K849035', incoming: 149, stock: 463, price: 345.45 },
  { id: '6', name: 'ProVisionary Solutions', category: 'Raw Material', sku: 'L748395', incoming: 138, stock: 90, price: 34.00 },
  { id: '7', name: 'ProdigyPlus Professional', category: 'Raw Material', sku: '7383R000', incoming: 36, stock: 463, price: 134.00 },
  { id: '8', name: 'VanguardPro', category: 'Raw Material', sku: 'FG758949', incoming: 275, stock: 50, price: 234.76 },
  { id: '9', name: 'SerenitySphere', category: 'Finished Good', sku: 'HL000089', incoming: 264, stock: 463, price: 234.76 },
  { id: '10', name: 'Innovative Imaginings', category: 'Finished Good', sku: 'HL000089', incoming: 264, stock: 463, price: 234.76 },
  { id: '11', name: 'Café Espresso', category: 'Finished Good', sku: 'COF-ESP-001', incoming: 0, stock: 150, price: 4.50 },
  { id: '12', name: 'Croissant', category: 'Finished Good', sku: 'BAK-CRO-001', incoming: 12, stock: 45, price: 6.00 },
  { id: '13', name: 'Jugo de Naranja', category: 'Finished Good', sku: 'BEV-ORG-001', incoming: 5, stock: 30, price: 7.00 },
]

function ProductsPage() {
  const [data, setData] = useState<Product[]>(initialProducts)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    sku: '',
    incoming: '',
    stock: '',
    price: '',
  })

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    
    const productToAdd: Product = {
      id: Math.random().toString(36).substring(7),
      name: newProduct.name,
      category: newProduct.category || 'Uncategorized',
      sku: newProduct.sku,
      incoming: parseInt(newProduct.incoming) || 0,
      stock: parseInt(newProduct.stock) || 0,
      price: parseFloat(newProduct.price) || 0,
    }

    setData([...data, productToAdd])
    setIsAddDialogOpen(false)
    setNewProduct({ name: '', category: '', sku: '', incoming: '', stock: '', price: '' })
  }

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((p) => p.id !== id))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'ITEM',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center shrink-0">
              <ImageIcon className="h-5 w-5 text-gray-500" />
            </div>
            <span className="font-medium text-[var(--color-photon)]">{row.getValue('name')}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'category',
      header: 'CATEGORY',
      cell: ({ row }) => <span className="text-gray-400">{row.getValue('category')}</span>,
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="text-gray-400">{row.getValue('sku')}</span>,
    },
    {
      accessorKey: 'incoming',
      header: 'INCOMING',
      cell: ({ row }) => <span className="text-gray-400">{row.getValue('incoming')}</span>,
    },
    {
      accessorKey: 'stock',
      header: 'STOCK',
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-300">{stock}</span>
            {stock === 0 ? (
              <span className="text-red-400 text-xs font-medium">Out of stock</span>
            ) : stock < 100 ? (
              <span className="text-yellow-400 text-xs font-medium">low stock</span>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: 'price',
      header: 'UNIT PRICE',
      cell: ({ row }) => {
        return <span className="text-gray-300">{formatCurrency(row.getValue('price'))}</span>
      },
    },
    {
      id: 'actions',
      header: 'ACTION',
      cell: ({ row }) => {
        const product = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-[var(--color-photon)] hover:bg-white/10">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--color-carbon)] border-gray-800 text-[var(--color-photon)]">
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
                onClick={() => handleDelete(product.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <main className="flex-1 p-6 md:p-8 lg:p-12 space-y-6 bg-[var(--color-void)] text-[var(--color-photon)] font-sans">
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <span className="text-gray-400 text-sm">({data.length} inventory)</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search for inventory"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-[var(--color-carbon)] border-gray-800 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 w-full sm:w-[250px] rounded-lg"
            />
          </div>
          
          <Button variant="outline" className="bg-[var(--color-carbon)] border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>

          <Select>
            <SelectTrigger className="w-[130px] bg-[var(--color-carbon)] border-gray-800 text-gray-300 rounded-lg hidden sm:flex">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="raw">Raw Material</SelectItem>
              <SelectItem value="finished">Finished Good</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[130px] bg-[var(--color-carbon)] border-gray-800 text-gray-300 rounded-lg hidden sm:flex">
              <SelectValue placeholder="Stock alert" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[var(--color-carbon)] border-gray-800 text-white rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Product</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new product to your inventory.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Capuccino"
                  className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-300">Category</Label>
                  <Input
                    id="category"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    placeholder="e.g., Finished Good"
                    className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-gray-300">SKU</Label>
                  <Input
                    id="sku"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="e.g., COF-CAP-001"
                    className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-gray-300">Unit Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                    className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incoming" className="text-gray-300">Incoming</Label>
                  <Input
                    id="incoming"
                    type="number"
                    value={newProduct.incoming}
                    onChange={(e) => setNewProduct({ ...newProduct, incoming: e.target.value })}
                    placeholder="0"
                    className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-gray-300">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="0"
                  className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
                  required
                />
              </div>
              <DialogFooter className="mt-6 border-t border-gray-800 pt-4 bg-transparent sm:justify-end">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg"
                >
                  Save Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-[var(--color-carbon)] rounded-xl border border-gray-800 overflow-x-auto">
        <Table className="w-full whitespace-nowrap">
          <TableHeader className="bg-black/20 border-b border-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-gray-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-gray-400 font-medium text-xs uppercase tracking-wider h-12">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-gray-800 hover:bg-white/5 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-800 text-sm text-gray-400 bg-black/10 gap-4 sm:gap-0">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px] bg-[var(--color-carbon)] border-gray-700 text-white rounded-md">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>row</span>
            </div>
            
            <div className="hidden sm:block">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 bg-[var(--color-carbon)] text-gray-300 hover:bg-white/5 hover:text-white rounded-md h-8 px-3"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-medium border-none rounded-md h-8 px-4"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
