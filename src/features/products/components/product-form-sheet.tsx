import { Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@/features/products/hooks/use-products";
import type { getCategories } from "@/features/products/products.functions";
import {
	formatMoneyInput,
	parseMoneyInput,
	sanitizeMoneyInput,
} from "@/lib/utils";

export const EMPTY_PRODUCT_FORM = {
	name: "",
	categoryId: "",
	sku: "",
	barcode: "",
	price: "",
	cost: "0",
	taxRate: "0",
	stock: "0",
	trackInventory: true,
	isModifier: false,
};

type Category = Awaited<ReturnType<typeof getCategories>>[number];

const ADD_CATEGORY_VALUE = "__add_category__";

interface ProductFormSheetProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingProduct: Product | null;
	categories: Category[];
	onSave: (payload: {
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
	}) => Promise<void>;
	isPending: boolean;
	error: string | null;
	onOpenCategoryDialog?: () => void;
}

export function ProductFormSheet({
	isOpen,
	onOpenChange,
	editingProduct,
	categories,
	onSave,
	isPending,
	error,
	onOpenCategoryDialog,
}: ProductFormSheetProps) {
	const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);

	const nameId = useId();
	const categoryId = useId();
	const skuId = useId();
	const barcodeId = useId();
	const priceId = useId();
	const costId = useId();
	const taxRateId = useId();
	const stockId = useId();
	const trackInventoryId = useId();
	const isModifierId = useId();

	useEffect(() => {
		if (isOpen) {
			if (editingProduct) {
				setProductForm({
					name: editingProduct.name,
					categoryId: editingProduct.categoryId || "",
					sku: editingProduct.sku || "",
					barcode: editingProduct.barcode || "",
					price: editingProduct.price.toString(),
					cost: (editingProduct.cost ?? 0).toString(),
					taxRate: (editingProduct.taxRate ?? 0).toString(),
					stock: (editingProduct.stock ?? 0).toString(),
					trackInventory: editingProduct.trackInventory ?? true,
					isModifier: editingProduct.isModifier ?? false,
				});
			} else {
				setProductForm(EMPTY_PRODUCT_FORM);
			}
		}
	}, [isOpen, editingProduct]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSave({
			...(editingProduct ? { id: editingProduct.id } : {}),
			name: productForm.name,
			categoryId: productForm.categoryId || null,
			sku: productForm.sku || null,
			barcode: productForm.barcode || null,
			price: parseMoneyInput(productForm.price),
			cost: parseMoneyInput(productForm.cost),
			taxRate: Number(productForm.taxRate),
			stock: Number(productForm.stock),
			trackInventory: productForm.trackInventory,
			isModifier: productForm.isModifier,
		});
	};

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent className="!w-full !max-w-full sm:!w-[900px] overflow-hidden bg-[var(--color-carbon)] border-l border-gray-800 text-white p-0 flex flex-col">
				<form
					onSubmit={handleSave}
					className="flex flex-col h-full overflow-hidden"
				>
					<SheetHeader className="p-6 border-b border-gray-800 shrink-0">
						<SheetTitle className="text-2xl font-bold">
							{editingProduct ? "Editar Producto" : "Crear Producto"}
						</SheetTitle>
						<SheetDescription className="text-gray-400">
							{editingProduct
								? "Actualiza los detalles de este producto."
								: "Agrega un nuevo producto a tu inventario."}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto p-6">
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
							{/* Columna Principal (Izquierda) */}
							<div className="space-y-6">
								{/* Información General */}
								<div className="bg-black/20 border border-gray-800 rounded-xl p-5 space-y-4">
									<h3 className="text-base font-semibold text-white">
										Información General
									</h3>

									<div className="space-y-2">
										<Label htmlFor={nameId} className="text-gray-300">
											Nombre <span className="text-red-500">*</span>
										</Label>
										<Input
											id={nameId}
											value={productForm.name}
											onChange={(e) =>
												setProductForm((prev) => ({
													...prev,
													name: e.target.value,
												}))
											}
											placeholder="ej., Capuccino"
											className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
											required
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor={skuId} className="text-gray-300">
												SKU
											</Label>
											<Input
												id={skuId}
												value={productForm.sku}
												onChange={(e) =>
													setProductForm((prev) => ({
														...prev,
														sku: e.target.value,
													}))
												}
												placeholder="ej., COF-CAP-001"
												className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor={barcodeId} className="text-gray-300">
												Código de barras
											</Label>
											<Input
												id={barcodeId}
												value={productForm.barcode}
												onChange={(e) =>
													setProductForm((prev) => ({
														...prev,
														barcode: e.target.value,
													}))
												}
												placeholder="Escanear o ingresar"
												className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
											/>
										</div>
									</div>
								</div>

								{/* Precios */}
								<div className="bg-black/20 border border-gray-800 rounded-xl p-5 space-y-4">
									<h3 className="text-base font-semibold text-white">
										Precios
									</h3>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor={priceId} className="text-gray-300">
												Precio unitario (COP){" "}
												<span className="text-red-500">*</span>
											</Label>
											<Input
												id={priceId}
												type="text"
												inputMode="numeric"
												value={formatMoneyInput(productForm.price)}
												onChange={(e) =>
													setProductForm((prev) => ({
														...prev,
														price: sanitizeMoneyInput(e.target.value),
													}))
												}
												placeholder="0"
												className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
												required
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor={costId} className="text-gray-300">
												Costo (COP)
											</Label>
											<Input
												id={costId}
												type="text"
												inputMode="numeric"
												value={formatMoneyInput(productForm.cost)}
												onChange={(e) =>
													setProductForm((prev) => ({
														...prev,
														cost: sanitizeMoneyInput(e.target.value),
													}))
												}
												placeholder="0"
												className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor={taxRateId} className="text-gray-300">
											Tasa de impuesto (%)
										</Label>
										<Input
											id={taxRateId}
											type="number"
											min={0}
											max={100}
											value={productForm.taxRate}
											onChange={(e) =>
												setProductForm((prev) => ({
													...prev,
													taxRate: e.target.value,
												}))
											}
											placeholder="0"
											className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
										/>
									</div>
								</div>

								{error && (
									<p className="text-sm font-medium text-red-400 bg-red-400/10 p-3 rounded-md border border-red-400/20">
										{error}
									</p>
								)}
							</div>

							{/* Columna Lateral (Derecha) */}
							<div className="space-y-6">
								{/* Organización */}
								<div className="bg-black/20 border border-gray-800 rounded-xl p-5 space-y-4">
									<h3 className="text-base font-semibold text-white">
										Organización
									</h3>

									<div className="space-y-2">
										<Label htmlFor={categoryId} className="text-gray-300">
											Categoría
										</Label>
										<Select
											value={productForm.categoryId || "none"}
											onValueChange={(value) => {
												if (value === ADD_CATEGORY_VALUE) {
													onOpenCategoryDialog?.();
													return;
												}
												setProductForm((prev) => ({
													...prev,
													categoryId: value === "none" ? "" : value,
												}));
											}}
										>
											<SelectTrigger
												id={categoryId}
												className="bg-[var(--color-carbon)] border-gray-700 text-white focus:border-[var(--color-voltage)] focus:ring-[var(--color-voltage)]/20 w-full"
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
												{onOpenCategoryDialog && (
													<>
														<SelectSeparator className="bg-gray-700" />
														<SelectItem
															value={ADD_CATEGORY_VALUE}
															className="text-[var(--color-voltage)] focus:bg-[var(--color-voltage)]/10 focus:text-[var(--color-voltage)]"
														>
															<span className="flex items-center gap-2">
																<Plus className="w-4 h-4" />
																Agregar categoría
															</span>
														</SelectItem>
													</>
												)}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Inventario */}
								<div className="bg-black/20 border border-gray-800 rounded-xl p-5 space-y-4">
									<h3 className="text-base font-semibold text-white">
										Inventario
									</h3>

									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label
												htmlFor={trackInventoryId}
												className="text-gray-200 font-medium"
											>
												Controlar Inventario
											</Label>
											<p className="text-xs text-gray-500">Monitorear stock</p>
										</div>
										<Switch
											id={trackInventoryId}
											checked={productForm.trackInventory}
											onCheckedChange={(checked) =>
												setProductForm((prev) => ({
													...prev,
													trackInventory: checked,
												}))
											}
										/>
									</div>

									{productForm.trackInventory && (
										<div className="space-y-2 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-800">
											<Label htmlFor={stockId} className="text-gray-300">
												Stock Inicial
											</Label>
											<Input
												id={stockId}
												type="number"
												min={0}
												value={productForm.stock}
												onChange={(e) =>
													setProductForm((prev) => ({
														...prev,
														stock: e.target.value,
													}))
												}
												placeholder="0"
												className="bg-[var(--color-carbon)] border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
											/>
										</div>
									)}
								</div>

								{/* Opciones */}
								<div className="bg-black/20 border border-gray-800 rounded-xl p-5 space-y-4">
									<h3 className="text-base font-semibold text-white">
										Opciones
									</h3>

									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label
												htmlFor={isModifierId}
												className="text-gray-200 font-medium"
											>
												Es Modificador
											</Label>
											<p className="text-xs text-gray-500">
												Usar como adicional en POS
											</p>
										</div>
										<Switch
											id={isModifierId}
											checked={productForm.isModifier}
											onCheckedChange={(checked) =>
												setProductForm((prev) => ({
													...prev,
													isModifier: checked,
												}))
											}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					<SheetFooter className="p-6 border-t border-gray-800 bg-black/40 shrink-0">
						<Button
							type="submit"
							disabled={isPending}
							className="w-full sm:w-auto bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg px-8"
						>
							{isPending ? "Guardando..." : "Guardar Producto"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
