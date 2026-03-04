import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Category, Product } from "../types";
import { CategoryTabs } from "./CategoryTabs";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
	categories: Category[];
	activeCategoryId: string;
	searchQuery: string;
	products: Product[];
	isLoading: boolean;
	isActiveShift: boolean;
	getProductQuantity: (productId: string) => number;
	onCategoryChange: (categoryId: string) => void;
	onSearchChange: (query: string) => void;
	onProductSelect: (product: Product) => void;
}

export function ProductGrid({
	categories,
	activeCategoryId,
	searchQuery,
	products,
	isLoading,
	isActiveShift,
	getProductQuantity,
	onCategoryChange,
	onSearchChange,
	onProductSelect,
}: ProductGridProps) {
	const regularProducts = products.filter((product) => !product.isModifier);

	return (
		<div className="flex-1 flex flex-col min-w-0 border-r border-gray-800 h-full">
			<div className="p-4 space-y-4 shrink-0 border-b border-gray-800/50 bg-[#0a0a0a]">
				<div className="flex items-center gap-4">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
						<Input
							placeholder="Buscar productos, código de barras..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="pl-9 h-10 bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus-visible:border-[var(--color-voltage)] focus-visible:ring-1 focus-visible:ring-[var(--color-voltage)] rounded-lg transition-all"
						/>
					</div>
				</div>

				<CategoryTabs
					categories={categories}
					activeCategoryId={activeCategoryId}
					onCategoryChange={onCategoryChange}
				/>
			</div>

			<ScrollArea className="flex-1 p-4 min-h-0 bg-[#0a0a0a]">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">
					{regularProducts.map((product) => {
						const qty = getProductQuantity(product.id);
						const isOutOfStock =
							product.trackInventory && product.stock <= 0;

						return (
							<ProductCard
								key={product.id}
								product={product}
								quantity={qty}
								isOutOfStock={isOutOfStock}
								isActiveShift={isActiveShift}
								onSelect={() => onProductSelect(product)}
							/>
						);
					})}
				</div>

				{isLoading && (
					<div className="flex flex-col items-center justify-center h-16 text-gray-500">
						<p>Cargando productos...</p>
					</div>
				)}

				{!isLoading && regularProducts.length === 0 && (
					<div className="flex flex-col items-center justify-center h-48 text-gray-500">
						<p>No se encontraron productos.</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
