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
	const isUnavailable = isOutOfStock;

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={isUnavailable}
			className={`text-left bg-[#151515] rounded-xl p-3 border border-gray-800/80 flex flex-col justify-between transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-voltage)] group min-h-[100px] relative overflow-hidden ${
				isUnavailable
					? "opacity-50 cursor-not-allowed"
					: "hover:border-[var(--color-voltage)]/50 hover:bg-[#1a1a1a] cursor-pointer"
			} ${!isActiveShift ? "ring-1 ring-amber-500/20" : ""}`}
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
				{!isActiveShift && !isOutOfStock && (
					<p className="mt-1 text-[10px] font-medium text-amber-400">
						Abre el turno para vender
					</p>
				)}
			</div>
		</button>
	);
}
