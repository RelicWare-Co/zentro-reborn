import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	flexRender,
	getCoreRowModel,
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
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
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
import { CategoryDialog } from "@/features/products/components/category-dialog";
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

const PRODUCT_TAB_VALUES = ["products", "categories"] as const;
const PRODUCT_TYPE_VALUES = ["standard", "modifier"] as const;
const INVENTORY_TRACKING_VALUES = ["tracked", "untracked"] as const;
const PRODUCT_STOCK_STATUS_VALUES = [
	"available",
	"low",
	"out",
	"negative",
	"untracked",
] as const;
const ALL_FILTER_VALUE = "all";
const UNCATEGORIZED_FILTER_VALUE = "uncategorized";

const productsSearchSchema = z.object({
	tab: z.enum(PRODUCT_TAB_VALUES).optional(),
	q: z.string().optional(),
	categoryId: z.string().optional(),
	productType: z.enum(PRODUCT_TYPE_VALUES).optional(),
	inventoryTracking: z.enum(INVENTORY_TRACKING_VALUES).optional(),
	stockStatus: z.enum(PRODUCT_STOCK_STATUS_VALUES).optional(),
	priceMin: z.coerce.number().int().min(0).optional(),
	priceMax: z.coerce.number().int().min(0).optional(),
	costMin: z.coerce.number().int().min(0).optional(),
	costMax: z.coerce.number().int().min(0).optional(),
});

export const Route = createFileRoute("/_auth/products")({
	validateSearch: productsSearchSchema,
	loader: () => getProducts(),
	component: ProductsPage,
});

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});

const normalizeSearchTerm = (value: string) => value.trim().toLowerCase();

function ProductsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const loaderProducts = Route.useLoaderData();
	const [rowSelection, setRowSelection] = useState({});
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [productToDelete, setProductToDelete] = useState<string | null>(null);
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [selectedCategoryForDialog, setSelectedCategoryForDialog] =
		useState<Category | null>(null);
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
	const [inventoryEntryRestockMode, setInventoryEntryRestockMode] = useState<
		"add_to_stock" | "set_as_total"
	>("add_to_stock");
	const [inventoryEntryQuantity, setInventoryEntryQuantity] = useState("");
	const [inventoryEntryCost, setInventoryEntryCost] = useState("");
	const [inventoryEntryPrice, setInventoryEntryPrice] = useState("");
	const [inventoryEntryError, setInventoryEntryError] = useState<string | null>(
		null,
	);

	const activeTab = search.tab ?? "products";
	const [draftFilters, setDraftFilters] = useState(() => ({
		q: search.q ?? "",
		categoryId: search.categoryId ?? "",
		productType: search.productType ?? "",
		inventoryTracking: search.inventoryTracking ?? "",
		stockStatus: search.stockStatus ?? "",
		priceMin: search.priceMin !== undefined ? String(search.priceMin) : "",
		priceMax: search.priceMax !== undefined ? String(search.priceMax) : "",
		costMin: search.costMin !== undefined ? String(search.costMin) : "",
		costMax: search.costMax !== undefined ? String(search.costMax) : "",
	}));

	const productSearchId = useId();
	const categoryFilterId = useId();
	const productTypeId = useId();
	const inventoryTrackingId = useId();
	const stockStatusId = useId();
	const priceMinId = useId();
	const priceMaxId = useId();
	const costMinId = useId();
	const costMaxId = useId();
	const inventoryTypeId = useId();
	const inventoryQuantityId = useId();
	const inventoryNotesId = useId();
	const inventoryEntrySearchId = useId();
	const inventoryEntryQuantityId = useId();
	const inventoryEntryRestockModeId = useId();
	const inventoryEntryCostId = useId();
	const inventoryEntryPriceId = useId();

	const { products, categories } = useProductsQueries(loaderProducts);
	const activeAdvancedFilterCount = [
		search.productType,
		search.inventoryTracking,
		search.stockStatus,
		search.priceMin,
		search.priceMax,
		search.costMin,
		search.costMax,
	].filter(Boolean).length;
	const activeFilterCount =
		[search.q, search.categoryId].filter(Boolean).length +
		activeAdvancedFilterCount;
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

	useEffect(() => {
		setDraftFilters({
			q: search.q ?? "",
			categoryId: search.categoryId ?? "",
			productType: search.productType ?? "",
			inventoryTracking: search.inventoryTracking ?? "",
			stockStatus: search.stockStatus ?? "",
			priceMin: search.priceMin !== undefined ? String(search.priceMin) : "",
			priceMax: search.priceMax !== undefined ? String(search.priceMax) : "",
			costMin: search.costMin !== undefined ? String(search.costMin) : "",
			costMax: search.costMax !== undefined ? String(search.costMax) : "",
		});
	}, [
		search.categoryId,
		search.costMax,
		search.costMin,
		search.inventoryTracking,
		search.priceMax,
		search.priceMin,
		search.productType,
		search.q,
		search.stockStatus,
	]);

	const filteredProducts = useMemo(() => {
		const query = normalizeSearchTerm(search.q ?? "");
		const priceRange = resolveNumericRangeFilters(
			search.priceMin,
			search.priceMax,
		);
		const costRange = resolveNumericRangeFilters(
			search.costMin,
			search.costMax,
		);

		return products.filter((product) => {
			if (query) {
				const searchableFields = [
					product.name,
					product.sku,
					product.barcode,
					product.categoryName,
				]
					.filter(Boolean)
					.map((field) => field?.toLowerCase() ?? "");

				if (!searchableFields.some((field) => field.includes(query))) {
					return false;
				}
			}

			if (search.categoryId === UNCATEGORIZED_FILTER_VALUE) {
				if (product.categoryId) {
					return false;
				}
			} else if (
				search.categoryId &&
				product.categoryId !== search.categoryId
			) {
				return false;
			}

			if (search.productType === "modifier" && !product.isModifier) {
				return false;
			}
			if (search.productType === "standard" && product.isModifier) {
				return false;
			}

			if (search.inventoryTracking === "tracked" && !product.trackInventory) {
				return false;
			}
			if (search.inventoryTracking === "untracked" && product.trackInventory) {
				return false;
			}

			if (!matchesProductStockStatus(product, search.stockStatus)) {
				return false;
			}

			if (priceRange.minimum !== null && product.price < priceRange.minimum) {
				return false;
			}
			if (priceRange.maximum !== null && product.price > priceRange.maximum) {
				return false;
			}
			if (costRange.minimum !== null && product.cost < costRange.minimum) {
				return false;
			}
			if (costRange.maximum !== null && product.cost > costRange.maximum) {
				return false;
			}

			return true;
		});
	}, [
		products,
		search.categoryId,
		search.costMax,
		search.costMin,
		search.inventoryTracking,
		search.priceMax,
		search.priceMin,
		search.productType,
		search.q,
		search.stockStatus,
	]);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const applyFilters = useCallback(() => {
		const priceRange = resolveNumericRangeFilters(
			draftFilters.priceMin,
			draftFilters.priceMax,
		);
		const costRange = resolveNumericRangeFilters(
			draftFilters.costMin,
			draftFilters.costMax,
		);

		void navigate({
			search: {
				tab: activeTab !== "products" ? activeTab : undefined,
				q: normalizeFilterValue(draftFilters.q),
				categoryId: normalizeCategoryFilterValue(draftFilters.categoryId),
				productType: normalizeEnumFilterValue(
					draftFilters.productType,
					PRODUCT_TYPE_VALUES,
				),
				inventoryTracking: normalizeEnumFilterValue(
					draftFilters.inventoryTracking,
					INVENTORY_TRACKING_VALUES,
				),
				stockStatus: normalizeEnumFilterValue(
					draftFilters.stockStatus,
					PRODUCT_STOCK_STATUS_VALUES,
				),
				priceMin: priceRange.minimum ?? undefined,
				priceMax: priceRange.maximum ?? undefined,
				costMin: costRange.minimum ?? undefined,
				costMax: costRange.maximum ?? undefined,
			},
			replace: true,
		});
	}, [activeTab, draftFilters, navigate]);

	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			applyFilters();
		}, 300);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [applyFilters]);

	const clearFilters = () => {
		setDraftFilters({
			q: "",
			categoryId: "",
			productType: "",
			inventoryTracking: "",
			stockStatus: "",
			priceMin: "",
			priceMax: "",
			costMin: "",
			costMax: "",
		});
		void navigate({
			search: {
				tab: activeTab !== "products" ? activeTab : undefined,
			},
			replace: true,
		});
	};

	const handleTabChange = (value: string) => {
		const nextTab = normalizeEnumFilterValue(value, PRODUCT_TAB_VALUES);
		if (!nextTab || nextTab === activeTab) {
			return;
		}

		void navigate({
			search: {
				...search,
				tab: nextTab !== "products" ? nextTab : undefined,
			},
			replace: true,
		});
	};

	const closeSheet = useCallback(() => {
		setIsSheetOpen(false);
		setEditingProduct(null);
	}, []);

	const {
		createProductMutation,
		updateProductMutation,
		deleteProductMutation,
		registerInventoryMovementMutation,
	} = useProductsMutations({
		onCreateProductSuccess: closeSheet,
		onUpdateProductSuccess: closeSheet,
		onDeleteProductSuccess: () => {
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
		setInventoryEntryRestockMode("add_to_stock");
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
		data: filteredProducts,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onRowSelectionChange: setRowSelection,
		state: {
			rowSelection,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	useEffect(() => {
		table.setPageIndex(0);
	}, [table]);

	const formError =
		createProductMutation.error instanceof Error
			? createProductMutation.error.message
			: updateProductMutation.error instanceof Error
				? updateProductMutation.error.message
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

	const inventoryEntryQuantityValue = Number(inventoryEntryQuantity);
	const normalizedInventoryEntryQuantity =
		Number.isFinite(inventoryEntryQuantityValue) &&
		inventoryEntryQuantityValue > 0
			? Math.trunc(inventoryEntryQuantityValue)
			: 0;
	const hasNegativeInventoryEntryStock =
		(selectedProductForInventoryEntry?.stock ?? 0) < 0;
	const nextInventoryStockTotal =
		selectedProductForInventoryEntry && normalizedInventoryEntryQuantity > 0
			? hasNegativeInventoryEntryStock &&
				inventoryEntryRestockMode === "set_as_total"
				? normalizedInventoryEntryQuantity
				: selectedProductForInventoryEntry.stock +
					normalizedInventoryEntryQuantity
			: (selectedProductForInventoryEntry?.stock ?? 0);
	const isInventoryEntryPending =
		registerInventoryMovementMutation.isPending ||
		updateProductMutation.isPending;

	const openCreateCategoryDialog = () => {
		setSelectedCategoryForDialog(null);
		setIsCategoryDialogOpen(true);
	};

	const openEditCategoryDialog = (category: Category) => {
		setSelectedCategoryForDialog(category);
		setIsCategoryDialogOpen(true);
	};

	const handleCategoryDialogOpenChange = useCallback((open: boolean) => {
		setIsCategoryDialogOpen(open);
		if (!open) {
			setSelectedCategoryForDialog(null);
		}
	}, []);

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
				restockMode:
					selectedProductForInventoryEntry.stock < 0
						? inventoryEntryRestockMode
						: "add_to_stock",
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
			<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
				<div className="flex items-baseline gap-3">
					<h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
					<span className="text-gray-400 text-sm">
						{activeFilterCount > 0
							? `${filteredProducts.length} de ${products.length} productos visibles`
							: `${products.length} productos, ${categories.length} categorías`}
					</span>
				</div>

				<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
					<Button
						variant="outline"
						className="bg-[var(--color-carbon)] border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
						onClick={() => openInventoryEntryDialog()}
					>
						<PackagePlus className="w-4 h-4 mr-2" aria-hidden="true" />
						Entrada de inventario
					</Button>

					<Button
						className="bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-4 py-2 h-10 w-full sm:w-auto shrink-0"
						onClick={() => setIsSheetOpen(true)}
					>
						<Plus className="w-4 h-4 mr-2" aria-hidden="true" />
						Agregar Producto
					</Button>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="bg-black/20 border border-gray-800 flex w-full p-1.5 rounded-xl gap-1 mb-6">
					<TabsTrigger
						value="products"
						className="flex-1 rounded-lg py-2.5 px-8 text-sm font-semibold text-gray-400 transition-all [&[data-state=active]]:bg-[var(--color-voltage)] [&[data-state=active]]:text-black [&[data-state=active]]:shadow-md [&[data-state=active]:hover]:text-black [&:not([data-state=active])]:hover:bg-white/5 [&:not([data-state=active])]:hover:text-gray-200 border-transparent"
					>
						Productos
					</TabsTrigger>
					<TabsTrigger
						value="categories"
						className="flex-1 rounded-lg py-2.5 px-8 text-sm font-semibold text-gray-400 transition-all [&[data-state=active]]:bg-[var(--color-voltage)] [&[data-state=active]]:text-black [&[data-state=active]]:shadow-md [&[data-state=active]:hover]:text-black [&:not([data-state=active])]:hover:bg-white/5 [&:not([data-state=active])]:hover:text-gray-200 border-transparent"
					>
						Categorías
					</TabsTrigger>
				</TabsList>

				<TabsContent value="products" className="space-y-6 mt-0">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row items-center gap-3 w-full">
							<div className="relative w-full sm:max-w-xs md:max-w-sm">
								<Search
									className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
									aria-hidden="true"
								/>
								<Input
									id={productSearchId}
									name="q"
									autoComplete="off"
									placeholder="Buscar por nombre, SKU o código..."
									value={draftFilters.q}
									onChange={(event) =>
										setDraftFilters((current) => ({
											...current,
											q: event.target.value,
										}))
									}
									className="pl-9 bg-black/20 border-gray-800 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 rounded-lg h-10"
								/>
							</div>

							<div className="w-full sm:w-[200px]">
								<Select
									value={draftFilters.categoryId || ALL_FILTER_VALUE}
									onValueChange={(value) =>
										setDraftFilters((current) => ({
											...current,
											categoryId: value === ALL_FILTER_VALUE ? "" : value,
										}))
									}
								>
									<SelectTrigger
										id={categoryFilterId}
										className="h-10 w-full bg-black/20 border-gray-800 text-white rounded-lg"
									>
										<SelectValue placeholder="Todas las categorías" />
									</SelectTrigger>
									<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
										<SelectItem value={ALL_FILTER_VALUE}>
											Todas las categorías
										</SelectItem>
										<SelectItem value={UNCATEGORIZED_FILTER_VALUE}>
											Sin categoría
										</SelectItem>
										{categories.map((item) => (
											<SelectItem key={item.id} value={item.id}>
												{item.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Mobile: Sheet drawer */}
							<Sheet
								open={isMobileFilterOpen}
								onOpenChange={setIsMobileFilterOpen}
							>
								<SheetTrigger asChild>
									<Button
										variant="outline"
										className="h-10 bg-black/20 border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg w-full sm:hidden"
									>
										<Filter className="w-4 h-4 mr-2" aria-hidden="true" />
										Filtros
										{activeAdvancedFilterCount > 0 && (
											<Badge className="ml-2 bg-[var(--color-voltage)]/20 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/30 px-1.5 py-0.5 rounded-sm font-mono text-[10px]">
												{activeAdvancedFilterCount}
											</Badge>
										)}
									</Button>
								</SheetTrigger>
								<SheetContent
									side="bottom"
									className="bg-[var(--color-carbon)] border-gray-800 text-white h-[85vh] rounded-t-xl"
									showCloseButton={false}
								>
									<SheetHeader className="pb-4 border-b border-gray-800">
										<SheetTitle className="text-gray-200">
											Filtros avanzados
										</SheetTitle>
									</SheetHeader>
									<div className="overflow-y-auto flex-1 py-4 px-4 space-y-4">
										<FilterField
											label="Tipo"
											htmlFor={`mobile-${productTypeId}`}
										>
											<Select
												value={draftFilters.productType || ALL_FILTER_VALUE}
												onValueChange={(value) =>
													setDraftFilters((current) => ({
														...current,
														productType:
															value === ALL_FILTER_VALUE ? "" : value,
													}))
												}
											>
												<SelectTrigger
													id={`mobile-${productTypeId}`}
													className="h-11 w-full bg-black/20 border-gray-700 text-white"
												>
													<SelectValue placeholder="Todos" />
												</SelectTrigger>
												<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
													<SelectItem value={ALL_FILTER_VALUE}>
														Todos
													</SelectItem>
													<SelectItem value="standard">
														Producto normal
													</SelectItem>
													<SelectItem value="modifier">Modificador</SelectItem>
												</SelectContent>
											</Select>
										</FilterField>

										<FilterField
											label="Seguimiento"
											htmlFor={`mobile-${inventoryTrackingId}`}
										>
											<Select
												value={
													draftFilters.inventoryTracking || ALL_FILTER_VALUE
												}
												onValueChange={(value) =>
													setDraftFilters((current) => ({
														...current,
														inventoryTracking:
															value === ALL_FILTER_VALUE ? "" : value,
													}))
												}
											>
												<SelectTrigger
													id={`mobile-${inventoryTrackingId}`}
													className="h-11 w-full bg-black/20 border-gray-700 text-white"
												>
													<SelectValue placeholder="Todos" />
												</SelectTrigger>
												<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
													<SelectItem value={ALL_FILTER_VALUE}>
														Todos
													</SelectItem>
													<SelectItem value="tracked">
														Con inventario
													</SelectItem>
													<SelectItem value="untracked">
														Sin inventario
													</SelectItem>
												</SelectContent>
											</Select>
										</FilterField>

										<FilterField
											label="Estado de stock"
											htmlFor={`mobile-${stockStatusId}`}
										>
											<Select
												value={draftFilters.stockStatus || ALL_FILTER_VALUE}
												onValueChange={(value) =>
													setDraftFilters((current) => ({
														...current,
														stockStatus:
															value === ALL_FILTER_VALUE ? "" : value,
													}))
												}
											>
												<SelectTrigger
													id={`mobile-${stockStatusId}`}
													className="h-11 w-full bg-black/20 border-gray-700 text-white"
												>
													<SelectValue placeholder="Todos" />
												</SelectTrigger>
												<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
													<SelectItem value={ALL_FILTER_VALUE}>
														Todos
													</SelectItem>
													<SelectItem value="available">Disponible</SelectItem>
													<SelectItem value="low">Stock bajo</SelectItem>
													<SelectItem value="out">Sin stock</SelectItem>
													<SelectItem value="negative">
														Stock negativo
													</SelectItem>
													<SelectItem value="untracked">
														Sin seguimiento
													</SelectItem>
												</SelectContent>
											</Select>
										</FilterField>

										<FilterField
											label="Precio minimo"
											htmlFor={`mobile-${priceMinId}`}
										>
											<Input
												id={`mobile-${priceMinId}`}
												name="priceMin"
												autoComplete="off"
												inputMode="numeric"
												min={0}
												step={500}
												type="number"
												value={draftFilters.priceMin}
												onChange={(event) =>
													setDraftFilters((current) => ({
														...current,
														priceMin: event.target.value,
													}))
												}
												placeholder="Ej. 5000…"
												className="h-11 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
											/>
										</FilterField>

										<FilterField
											label="Precio maximo"
											htmlFor={`mobile-${priceMaxId}`}
										>
											<Input
												id={`mobile-${priceMaxId}`}
												name="priceMax"
												autoComplete="off"
												inputMode="numeric"
												min={0}
												step={500}
												type="number"
												value={draftFilters.priceMax}
												onChange={(event) =>
													setDraftFilters((current) => ({
														...current,
														priceMax: event.target.value,
													}))
												}
												placeholder="Ej. 25000…"
												className="h-11 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
											/>
										</FilterField>

										<FilterField
											label="Costo minimo"
											htmlFor={`mobile-${costMinId}`}
										>
											<Input
												id={`mobile-${costMinId}`}
												name="costMin"
												autoComplete="off"
												inputMode="numeric"
												min={0}
												step={500}
												type="number"
												value={draftFilters.costMin}
												onChange={(event) =>
													setDraftFilters((current) => ({
														...current,
														costMin: event.target.value,
													}))
												}
												placeholder="Ej. 2000…"
												className="h-11 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
											/>
										</FilterField>

										<FilterField
											label="Costo maximo"
											htmlFor={`mobile-${costMaxId}`}
										>
											<Input
												id={`mobile-${costMaxId}`}
												name="costMax"
												autoComplete="off"
												inputMode="numeric"
												min={0}
												step={500}
												type="number"
												value={draftFilters.costMax}
												onChange={(event) =>
													setDraftFilters((current) => ({
														...current,
														costMax: event.target.value,
													}))
												}
												placeholder="Ej. 12000…"
												className="h-11 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
											/>
										</FilterField>
									</div>
								</SheetContent>
							</Sheet>

							{/* Desktop: Popover */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className="h-10 bg-black/20 border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg hidden sm:inline-flex"
									>
										<Filter className="w-4 h-4 mr-2" aria-hidden="true" />
										Filtros
										{activeAdvancedFilterCount > 0 && (
											<Badge className="ml-2 bg-[var(--color-voltage)]/20 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/30 px-1.5 py-0.5 rounded-sm font-mono text-[10px]">
												{activeAdvancedFilterCount}
											</Badge>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent
									align="start"
									className="w-[600px] p-4 bg-[var(--color-carbon)] border-gray-800 text-white rounded-xl shadow-xl z-50"
								>
									<div className="space-y-4">
										<h4 className="font-medium text-sm text-gray-200">
											Filtros avanzados
										</h4>
										<div className="grid gap-4 md:grid-cols-2">
											<FilterField label="Tipo" htmlFor={productTypeId}>
												<Select
													value={draftFilters.productType || ALL_FILTER_VALUE}
													onValueChange={(value) =>
														setDraftFilters((current) => ({
															...current,
															productType:
																value === ALL_FILTER_VALUE ? "" : value,
														}))
													}
												>
													<SelectTrigger
														id={productTypeId}
														className="h-9 w-full bg-black/20 border-gray-700 text-white"
													>
														<SelectValue placeholder="Todos" />
													</SelectTrigger>
													<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
														<SelectItem value={ALL_FILTER_VALUE}>
															Todos
														</SelectItem>
														<SelectItem value="standard">
															Producto normal
														</SelectItem>
														<SelectItem value="modifier">
															Modificador
														</SelectItem>
													</SelectContent>
												</Select>
											</FilterField>

											<FilterField
												label="Seguimiento"
												htmlFor={inventoryTrackingId}
											>
												<Select
													value={
														draftFilters.inventoryTracking || ALL_FILTER_VALUE
													}
													onValueChange={(value) =>
														setDraftFilters((current) => ({
															...current,
															inventoryTracking:
																value === ALL_FILTER_VALUE ? "" : value,
														}))
													}
												>
													<SelectTrigger
														id={inventoryTrackingId}
														className="h-9 w-full bg-black/20 border-gray-700 text-white"
													>
														<SelectValue placeholder="Todos" />
													</SelectTrigger>
													<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
														<SelectItem value={ALL_FILTER_VALUE}>
															Todos
														</SelectItem>
														<SelectItem value="tracked">
															Con inventario
														</SelectItem>
														<SelectItem value="untracked">
															Sin inventario
														</SelectItem>
													</SelectContent>
												</Select>
											</FilterField>

											<FilterField
												label="Estado de stock"
												htmlFor={stockStatusId}
											>
												<Select
													value={draftFilters.stockStatus || ALL_FILTER_VALUE}
													onValueChange={(value) =>
														setDraftFilters((current) => ({
															...current,
															stockStatus:
																value === ALL_FILTER_VALUE ? "" : value,
														}))
													}
												>
													<SelectTrigger
														id={stockStatusId}
														className="h-9 w-full bg-black/20 border-gray-700 text-white"
													>
														<SelectValue placeholder="Todos" />
													</SelectTrigger>
													<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
														<SelectItem value={ALL_FILTER_VALUE}>
															Todos
														</SelectItem>
														<SelectItem value="available">
															Disponible
														</SelectItem>
														<SelectItem value="low">Stock bajo</SelectItem>
														<SelectItem value="out">Sin stock</SelectItem>
														<SelectItem value="negative">
															Stock negativo
														</SelectItem>
														<SelectItem value="untracked">
															Sin seguimiento
														</SelectItem>
													</SelectContent>
												</Select>
											</FilterField>

											<div />

											<FilterField label="Precio minimo" htmlFor={priceMinId}>
												<Input
													id={priceMinId}
													name="priceMin"
													autoComplete="off"
													inputMode="numeric"
													min={0}
													step={500}
													type="number"
													value={draftFilters.priceMin}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															priceMin: event.target.value,
														}))
													}
													placeholder="Ej. 5000…"
													className="h-9 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
												/>
											</FilterField>

											<FilterField label="Precio maximo" htmlFor={priceMaxId}>
												<Input
													id={priceMaxId}
													name="priceMax"
													autoComplete="off"
													inputMode="numeric"
													min={0}
													step={500}
													type="number"
													value={draftFilters.priceMax}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															priceMax: event.target.value,
														}))
													}
													placeholder="Ej. 25000…"
													className="h-9 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
												/>
											</FilterField>

											<FilterField label="Costo minimo" htmlFor={costMinId}>
												<Input
													id={costMinId}
													name="costMin"
													autoComplete="off"
													inputMode="numeric"
													min={0}
													step={500}
													type="number"
													value={draftFilters.costMin}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															costMin: event.target.value,
														}))
													}
													placeholder="Ej. 2000…"
													className="h-9 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
												/>
											</FilterField>

											<FilterField label="Costo maximo" htmlFor={costMaxId}>
												<Input
													id={costMaxId}
													name="costMax"
													autoComplete="off"
													inputMode="numeric"
													min={0}
													step={500}
													type="number"
													value={draftFilters.costMax}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															costMax: event.target.value,
														}))
													}
													placeholder="Ej. 12000…"
													className="h-9 bg-black/20 border-gray-700 text-white placeholder:text-gray-500"
												/>
											</FilterField>
										</div>
									</div>
								</PopoverContent>
							</Popover>

							{activeFilterCount > 0 && (
								<Button
									type="button"
									variant="ghost"
									onClick={clearFilters}
									className="text-gray-400 hover:text-white h-10"
								>
									Limpiar
								</Button>
							)}
						</div>
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
						onOpenCategoryDialog={openCreateCategoryDialog}
					/>

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
									{filteredProducts.length === 0
										? "0 de 0 resultados"
										: `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min(
												(table.getState().pagination.pageIndex + 1) *
													table.getState().pagination.pageSize,
												filteredProducts.length,
											)} de ${filteredProducts.length} resultados`}
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
								No se encontraron categorías. Haz clic en "Agregar Categoría"
								para crear una.
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

			<CategoryDialog
				open={isCategoryDialogOpen}
				onOpenChange={handleCategoryDialogOpenChange}
				selectedCategory={selectedCategoryForDialog}
			/>

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

								{hasNegativeInventoryEntryStock ? (
									<div className="grid gap-2">
										<Label htmlFor={inventoryEntryRestockModeId}>
											Cómo aplicar la entrada
										</Label>
										<Select
											value={inventoryEntryRestockMode}
											onValueChange={(value) =>
												setInventoryEntryRestockMode(
													value as "add_to_stock" | "set_as_total",
												)
											}
										>
											<SelectTrigger
												id={inventoryEntryRestockModeId}
												className="h-11 border-gray-700 bg-black/20 text-white"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
												<SelectItem value="add_to_stock">
													Restar el negativo actual
												</SelectItem>
												<SelectItem value="set_as_total">
													Usar la cantidad como total final
												</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-gray-400">
											{inventoryEntryRestockMode === "set_as_total"
												? "La cantidad digitada quedará como stock final, compensando primero el saldo negativo."
												: "La cantidad digitada se sumará al stock actual, por lo que primero cubrirá el faltante negativo."}
										</p>
									</div>
								) : (
									<p className="text-xs text-gray-400">
										La cantidad entrante se sumará al stock actual del producto.
									</p>
								)}

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

function FilterField({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			<label className="text-sm text-gray-400" htmlFor={htmlFor}>
				{label}
			</label>
			{children}
		</div>
	);
}

function normalizeFilterValue(value: string) {
	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function normalizeCategoryFilterValue(value: string) {
	const normalizedValue = normalizeFilterValue(value);
	if (!normalizedValue) {
		return undefined;
	}

	return normalizedValue;
}

function normalizeNonNegativeIntegerFilterValue(
	value: number | string | null | undefined,
) {
	if (typeof value === "number") {
		return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
	}

	if (typeof value === "string") {
		const trimmedValue = value.trim();
		if (!trimmedValue) {
			return null;
		}

		const parsedValue = Number(trimmedValue);
		return Number.isFinite(parsedValue) && parsedValue >= 0
			? Math.trunc(parsedValue)
			: null;
	}

	return null;
}

function resolveNumericRangeFilters(
	minimum: number | string | null | undefined,
	maximum: number | string | null | undefined,
) {
	const normalizedMinimum = normalizeNonNegativeIntegerFilterValue(minimum);
	const normalizedMaximum = normalizeNonNegativeIntegerFilterValue(maximum);

	if (
		normalizedMinimum !== null &&
		normalizedMaximum !== null &&
		normalizedMinimum > normalizedMaximum
	) {
		return {
			minimum: normalizedMaximum,
			maximum: normalizedMinimum,
		};
	}

	return {
		minimum: normalizedMinimum,
		maximum: normalizedMaximum,
	};
}

function normalizeEnumFilterValue<T extends readonly string[]>(
	value: string,
	options: T,
): T[number] | undefined {
	const normalizedValue = normalizeFilterValue(value);
	if (!normalizedValue) {
		return undefined;
	}

	return options.includes(normalizedValue as T[number])
		? (normalizedValue as T[number])
		: undefined;
}

function matchesProductStockStatus(
	product: Product,
	stockStatus: string | undefined,
) {
	if (!stockStatus) {
		return true;
	}

	switch (stockStatus) {
		case "available":
			return product.trackInventory && product.stock >= 10;
		case "low":
			return product.trackInventory && product.stock > 0 && product.stock < 10;
		case "out":
			return product.trackInventory && product.stock === 0;
		case "negative":
			return product.trackInventory && product.stock < 0;
		case "untracked":
			return !product.trackInventory;
		default:
			return true;
	}
}
