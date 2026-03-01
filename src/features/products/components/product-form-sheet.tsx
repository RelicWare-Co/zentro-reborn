import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
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
};

type Category = Awaited<ReturnType<typeof getCategories>>[number];

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
	}) => Promise<void>;
	isPending: boolean;
	error: string | null;
}

export function ProductFormSheet({
	isOpen,
	onOpenChange,
	editingProduct,
	categories,
	onSave,
	isPending,
	error,
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
			price: Number(productForm.price),
			cost: Number(productForm.cost),
			taxRate: Number(productForm.taxRate),
			stock: Number(productForm.stock),
			trackInventory: productForm.trackInventory,
		});
	};

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-[500px] w-full overflow-y-auto bg-[var(--color-carbon)] border-l border-gray-800 text-white p-0">
				<form onSubmit={handleSave} className="flex flex-col h-full">
					<SheetHeader className="p-6 border-b border-gray-800">
						<SheetTitle className="text-xl">
							{editingProduct ? "Edit Product" : "Create Product"}
						</SheetTitle>
						<SheetDescription className="text-gray-400">
							{editingProduct
								? "Update the details of this product."
								: "Add a new product to your inventory."}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 p-6 space-y-8 overflow-y-auto">
						{/* Basic Information */}
						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-[var(--color-voltage)] uppercase tracking-wider">
								Basic Information
							</h3>

							<div className="space-y-2">
								<Label htmlFor={nameId} className="text-gray-300">
									Name <span className="text-red-500">*</span>
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
									placeholder="e.g., Capuccino"
									className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor={categoryId} className="text-gray-300">
									Category
								</Label>
								<Select
									value={productForm.categoryId || "none"}
									onValueChange={(value) =>
										setProductForm((prev) => ({
											...prev,
											categoryId: value === "none" ? "" : value,
										}))
									}
								>
									<SelectTrigger
										id={categoryId}
										className="bg-black/20 border-gray-700 text-white focus:border-[var(--color-voltage)] focus:ring-[var(--color-voltage)]/20"
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
										placeholder="e.g., COF-CAP-001"
										className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={barcodeId} className="text-gray-300">
										Barcode
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
										placeholder="Scan or enter barcode"
										className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
							</div>
						</div>

						{/* Pricing */}
						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-[var(--color-voltage)] uppercase tracking-wider">
								Pricing
							</h3>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor={priceId} className="text-gray-300">
										Unit Price (COP) <span className="text-red-500">*</span>
									</Label>
									<Input
										id={priceId}
										type="number"
										step="0.01"
										min={0}
										value={productForm.price}
										onChange={(e) =>
											setProductForm((prev) => ({
												...prev,
												price: e.target.value,
											}))
										}
										placeholder="0"
										className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
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
										value={productForm.cost}
										onChange={(e) =>
											setProductForm((prev) => ({
												...prev,
												cost: e.target.value,
											}))
										}
										placeholder="0"
										className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor={taxRateId} className="text-gray-300">
									Tax Rate (%)
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
									className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
								/>
							</div>
						</div>

						{/* Inventory */}
						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-[var(--color-voltage)] uppercase tracking-wider">
								Inventory Management
							</h3>

							<div className="flex items-center justify-between p-4 bg-black/20 border border-gray-800 rounded-lg">
								<div className="space-y-0.5">
									<Label
										htmlFor={trackInventoryId}
										className="text-gray-200 font-medium"
									>
										Track Inventory
									</Label>
									<p className="text-xs text-gray-500">
										Monitor stock levels for this product
									</p>
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
								<div className="space-y-2 animate-in fade-in slide-in-from-top-2">
									<Label htmlFor={stockId} className="text-gray-300">
										Initial Stock
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
										className="bg-black/20 border-gray-700 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20"
									/>
								</div>
							)}
						</div>

						{error && (
							<p className="text-sm font-medium text-red-400 bg-red-400/10 p-3 rounded-md border border-red-400/20">
								{error}
							</p>
						)}
					</div>

					<SheetFooter className="p-6 border-t border-gray-800 bg-black/10">
						<Button
							type="submit"
							disabled={isPending}
							className="w-full sm:w-auto bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold rounded-lg"
						>
							{isPending ? "Saving..." : "Save Product"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
