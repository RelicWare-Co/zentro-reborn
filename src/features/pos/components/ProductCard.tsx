import type { Product } from "../types";
import { formatCurrency } from "../utils";

interface ProductCardProps {
	product: Product;
	quantity: number;
	isOutOfStock: boolean;
	isActiveShift: boolean;
	onSelect: () => void;
}

export function ProductCard({
	product,
	quantity,
	isOutOfStock,
	isActiveShift,
	onSelect,
}: ProductCardProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={!isActiveShift || isOutOfStock}
			className="text-left bg-[#151515] rounded-xl p-3 border border-gray-800/80 flex flex-col justify-between transition-all hover:border-[var(--color-voltage)]/50 hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-voltage)] group min-h-[100px] relative overflow-hidden"
		>
			{quantity > 0 && (
				<div className="absolute top-0 right-0 bg-[var(--color-voltage)] text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10">
					x{quantity}
				</div>
			)}

			<div className="w-full">
				<h3
					className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[var(--color-voltage)] transition-colors"
					title={product.name}
				>
					{product.name}
				</h3>
				<p className="text-[11px] text-gray-500 mt-1 font-medium">
					{product.categoryName}
				</p>
				{product.trackInventory && (
					<p
						className={`text-[10px] mt-1 font-medium ${
							isOutOfStock ? "text-red-400" : "text-gray-500"
						}`}
					>
						Stock: {product.stock}
					</p>
				)}
			</div>

			<div className="mt-3">
				<p className="font-bold text-[15px] text-white tracking-tight tabular-nums">
					{formatCurrency(product.price)}
				</p>
			</div>
		</button>
	);
}
