import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createCategory,
	createProduct,
	deleteCategory,
	deleteProduct,
	getCategories,
	getProducts,
	registerInventoryMovement,
	updateCategory,
	updateProduct,
} from "@/features/products/products.functions";

export type Product = Awaited<ReturnType<typeof getProducts>>[number];
export type Category = Awaited<ReturnType<typeof getCategories>>[number];

export const PRODUCT_QUERY_KEY = ["products"];
export const CATEGORY_QUERY_KEY = ["product-categories"];

export function useProductsQueries(initialProducts?: Product[]) {
	const { data: products = initialProducts ?? [] } = useQuery({
		queryKey: PRODUCT_QUERY_KEY,
		queryFn: () => getProducts(),
		initialData: initialProducts,
	});

	const { data: categories = [] } = useQuery({
		queryKey: CATEGORY_QUERY_KEY,
		queryFn: () => getCategories(),
	});

	return { products, categories };
}

export function useProductsMutations(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient();

	const handleSuccess = async () => {
		options?.onSuccess?.();
		await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
	};

	const createProductMutation = useMutation({
		mutationFn: (payload: {
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
		}) => createProduct({ data: payload }),
		onSuccess: handleSuccess,
	});

	const updateProductMutation = useMutation({
		mutationFn: (payload: {
			id: string;
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
		}) => updateProduct({ data: payload }),
		onSuccess: handleSuccess,
	});

	const deleteProductMutation = useMutation({
		mutationFn: (id: string) => deleteProduct({ data: { id } }),
		onSuccess: handleSuccess,
	});

	const createCategoryMutation = useMutation({
		mutationFn: (payload: { name: string; description: string | null }) =>
			createCategory({ data: payload }),
		onSuccess: async () => {
			options?.onSuccess?.();
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY }),
			]);
		},
	});

	const updateCategoryMutation = useMutation({
		mutationFn: (payload: {
			id: string;
			name?: string;
			description?: string | null;
		}) => updateCategory({ data: payload }),
		onSuccess: async () => {
			options?.onSuccess?.();
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY }),
			]);
		},
	});

	const deleteCategoryMutation = useMutation({
		mutationFn: (id: string) => deleteCategory({ data: { id } }),
		onSuccess: async () => {
			options?.onSuccess?.();
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY }),
			]);
		},
	});

	const registerInventoryMovementMutation = useMutation({
		mutationFn: (payload: {
			productId: string;
			type: "restock" | "waste" | "adjustment";
			quantity: number;
			restockMode?: "add_to_stock" | "set_as_total";
			notes: string | null;
		}) => registerInventoryMovement({ data: payload }),
		onSuccess: handleSuccess,
	});

	return {
		createProductMutation,
		updateProductMutation,
		deleteProductMutation,
		createCategoryMutation,
		updateCategoryMutation,
		deleteCategoryMutation,
		registerInventoryMovementMutation,
	};
}
