import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteProductDialogProps {
	productId: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isPending: boolean;
}

export function DeleteProductDialog({
	productId,
	onOpenChange,
	onConfirm,
	isPending,
}: DeleteProductDialogProps) {
	return (
		<AlertDialog
			open={productId !== null}
			onOpenChange={onOpenChange}
		>
			<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
					<AlertDialogDescription className="text-gray-400">
						This action cannot be undone. The product will be marked as
						deleted and removed from the active inventory.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-white/5 hover:text-white">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						className="bg-red-500 hover:bg-red-600 text-white border-none"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "Deleting..." : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
