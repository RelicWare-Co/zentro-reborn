import type { ColumnDef } from "@tanstack/react-table";
import { Image as ImageIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product } from "@/features/products/hooks/use-products";

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

interface ProductsTableColumnsProps {
	onEdit: (product: Product) => void;
	onDelete: (productId: string) => void;
}

export function getProductsColumns({
	onEdit,
	onDelete,
}: ProductsTableColumnsProps): ColumnDef<Product>[] {
	return [
		{
			id: "select",
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
			header: "SKU / BARCODE",
			cell: ({ row }) => {
				const sku = row.getValue("sku") as string | null;
				const barcode = row.original.barcode as string | null;
				return (
					<div className="flex flex-col gap-0.5">
						<span className="text-gray-400 text-sm">{sku || "-"}</span>
						{barcode && (
							<span className="text-gray-500 text-xs">BC: {barcode}</span>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "stock",
			header: "STOCK",
			cell: ({ row }) => {
				const stock = row.getValue("stock") as number;
				const trackInventory = row.original.trackInventory;

				if (!trackInventory) {
					return (
						<span className="text-gray-500 text-xs font-medium uppercase">
							Not tracked
						</span>
					);
				}

				return (
					<div className="flex items-center gap-2">
						<span className="text-gray-300">{stock}</span>
						{stock === 0 ? (
							<span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
								Out of stock
							</span>
						) : stock < 10 ? (
							<span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
								Low stock
							</span>
						) : (
							<span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
								In stock
							</span>
						)}
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
							<DropdownMenuItem
								className="focus:bg-white/10 focus:text-white cursor-pointer"
								onClick={() => onEdit(currentProduct)}
							>
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
								onClick={() => onDelete(currentProduct.id)}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];
}
