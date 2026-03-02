import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Edit3, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { DeleteProductDialog } from "@/features/products/components/delete-product-dialog";
import { ProductFormSheet } from "@/features/products/components/product-form-sheet";
import { getProductsColumns } from "@/features/products/components/products-table-columns";
import type { Category, Product } from "@/features/products/hooks/use-products";
import {
	useProductsMutations,
	useProductsQueries,
} from "@/features/products/hooks/use-products";
import { getProducts } from "@/features/products/products.functions";

export const Route = createFileRoute("/_auth/products")({
	loader: () => getProducts(),
	component: ProductsPage,
});

function ProductsPage() {
	const loaderProducts = Route.useLoaderData();
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState({});
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [productToDelete, setProductToDelete] = useState<string | null>(null);
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	const [categoryName, setCategoryName] = useState("");
	const [categoryDescription, setCategoryDescription] = useState("");
	const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
	const [selectedProductForInventory, setSelectedProductForInventory] =
		useState<Product | null>(null);
	const [inventoryMovementType, setInventoryMovementType] = useState<
		"restock" | "waste" | "adjustment"
	>("restock");
	const [inventoryMovementQuantity, setInventoryMovementQuantity] =
		useState("");
	const [inventoryMovementNotes, setInventoryMovementNotes] = useState("");

	const categoryNameId = useId();
	const categoryDescriptionId = useId();
	const inventoryTypeId = useId();
	const inventoryQuantityId = useId();
	const inventoryNotesId = useId();

	const { products, categories } = useProductsQueries(loaderProducts);

	const closeSheet = useCallback(() => {
		setIsSheetOpen(false);
		setEditingProduct(null);
	}, []);

	const {
		createProductMutation,
		updateProductMutation,
		deleteProductMutation,
		createCategoryMutation,
		updateCategoryMutation,
		deleteCategoryMutation,
		registerInventoryMovementMutation,
	} = useProductsMutations({
		onSuccess: () => {
			closeSheet();
			setProductToDelete(null);
		},
	});

	const openEditSheet = useCallback((product: Product) => {
		setEditingProduct(product);
		setIsSheetOpen(true);
	}, []);

	const columns = useMemo(
		() =>
			getProductsColumns({
				onEdit: openEditSheet,
				onDelete: setProductToDelete,
				onAdjustStock: (product) => {
					setSelectedProductForInventory(product);
					setInventoryMovementType("restock");
					setInventoryMovementQuantity("");
					setInventoryMovementNotes("");
					setIsInventoryDialogOpen(true);
				},
			}),
		[openEditSheet],
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

	const formError =
		createProductMutation.error instanceof Error
			? createProductMutation.error.message
			: updateProductMutation.error instanceof Error
				? updateProductMutation.error.message
				: null;

	const categoryFormError =
		createCategoryMutation.error instanceof Error
			? createCategoryMutation.error.message
			: updateCategoryMutation.error instanceof Error
				? updateCategoryMutation.error.message
				: deleteCategoryMutation.error instanceof Error
					? deleteCategoryMutation.error.message
					: null;

	const inventoryMovementError =
		registerInventoryMovementMutation.error instanceof Error
			? registerInventoryMovementMutation.error.message
			: null;

	const isPending =
		createProductMutation.isPending || updateProductMutation.isPending;

	const handleSaveProduct = async (payload: {
		id?: string;
		name: string;
		categoryId: string | null;
		sku: string | null;
		barcode: string | null;
		price: number;
		cost: number;
		taxRate: number;
		stock: number;
		trackInventory: boolean;
		isModifier: boolean;
	}) => {
		if (payload.id) {
			await updateProductMutation.mutateAsync({
				...payload,
				id: payload.id,
			});
		} else {
			await createProductMutation.mutateAsync(payload);
		}
	};

	const handleDeleteProduct = () => {
		if (productToDelete) {
			deleteProductMutation.mutate(productToDelete);
		}
	};

	const selectedCategory = useMemo(
		() => categories.find((item) => item.id === selectedCategoryId) ?? null,
		[categories, selectedCategoryId],
	);

	const openCreateCategoryDialog = () => {
		setSelectedCategoryId("");
		setCategoryName("");
		setCategoryDescription("");
		setIsCategoryDialogOpen(true);
	};

	const openEditCategoryDialog = (category: Category) => {
		setSelectedCategoryId(category.id);
		setCategoryName(category.name);
		setCategoryDescription(category.description ?? "");
		setIsCategoryDialogOpen(true);
	};

	const handleCreateCategory = async () => {
		await createCategoryMutation.mutateAsync({
			name: categoryName,
			description: categoryDescription || null,
		});
		setSelectedCategoryId("");
		setCategoryName("");
		setCategoryDescription("");
		setIsCategoryDialogOpen(false);
	};

	const handleUpdateCategory = async () => {
		if (!selectedCategoryId) {
			return;
		}

		await updateCategoryMutation.mutateAsync({
			id: selectedCategoryId,
			name: categoryName,
			description: categoryDescription || null,
		});
		setIsCategoryDialogOpen(false);
	};

	const handleDeleteCategory = async () => {
		if (!selectedCategoryId) {
			return;
		}

		await deleteCategoryMutation.mutateAsync(selectedCategoryId);
		setSelectedCategoryId("");
		setCategoryName("");
		setCategoryDescription("");
		setIsCategoryDialogOpen(false);
	};

	const handleRegisterInventoryMovement = async () => {
		if (!selectedProductForInventory) {
			return;
		}

		const parsedQuantity = Number(inventoryMovementQuantity);
		if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
			return;
		}

		await registerInventoryMovementMutation.mutateAsync({
			productId: selectedProductForInventory.id,
			type: inventoryMovementType,
			quantity: Math.round(parsedQuantity),
			notes: inventoryMovementNotes.trim() || null,
		});

		setIsInventoryDialogOpen(false);
		setSelectedProductForInventory(null);
		setInventoryMovementQuantity("");
		setInventoryMovementNotes("");
	};

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

				<Button
					className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
					onClick={() => setIsSheetOpen(true)}
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Product
				</Button>

				<Button
					variant="outline"
					className="bg-[var(--color-carbon)] border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg"
					onClick={openCreateCategoryDialog}
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Category
				</Button>

				<ProductFormSheet
					isOpen={isSheetOpen}
					onOpenChange={(open) => {
						if (!open) {
							closeSheet();
						} else {
							setIsSheetOpen(true);
						}
					}}
					editingProduct={editingProduct}
					categories={categories}
					onSave={handleSaveProduct}
					isPending={isPending}
					error={formError}
				/>
			</div>

			<div className="flex flex-wrap gap-2">
				{categories.map((category) => (
					<Button
						key={category.id}
						variant="outline"
						className="h-8 border-gray-800 text-gray-300 hover:text-white"
						onClick={() => openEditCategoryDialog(category)}
					>
						<Edit3 className="h-3.5 w-3.5 mr-1.5" />
						{category.name}
					</Button>
				))}
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

			<DeleteProductDialog
				productId={productToDelete}
				onOpenChange={(open) => {
					if (!open) setProductToDelete(null);
				}}
				onConfirm={handleDeleteProduct}
				isPending={deleteProductMutation.isPending}
			/>

			<Dialog
				open={isCategoryDialogOpen}
				onOpenChange={setIsCategoryDialogOpen}
			>
				<DialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white sm:max-w-[480px]">
					<DialogHeader>
						<DialogTitle>
							{selectedCategory ? "Edit Category" : "Create Category"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor={categoryNameId}>Name</Label>
							<Input
								id={categoryNameId}
								value={categoryName}
								onChange={(event) => setCategoryName(event.target.value)}
								placeholder="Category name"
								className="bg-black/20 border-gray-700"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={categoryDescriptionId}>Description</Label>
							<Textarea
								id={categoryDescriptionId}
								value={categoryDescription}
								onChange={(event) => setCategoryDescription(event.target.value)}
								placeholder="Optional"
								className="min-h-[72px] bg-black/20 border-gray-700"
							/>
						</div>
						{categoryFormError && (
							<p className="text-sm text-red-400">{categoryFormError}</p>
						)}
					</div>
					<DialogFooter className="gap-2 sm:justify-between">
						{selectedCategory ? (
							<Button
								variant="outline"
								onClick={handleDeleteCategory}
								disabled={deleteCategoryMutation.isPending}
								className="border-red-900/40 text-red-400 hover:bg-red-900/20"
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								variant="ghost"
								onClick={() => setIsCategoryDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={
									selectedCategory ? handleUpdateCategory : handleCreateCategory
								}
								disabled={
									!categoryName.trim() ||
									createCategoryMutation.isPending ||
									updateCategoryMutation.isPending
								}
								className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
							>
								{selectedCategory ? "Save" : "Create"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isInventoryDialogOpen}
				onOpenChange={(open) => {
					setIsInventoryDialogOpen(open);
					if (!open) {
						setSelectedProductForInventory(null);
					}
				}}
			>
				<DialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white sm:max-w-[480px]">
					<DialogHeader>
						<DialogTitle>
							Adjust Stock · {selectedProductForInventory?.name}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor={inventoryTypeId}>Movement type</Label>
							<Select
								value={inventoryMovementType}
								onValueChange={(value) =>
									setInventoryMovementType(
										value as "restock" | "waste" | "adjustment",
									)
								}
							>
								<SelectTrigger
									id={inventoryTypeId}
									className="bg-black/20 border-gray-700 text-white"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
									<SelectItem value="restock">Restock</SelectItem>
									<SelectItem value="waste">Waste</SelectItem>
									<SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={inventoryQuantityId}>Quantity</Label>
							<Input
								id={inventoryQuantityId}
								type="number"
								value={inventoryMovementQuantity}
								onChange={(event) =>
									setInventoryMovementQuantity(event.target.value)
								}
								placeholder={
									inventoryMovementType === "adjustment"
										? "Ej: 5 o -3"
										: "Ej: 5"
								}
								className="bg-black/20 border-gray-700"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={inventoryNotesId}>Notes</Label>
							<Textarea
								id={inventoryNotesId}
								value={inventoryMovementNotes}
								onChange={(event) =>
									setInventoryMovementNotes(event.target.value)
								}
								placeholder="Optional"
								className="min-h-[72px] bg-black/20 border-gray-700"
							/>
						</div>
						{inventoryMovementError && (
							<p className="text-sm text-red-400">{inventoryMovementError}</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsInventoryDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRegisterInventoryMovement}
							disabled={
								!inventoryMovementQuantity.trim() ||
								registerInventoryMovementMutation.isPending
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{registerInventoryMovementMutation.isPending
								? "Saving..."
								: "Apply movement"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
