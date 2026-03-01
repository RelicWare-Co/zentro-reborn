import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Filter,
	Image as ImageIcon,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	createProduct,
	deleteProduct,
	getCategories,
	getProducts,
} from "@/features/products/products.functions";

type Product = Awaited<ReturnType<typeof getProducts>>[number];

const PRODUCT_QUERY_KEY = ["products"];
const CATEGORY_QUERY_KEY = ["product-categories"];

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

const EMPTY_NEW_PRODUCT = {
	name: "",
	categoryId: "",
	sku: "",
	price: "",
	cost: "0",
	taxRate: "0",
	stock: "0",
};

export const Route = createFileRoute("/products")({
	loader: () => getProducts(),
	component: ProductsPage,
});

function ProductsPage() {
	const queryClient = useQueryClient();
	const loaderProducts = Route.useLoaderData();
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState({});
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
	const nameId = useId();
	const categoryId = useId();
	const skuId = useId();
	const priceId = useId();
	const costId = useId();
	const taxRateId = useId();
	const stockId = useId();

	const { data: products = loaderProducts } = useQuery({
		queryKey: PRODUCT_QUERY_KEY,
		queryFn: () => getProducts(),
		initialData: loaderProducts,
	});

	const { data: categories = [] } = useQuery({
		queryKey: CATEGORY_QUERY_KEY,
		queryFn: () => getCategories(),
	});

	const createProductMutation = useMutation({
		mutationFn: (payload: {
			name: string;
			categoryId: string | null;
			sku: string | null;
			price: number;
			cost: number;
			taxRate: number;
			stock: number;
		}) => createProduct({ data: payload }),
		onSuccess: async () => {
			setIsAddDialogOpen(false);
			setNewProduct(EMPTY_NEW_PRODUCT);
			await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
		},
	});

	const deleteProductMutation = useMutation({
		mutationFn: (id: string) => deleteProduct({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
		},
	});

	const handleAddProduct = async (e: React.FormEvent) => {
		e.preventDefault();
		await createProductMutation.mutateAsync({
			name: newProduct.name,
			categoryId: newProduct.categoryId || null,
			sku: newProduct.sku || null,
			price: Number(newProduct.price),
			cost: Number(newProduct.cost),
			taxRate: Number(newProduct.taxRate),
			stock: Number(newProduct.stock),
		});
	};

	const columns = useMemo<ColumnDef<Product>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
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
				accessorKey: "name",
				header: "ITEM",
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center shrink-0">
							<ImageIcon className="h-5 w-5 text-gray-500" />
						</div>
						<span className="font-medium text-[var(--color-photon)]">
							{row.getValue("name")}
						</span>
					</div>
				),
			},
			{
				accessorKey: "categoryName",
				header: "CATEGORY",
				cell: ({ row }) => (
					<span className="text-gray-400">
						{(row.getValue("categoryName") as string | null) ?? "Sin categoría"}
					</span>
				),
			},
			{
				accessorKey: "sku",
				header: "SKU",
				cell: ({ row }) => (
					<span className="text-gray-400">
						{(row.getValue("sku") as string | null) ?? "-"}
					</span>
				),
			},
			{
				accessorKey: "stock",
				header: "STOCK",
				cell: ({ row }) => {
					const stock = row.getValue("stock") as number;
					return (
						<div className="flex items-center gap-2">
							<span className="text-gray-300">{stock}</span>
							{stock === 0 ? (
								<span className="text-red-400 text-xs font-medium">
									Out of stock
								</span>
							) : stock < 100 ? (
								<span className="text-yellow-400 text-xs font-medium">
									low stock
								</span>
							) : null}
						</div>
					);
				},
			},
			{
				accessorKey: "price",
				header: "UNIT PRICE",
				cell: ({ row }) => (
					<span className="text-gray-300">
						{formatCurrency(row.getValue("price") as number)}
					</span>
				),
			},
			{
				id: "actions",
				header: "ACTION",
				cell: ({ row }) => {
					const currentProduct = row.original;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="h-8 w-8 p-0 text-gray-500 hover:text-[var(--color-photon)] hover:bg-white/10"
								>
									<span className="sr-only">Open menu</span>
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="bg-[var(--color-carbon)] border-gray-800 text-[var(--color-photon)]"
							>
								<DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
									Edit
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
									onClick={() =>
										deleteProductMutation.mutate(currentProduct.id)
									}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[deleteProductMutation],
	);

	const table = useReactTable({
		data: products,
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
	});

	const createError =
		createProductMutation.error instanceof Error
			? createProductMutation.error.message
			: null;

	return (
		<main className="flex-1 p-6 md:p-8 lg:p-12 space-y-6 bg-[var(--color-void)] text-[var(--color-photon)] font-sans">
			<div className="flex items-baseline gap-3">
				<h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
				<span className="text-gray-400 text-sm">
					({products.length} inventory)
				</span>
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
						<Input
							placeholder="Search for inventory"
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="pl-9 bg-[var(--color-carbon)] border-gray-800 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 w-full sm:w-[250px] rounded-lg"
						/>
					</div>

					<Button
						variant="outline"
						className="bg-[var(--color-carbon)] border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg"
					>
						<Filter className="h-4 w-4 mr-2" />
						Filter
					</Button>

					<Select
						value={
							(table.getColumn("categoryName")?.getFilterValue() as
								| string
								| undefined) ?? "all"
						}
						onValueChange={(value) => {
							table
								.getColumn("categoryName")
								?.setFilterValue(value === "all" ? undefined : value);
						}}
					>
						<SelectTrigger className="w-[160px] bg-[var(--color-carbon)] border-gray-800 text-gray-300 rounded-lg hidden sm:flex">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
							<SelectItem value="all">All</SelectItem>
							{categories.map((item) => (
								<SelectItem key={item.id} value={item.name}>
									{item.name}
								</SelectItem>
							))}
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
					<DialogContent className="sm:max-w-[500px] bg-[var(--color-carbon)] border-gray-800 text-white rounded-xl">
						<DialogHeader>
							<DialogTitle className="text-xl">Create Product</DialogTitle>
							<DialogDescription className="text-gray-400">
								Add a new product to your inventory.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleAddProduct} className="space-y-4 pt-4">
							<div className="space-y-2">
								<Label htmlFor={nameId} className="text-gray-300">
									Name
								</Label>
								<Input
									id={nameId}
									value={newProduct.name}
									onChange={(e) =>
										setNewProduct({ ...newProduct, name: e.target.value })
									}
									placeholder="e.g., Capuccino"
									className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor={categoryId} className="text-gray-300">
										Category
									</Label>
									<Select
										value={newProduct.categoryId || "none"}
										onValueChange={(value) =>
											setNewProduct({
												...newProduct,
												categoryId: value === "none" ? "" : value,
											})
										}
									>
										<SelectTrigger
											id={categoryId}
											className="bg-transparent border-gray-700 text-white focus:border-[var(--color-voltage)] focus:ring-[var(--color-voltage)]/20"
										>
											<SelectValue placeholder="Selecciona categoría" />
										</SelectTrigger>
										<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
											<SelectItem value="none">Sin categoría</SelectItem>
											{categories.map((item) => (
												<SelectItem key={item.id} value={item.id}>
													{item.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor={skuId} className="text-gray-300">
										SKU
									</Label>
									<Input
										id={skuId}
										value={newProduct.sku}
										onChange={(e) =>
											setNewProduct({ ...newProduct, sku: e.target.value })
										}
										placeholder="e.g., COF-CAP-001"
										className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor={priceId} className="text-gray-300">
										Unit Price (COP)
									</Label>
									<Input
										id={priceId}
										type="number"
										step="0.01"
										min={0}
										value={newProduct.price}
										onChange={(e) =>
											setNewProduct({ ...newProduct, price: e.target.value })
										}
										placeholder="0"
										className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={costId} className="text-gray-300">
										Cost (COP)
									</Label>
									<Input
										id={costId}
										type="number"
										min={0}
										value={newProduct.cost}
										onChange={(e) =>
											setNewProduct({ ...newProduct, cost: e.target.value })
										}
										placeholder="0"
										className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor={taxRateId} className="text-gray-300">
										Tax Rate (%)
									</Label>
									<Input
										id={taxRateId}
										type="number"
										min={0}
										max={100}
										value={newProduct.taxRate}
										onChange={(e) =>
											setNewProduct({ ...newProduct, taxRate: e.target.value })
										}
										placeholder="0"
										className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={stockId} className="text-gray-300">
										Initial Stock
									</Label>
									<Input
										id={stockId}
										type="number"
										min={0}
										value={newProduct.stock}
										onChange={(e) =>
											setNewProduct({ ...newProduct, stock: e.target.value })
										}
										placeholder="0"
										className="bg-transparent border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
										required
									/>
								</div>
							</div>

							{createError && (
								<p className="text-sm font-medium text-red-400">
									{createError}
								</p>
							)}

							<DialogFooter className="mt-6 border-t border-gray-800 pt-4 bg-transparent sm:justify-end">
								<Button
									type="submit"
									disabled={createProductMutation.isPending}
									className="w-full sm:w-auto bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg"
								>
									{createProductMutation.isPending
										? "Saving..."
										: "Save Product"}
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
							<TableRow
								key={headerGroup.id}
								className="border-gray-800 hover:bg-transparent"
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="text-gray-400 font-medium text-xs uppercase tracking-wider h-12"
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
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
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-32 text-center text-gray-500"
								>
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
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
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
							{table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
								1}
							-
							{Math.min(
								(table.getState().pagination.pageIndex + 1) *
									table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length,
							)}{" "}
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
	);
}
