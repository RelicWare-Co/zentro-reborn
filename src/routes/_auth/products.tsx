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
import {
	ChevronsUpDown,
	Edit3,
	Filter,
	PackagePlus,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/products")({
	loader: () => getProducts(),
	component: ProductsPage,
});

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});

const normalizeSearchTerm = (value: string) => value.trim().toLowerCase();

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
	const [isInventoryEntryDialogOpen, setIsInventoryEntryDialogOpen] =
		useState(false);
	const [isInventoryEntryPickerOpen, setIsInventoryEntryPickerOpen] =
		useState(false);
	const [inventoryEntrySearch, setInventoryEntrySearch] = useState("");
	const [
		selectedProductForInventoryEntry,
		setSelectedProductForInventoryEntry,
	] = useState<Product | null>(null);
	const [inventoryEntryQuantity, setInventoryEntryQuantity] = useState("");
	const [inventoryEntryCost, setInventoryEntryCost] = useState("");
	const [inventoryEntryPrice, setInventoryEntryPrice] = useState("");
	const [inventoryEntryError, setInventoryEntryError] = useState<string | null>(
		null,
	);

	const categoryNameId = useId();
	const categoryDescriptionId = useId();
	const inventoryTypeId = useId();
	const inventoryQuantityId = useId();
	const inventoryNotesId = useId();
	const inventoryEntrySearchId = useId();
	const inventoryEntryQuantityId = useId();
	const inventoryEntryCostId = useId();
	const inventoryEntryPriceId = useId();

	const { products, categories } = useProductsQueries(loaderProducts);
	const trackedProducts = useMemo(
		() => products.filter((product) => product.trackInventory),
		[products],
	);

	const filteredInventoryEntryProducts = useMemo(() => {
		const query = normalizeSearchTerm(inventoryEntrySearch);
		if (!query) {
			return trackedProducts.slice(0, 8);
		}

		return trackedProducts
			.filter((product) =>
				[product.name, product.sku, product.barcode]
					.filter(Boolean)
					.some((field) =>
						field ? field.toLowerCase().includes(query) : false,
					),
			)
			.slice(0, 8);
	}, [inventoryEntrySearch, trackedProducts]);

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

	const resetInventoryEntryForm = useCallback(() => {
		setInventoryEntrySearch("");
		setSelectedProductForInventoryEntry(null);
		setInventoryEntryQuantity("");
		setInventoryEntryCost("");
		setInventoryEntryPrice("");
		setInventoryEntryError(null);
		setIsInventoryEntryPickerOpen(false);
	}, []);

	const openInventoryEntryDialog = useCallback(
		(product?: Product) => {
			resetInventoryEntryForm();
			if (product) {
				setSelectedProductForInventoryEntry(product);
				setInventoryEntrySearch(product.name);
				setInventoryEntryCost(String(product.cost ?? 0));
				setInventoryEntryPrice(String(product.price ?? 0));
			}
			setIsInventoryEntryDialogOpen(true);
		},
		[resetInventoryEntryForm],
	);

	const selectInventoryEntryProduct = useCallback((product: Product) => {
		setSelectedProductForInventoryEntry(product);
		setInventoryEntrySearch(product.name);
		setInventoryEntryCost(String(product.cost ?? 0));
		setInventoryEntryPrice(String(product.price ?? 0));
		setInventoryEntryError(null);
		setIsInventoryEntryPickerOpen(false);
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

	const inventoryEntryQuantityValue = Number(inventoryEntryQuantity);
	const nextInventoryStockTotal =
		selectedProductForInventoryEntry &&
		Number.isFinite(inventoryEntryQuantityValue) &&
		inventoryEntryQuantityValue > 0
			? selectedProductForInventoryEntry.stock +
				Math.trunc(inventoryEntryQuantityValue)
			: (selectedProductForInventoryEntry?.stock ?? 0);
	const isInventoryEntryPending =
		registerInventoryMovementMutation.isPending ||
		updateProductMutation.isPending;

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

	const handleSaveInventoryEntry = async () => {
		if (!selectedProductForInventoryEntry) {
			setInventoryEntryError(
				"Selecciona un producto para registrar la entrada.",
			);
			return;
		}

		const parsedQuantity = Number(inventoryEntryQuantity);
		if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			setInventoryEntryError("Ingresa una cantidad entrante mayor a cero.");
			return;
		}

		const normalizedQuantity = Math.trunc(parsedQuantity);
		const parsedCost = Number(inventoryEntryCost);
		if (!Number.isFinite(parsedCost) || parsedCost < 0) {
			setInventoryEntryError("Ingresa un costo valido.");
			return;
		}

		let nextPrice: number | undefined;
		const parsedPrice = Number(inventoryEntryPrice);
		if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
			setInventoryEntryError("Ingresa un precio de venta valido.");
			return;
		}
		nextPrice = parsedPrice;

		setInventoryEntryError(null);

		try {
			const shouldUpdateCost =
				parsedCost !== selectedProductForInventoryEntry.cost;
			const shouldPersistPrice =
				nextPrice !== undefined &&
				nextPrice !== selectedProductForInventoryEntry.price;
			const resolvedPrice = shouldPersistPrice
				? (nextPrice ?? selectedProductForInventoryEntry.price)
				: selectedProductForInventoryEntry.price;

			if (shouldUpdateCost || shouldPersistPrice) {
				await updateProductMutation.mutateAsync({
					id: selectedProductForInventoryEntry.id,
					name: selectedProductForInventoryEntry.name,
					categoryId: selectedProductForInventoryEntry.categoryId,
					sku: selectedProductForInventoryEntry.sku,
					barcode: selectedProductForInventoryEntry.barcode,
					price: resolvedPrice,
					cost: shouldUpdateCost
						? parsedCost
						: selectedProductForInventoryEntry.cost,
					taxRate: selectedProductForInventoryEntry.taxRate,
					stock: selectedProductForInventoryEntry.stock,
					trackInventory: selectedProductForInventoryEntry.trackInventory,
					isModifier: selectedProductForInventoryEntry.isModifier,
				});
			}

			await registerInventoryMovementMutation.mutateAsync({
				productId: selectedProductForInventoryEntry.id,
				type: "restock",
				quantity: normalizedQuantity,
				notes: null,
			});

			setIsInventoryEntryDialogOpen(false);
			resetInventoryEntryForm();
		} catch (error) {
			setInventoryEntryError(
				error instanceof Error
					? error.message
					: "No fue posible guardar la entrada de inventario.",
			);
		}
	};

	return (
		<main className="flex-1 p-6 md:p-8 lg:p-12 space-y-6 bg-[var(--color-void)] text-[var(--color-photon)] font-sans">
			<div className="flex items-baseline gap-3">
				<h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
				<span className="text-gray-400 text-sm">
					({products.length} productos, {categories.length} categorías)
				</span>
			</div>

			<Tabs defaultValue="products" className="w-full">
				<TabsList className="bg-[var(--color-carbon)] border border-gray-800 text-gray-400 mb-6">
					<TabsTrigger
						value="products"
						className="data-[state=active]:bg-[#c9e605] data-[state=active]:text-black"
					>
						Productos
					</TabsTrigger>
					<TabsTrigger
						value="categories"
						className="data-[state=active]:bg-[#c9e605] data-[state=active]:text-black"
					>
						Categorías
					</TabsTrigger>
				</TabsList>

				<TabsContent value="products" className="space-y-6 mt-0">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<Input
									placeholder="Buscar en inventario"
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
								Filtrar
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
									<SelectValue placeholder="Categoría" />
								</SelectTrigger>
								<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
									<SelectItem value="all">Todas</SelectItem>
									{categories.map((item) => (
										<SelectItem key={item.id} value={item.name}>
											{item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex w-full sm:w-auto sm:ml-auto items-center gap-3">
							<Button
								variant="outline"
								className="bg-[var(--color-carbon)] border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
								onClick={() => openInventoryEntryDialog()}
							>
								<PackagePlus className="w-4 h-4 mr-2" />
								Entrada de inventario
							</Button>

							<Button
								className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
								onClick={() => setIsSheetOpen(true)}
							>
								<Plus className="w-4 h-4 mr-2" />
							Agregar Producto
							</Button>
						</div>

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
											No se encontraron productos.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>

						<div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-800 text-sm text-gray-400 bg-black/10 gap-4 sm:gap-0">
							<div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
								<div className="flex items-center gap-2">
									<span>Mostrar</span>
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
									<span>filas</span>
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
									de {table.getFilteredRowModel().rows.length} resultados
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
									Anterior
								</Button>
								<Button
									variant="default"
									size="sm"
									className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-medium border-none rounded-md h-8 px-4"
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
								>
									Siguiente
								</Button>
							</div>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="categories" className="space-y-6 mt-0">
					<div className="flex justify-between items-center">
						<h2 className="text-xl font-semibold">Categorías</h2>
						<Button
							className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
							onClick={openCreateCategoryDialog}
						>
							<Plus className="w-4 h-4 mr-2" />
							Agregar Categoría
						</Button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{categories.map((category) => (
							<div
								key={category.id}
								className="bg-[var(--color-carbon)] rounded-xl border border-gray-800 p-4 flex flex-col justify-between hover:border-gray-700 transition-colors"
							>
								<div>
									<h3 className="font-medium text-lg text-white">
										{category.name}
									</h3>
									{category.description && (
										<p className="text-gray-400 text-sm mt-1">
											{category.description}
										</p>
									)}
								</div>
								<div className="mt-4 flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										className="h-8 border-gray-700 text-gray-300 hover:text-white"
										onClick={() => openEditCategoryDialog(category)}
									>
										<Edit3 className="h-3.5 w-3.5 mr-1.5" />
										Edit
									</Button>
								</div>
							</div>
						))}
						{categories.length === 0 && (
							<div className="col-span-full h-32 flex items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
								No se encontraron categorías. Haz clic en "Agregar Categoría" para crear una.
							</div>
						)}
					</div>
				</TabsContent>
			</Tabs>

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
							{selectedCategory ? "Editar Categoría" : "Crear Categoría"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor={categoryNameId}>Nombre</Label>
							<Input
								id={categoryNameId}
								value={categoryName}
								onChange={(event) => setCategoryName(event.target.value)}
								placeholder="Nombre de la categoría"
								className="bg-black/20 border-gray-700"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={categoryDescriptionId}>Descripción</Label>
							<Textarea
								id={categoryDescriptionId}
								value={categoryDescription}
								onChange={(event) => setCategoryDescription(event.target.value)}
								placeholder="Opcional"
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
								Eliminar
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								variant="ghost"
								onClick={() => setIsCategoryDialogOpen(false)}
						>
							Cancelar
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
				open={isInventoryEntryDialogOpen}
				onOpenChange={(open) => {
					setIsInventoryEntryDialogOpen(open);
					if (!open) {
						resetInventoryEntryForm();
					}
				}}
			>
				<DialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white sm:max-w-[640px]">
					<DialogHeader className="space-y-2">
						<DialogTitle className="text-2xl font-semibold">
							Entrada de inventario
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Registrar nuevo stock para items existentes.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 py-2">
						<div className="grid gap-2">
							<Label htmlFor={inventoryEntrySearchId}>Buscar producto</Label>
							<Popover
								open={isInventoryEntryPickerOpen}
								onOpenChange={setIsInventoryEntryPickerOpen}
							>
								<PopoverTrigger asChild>
									<button
										id={inventoryEntrySearchId}
										type="button"
										className={cn(
											"flex h-11 w-full items-center justify-between rounded-lg border border-gray-700 bg-black/20 px-3 text-left transition-colors",
											"focus-visible:border-[var(--color-voltage)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-voltage)]/20",
										)}
									>
										<div className="flex min-w-0 items-center gap-3">
											<Search className="h-4 w-4 shrink-0 text-gray-500" />
											<span
												className={cn(
													"truncate",
													selectedProductForInventoryEntry
														? "text-white"
														: "text-gray-500",
												)}
											>
												{selectedProductForInventoryEntry
													? `${selectedProductForInventoryEntry.name}${selectedProductForInventoryEntry.sku ? ` · ${selectedProductForInventoryEntry.sku}` : ""}`
													: "Buscar por nombre, SKU o codigo de barras"}
											</span>
										</div>
										<ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-500" />
									</button>
								</PopoverTrigger>
								<PopoverContent
									align="start"
									className="w-[var(--radix-popover-trigger-width)] border-gray-800 bg-[var(--color-carbon)] p-3 text-white"
								>
									<div className="space-y-3">
										<div className="relative">
											<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
											<Input
												autoFocus
												value={inventoryEntrySearch}
												onChange={(event) =>
													setInventoryEntrySearch(event.target.value)
												}
												placeholder="Buscar por nombre, SKU o codigo de barras"
												className="h-10 border-gray-700 bg-black/20 pl-9"
											/>
										</div>
										<div className="max-h-64 space-y-2 overflow-y-auto pr-1">
											{filteredInventoryEntryProducts.length > 0 ? (
												filteredInventoryEntryProducts.map((product) => (
													<button
														key={product.id}
														type="button"
														onClick={() => selectInventoryEntryProduct(product)}
														className={cn(
															"flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
															selectedProductForInventoryEntry?.id ===
																product.id
																? "border-[var(--color-voltage)] bg-[var(--color-voltage)]/10"
																: "border-gray-800 bg-black/10 hover:border-gray-700 hover:bg-white/5",
														)}
													>
														<div className="min-w-0">
															<p className="truncate font-medium text-white">
																{product.name}
															</p>
															<p className="truncate text-xs text-gray-400">
																{product.sku ||
																	product.barcode ||
																	"Sin identificador"}
															</p>
														</div>
														<div className="ml-3 text-right">
															<p className="text-sm font-medium text-[var(--color-voltage)]">
																COP {currencyFormatter.format(product.price)}
															</p>
															<p className="text-xs text-gray-400">
																Stock: {product.stock}
															</p>
														</div>
													</button>
												))
											) : (
												<div className="rounded-lg border border-dashed border-gray-700 px-3 py-6 text-center text-sm text-gray-500">
													No encontramos productos con ese criterio.
												</div>
											)}
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>

						{selectedProductForInventoryEntry ? (
							<div className="space-y-4 rounded-xl border border-gray-800 bg-black/10 p-4">
								<div className="space-y-1">
									<p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-voltage)]">
										Producto
									</p>
									<p className="text-lg font-semibold text-white">
										{selectedProductForInventoryEntry.name}
									</p>
									<p className="text-sm text-gray-400">
										{selectedProductForInventoryEntry.sku ||
											selectedProductForInventoryEntry.barcode ||
											"Sin SKU"}
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="grid gap-2">
										<Label>Stock actual</Label>
										<Input
											readOnly
											value={selectedProductForInventoryEntry.stock}
											className="h-11 border-gray-700 bg-black/20 text-white"
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor={inventoryEntryQuantityId}>
											Cantidad entrante
										</Label>
										<Input
											id={inventoryEntryQuantityId}
											type="number"
											min="1"
											step="1"
											value={inventoryEntryQuantity}
											onChange={(event) =>
												setInventoryEntryQuantity(event.target.value)
											}
											placeholder="Ej: 25"
											className="h-11 border-gray-700 bg-black/20 text-white"
										/>
									</div>
								</div>

								<div className="grid gap-2">
									<Label>Nuevo total de stock</Label>
									<Input
										readOnly
										value={nextInventoryStockTotal}
										className="h-11 border-gray-700 bg-black/20 text-white"
									/>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="grid gap-2">
										<Label htmlFor={inventoryEntryCostId}>Costo (COP)</Label>
										<Input
											id={inventoryEntryCostId}
											type="number"
											min="0"
											step="1"
											value={inventoryEntryCost}
											onChange={(event) =>
												setInventoryEntryCost(event.target.value)
											}
											placeholder="Ej: 4000"
											className="h-11 border-gray-700 bg-black/20 text-white"
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor={inventoryEntryPriceId}>
											Precio de venta (COP)
										</Label>
										<Input
											id={inventoryEntryPriceId}
											type="number"
											min="0"
											step="1"
											value={inventoryEntryPrice}
											onChange={(event) =>
												setInventoryEntryPrice(event.target.value)
											}
											placeholder="Ej: 6000"
											className="h-11 border-gray-700 bg-black/20 text-white"
										/>
									</div>
								</div>
							</div>
						) : null}

						{inventoryEntryError ? (
							<p className="text-sm text-red-400">{inventoryEntryError}</p>
						) : null}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsInventoryEntryDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							onClick={handleSaveInventoryEntry}
							disabled={
								!selectedProductForInventoryEntry || isInventoryEntryPending
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{isInventoryEntryPending ? "Guardando..." : "Guardar entrada"}
						</Button>
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
								placeholder="Opcional"
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
