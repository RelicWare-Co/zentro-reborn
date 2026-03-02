import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowLeftRight,
	Lock,
	Minus,
	Plus,
	Search,
	Trash2,
	Users,
	XIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { searchCreditAccounts } from "@/features/credit/credit.functions";
import { createCustomer } from "@/features/customers/customers.functions";
import {
	closeShift,
	createPosSale,
	getPosBootstrap,
	getShiftCloseSummary,
	openShift,
	registerCashMovement,
	searchPosCustomers,
	searchPosProducts,
} from "@/features/pos/pos.functions";

export const Route = createFileRoute("/_auth/pos")({
	loader: () => getPosBootstrap(),
	component: PosPage,
});

type Product = Awaited<ReturnType<typeof searchPosProducts>>["data"][number];
type PosCustomer = Awaited<
	ReturnType<typeof searchPosCustomers>
>["data"][number];
type CreditAccount = Awaited<
	ReturnType<typeof searchCreditAccounts>
>["data"][number];

type CartItemModifier = {
	id: string;
	name: string;
	price: number;
	quantity: number;
};

type CartItem = {
	id: string; // Unique ID for cart item to allow multiple same-products with different modifiers
	product: Product;
	quantity: number;
	modifiers: CartItemModifier[];
	discountAmount: number;
};

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatPaymentMethodLabel(method: string) {
	switch (method) {
		case "cash":
			return "Efectivo";
		case "card":
			return "Tarjeta";
		case "transfer_nequi":
			return "Nequi";
		case "transfer_bancolombia":
			return "Bancolombia";
		default:
			return method.replaceAll("_", " ");
	}
}

function PosPage() {
	const bootstrapData = Route.useLoaderData();
	const queryClient = useQueryClient();
	const [activeCategoryId, setActiveCategoryId] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [cart, setCart] = useState<CartItem[]>([]);
	const [discountInput, setDiscountInput] = useState("0");
	const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
	const [selectedProductForModifiers, setSelectedProductForModifiers] =
		useState<Product | null>(null);
	const [modifierQuantities, setModifierQuantities] = useState<
		Record<string, number>
	>({});

	// Shift & Cash Management States
	const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
	const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
	const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
	const [startingCash, setStartingCash] = useState("");
	const [openShiftNotes, setOpenShiftNotes] = useState("");
	const [closeShiftNotes, setCloseShiftNotes] = useState("");
	const [movementType, setMovementType] = useState("inflow");
	const [movementAmount, setMovementAmount] = useState("");
	const [movementDescription, setMovementDescription] = useState("");
	const [closureAmounts, setClosureAmounts] = useState<Record<string, string>>(
		{},
	);
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] =
		useState(false);
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");
	const [newCustomerDocumentType, setNewCustomerDocumentType] = useState("CC");
	const [newCustomerDocumentNumber, setNewCustomerDocumentNumber] =
		useState("");

	// Checkout States
	const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
	const [payments, setPayments] = useState<
		{ id: string; method: string; amount: string; reference: string }[]
	>([{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" }]);
	const [isCreditSale, setIsCreditSale] = useState(false);

	const startingCashId = useId();
	const movementTypeId = useId();
	const movementAmountId = useId();
	const movementDescriptionId = useId();
	const openShiftNotesId = useId();
	const closeShiftNotesId = useId();
	const creditSaleId = useId();
	const discountInputId = useId();
	const customerNameId = useId();
	const customerPhoneId = useId();
	const customerDocumentTypeId = useId();
	const customerDocumentNumberId = useId();

	const { data: bootstrap = bootstrapData } = useQuery({
		queryKey: ["pos-bootstrap"],
		queryFn: () => getPosBootstrap(),
		initialData: bootstrapData,
	});

	const activeShift = bootstrap.activeShift;
	const categories = useMemo(
		() => [{ id: "all", name: "Todos" }, ...bootstrap.categories],
		[bootstrap.categories],
	);

	const { data: productSearchResult, isFetching: isProductsFetching } =
		useQuery({
			queryKey: ["pos-products", activeCategoryId, searchQuery],
			queryFn: () =>
				searchPosProducts({
					data: {
						searchQuery: searchQuery || null,
						categoryId: activeCategoryId === "all" ? null : activeCategoryId,
						limit: 100,
						cursor: 0,
					},
				}),
		});
	const filteredProducts = productSearchResult?.data ?? [];
	const regularProducts = useMemo(
		() => filteredProducts.filter((product) => !product.isModifier),
		[filteredProducts],
	);

	const modifierProducts = bootstrap.modifierProducts ?? [];

	const { data: customerSearchResult } = useQuery({
		queryKey: ["pos-customers"],
		queryFn: () =>
			searchPosCustomers({
				data: {
					limit: 100,
					cursor: 0,
				},
			}),
	});
	const customers: PosCustomer[] = customerSearchResult?.data ?? [];

	const { data: creditAccountsSearchResult } = useQuery({
		queryKey: ["credit-accounts-pos"],
		queryFn: () =>
			searchCreditAccounts({
				data: {
					limit: 100,
					cursor: 0,
				},
			}),
	});
	const creditAccounts: CreditAccount[] =
		creditAccountsSearchResult?.data ?? [];
	const creditAccountByCustomerId = useMemo(
		() =>
			new Map(
				creditAccounts.map((creditAccount) => [
					creditAccount.customerId,
					creditAccount,
				]),
			),
		[creditAccounts],
	);
	const selectedCustomerCreditAccount = selectedCustomerId
		? (creditAccountByCustomerId.get(selectedCustomerId) ?? null)
		: null;

	const { data: shiftCloseSummary, isFetching: isShiftSummaryFetching } =
		useQuery({
			queryKey: ["pos-shift-close-summary", activeShift?.id],
			queryFn: () =>
				getShiftCloseSummary({
					data: { shiftId: activeShift?.id ?? "" },
				}),
			enabled: isCloseShiftModalOpen && Boolean(activeShift?.id),
		});

	useEffect(() => {
		if (!isCloseShiftModalOpen || !shiftCloseSummary) {
			return;
		}

		setClosureAmounts(
			Object.fromEntries(
				shiftCloseSummary.summaryByMethod.map((row) => [
					row.paymentMethod,
					row.actualAmount != null
						? String(row.actualAmount)
						: row.paymentMethod === "cash"
							? ""
							: String(row.expectedAmount),
				]),
			),
		);
	}, [isCloseShiftModalOpen, shiftCloseSummary]);

	const openShiftMutation = useMutation({
		mutationFn: (payload: { startingCash: number; notes: string | null }) =>
			openShift({
				data: payload,
			}),
		onSuccess: async () => {
			setIsShiftOpenModalOpen(false);
			setStartingCash("");
			setOpenShiftNotes("");
			await queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] });
		},
	});

	const registerCashMovementMutation = useMutation({
		mutationFn: (payload: {
			shiftId: string;
			type: "expense" | "payout" | "inflow";
			amount: number;
			description: string;
		}) =>
			registerCashMovement({
				data: payload,
			}),
		onSuccess: async () => {
			setIsCashMovementModalOpen(false);
			setMovementAmount("");
			setMovementDescription("");
			setMovementType("inflow");
			await queryClient.invalidateQueries({
				queryKey: ["pos-shift-close-summary"],
			});
		},
	});

	const closeShiftMutation = useMutation({
		mutationFn: (payload: {
			shiftId: string;
			closures: Array<{ paymentMethod: string; actualAmount: number }>;
			notes: string | null;
		}) =>
			closeShift({
				data: payload,
			}),
		onSuccess: async () => {
			setIsCloseShiftModalOpen(false);
			setClosureAmounts({});
			setCloseShiftNotes("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
			]);
		},
	});

	const createPosSaleMutation = useMutation({
		mutationFn: (payload: {
			shiftId: string;
			customerId: string | null;
			discountAmount: number;
			items: Array<{
				productId: string;
				quantity: number;
				unitPrice: number;
				taxRate: number;
				modifiers: Array<{
					modifierProductId: string;
					quantity: number;
					unitPrice: number;
				}>;
			}>;
			payments: Array<{
				method: string;
				amount: number;
				reference: string | null;
			}>;
			isCreditSale: boolean;
		}) =>
			createPosSale({
				data: payload,
			}),
		onSuccess: async () => {
			setIsCheckoutModalOpen(false);
			setCart([]);
			setIsCreditSale(false);
			setDiscountInput("0");
			setPayments([
				{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
			]);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["pos-products"] }),
				queryClient.invalidateQueries({ queryKey: ["credit-accounts-pos"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
			]);
		},
	});

	const createCustomerMutation = useMutation({
		mutationFn: (payload: {
			name: string;
			phone: string | null;
			documentType: string | null;
			documentNumber: string | null;
		}) =>
			createCustomer({
				data: payload,
			}),
		onSuccess: async (result) => {
			setIsCreateCustomerModalOpen(false);
			setNewCustomerName("");
			setNewCustomerPhone("");
			setNewCustomerDocumentType("CC");
			setNewCustomerDocumentNumber("");
			setSelectedCustomerId(result.id);
			await queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
		},
	});

	const addPaymentMethod = () => {
		setPayments((prevPayments) => [
			...prevPayments,
			{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
		]);
	};
	const removePaymentMethod = (index: number) => {
		setPayments((prevPayments) => prevPayments.filter((_, i) => i !== index));
	};
	const updatePayment = (
		index: number,
		field: "method" | "amount" | "reference",
		value: string,
	) => {
		setPayments((prevPayments) =>
			prevPayments.map((payment, paymentIndex) => {
				if (paymentIndex !== index) {
					return payment;
				}

				return {
					...payment,
					[field]: value,
				};
			}),
		);
	};

	const handleOpenShift = useCallback(() => {
		const parsedStartingCash = Number(startingCash);
		if (!Number.isFinite(parsedStartingCash) || parsedStartingCash < 0) {
			return;
		}

		openShiftMutation.mutate({
			startingCash: parsedStartingCash,
			notes: openShiftNotes.trim() || null,
		});
	}, [openShiftMutation, openShiftNotes, startingCash]);

	const handleCashMovement = useCallback(() => {
		if (!activeShift) {
			return;
		}

		const parsedAmount = Number(movementAmount);
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return;
		}
		if (!movementDescription.trim()) {
			return;
		}

		registerCashMovementMutation.mutate({
			shiftId: activeShift.id,
			type: movementType as "expense" | "payout" | "inflow",
			amount: parsedAmount,
			description: movementDescription.trim(),
		});
	}, [
		activeShift,
		movementAmount,
		movementDescription,
		movementType,
		registerCashMovementMutation,
	]);

	const handleCloseShift = useCallback(() => {
		if (!activeShift || !shiftCloseSummary) {
			return;
		}

		const closures = shiftCloseSummary.summaryByMethod.map((summaryRow) => ({
			paymentMethod: summaryRow.paymentMethod,
			actualAmount: Number(closureAmounts[summaryRow.paymentMethod] ?? 0),
		}));

		if (
			closures.some(
				(closure) =>
					!Number.isFinite(closure.actualAmount) || closure.actualAmount < 0,
			)
		) {
			return;
		}

		closeShiftMutation.mutate({
			shiftId: activeShift.id,
			closures,
			notes: closeShiftNotes.trim() || null,
		});
	}, [
		activeShift,
		closeShiftMutation,
		closeShiftNotes,
		closureAmounts,
		shiftCloseSummary,
	]);

	const handleCreateCustomer = () => {
		if (!newCustomerName.trim()) {
			return;
		}

		createCustomerMutation.mutate({
			name: newCustomerName.trim(),
			phone: newCustomerPhone.trim() || null,
			documentType: newCustomerDocumentNumber.trim()
				? newCustomerDocumentType
				: null,
			documentNumber: newCustomerDocumentNumber.trim() || null,
		});
	};

	const handleFinalizeSale = useCallback(() => {
		if (!activeShift || cart.length === 0) {
			return;
		}

		const saleDiscountAmount = Math.max(
			0,
			Math.round(Number(discountInput) || 0),
		);

		const salePayments = isCreditSale
			? []
			: payments
					.map((paymentMethod) => ({
						method: paymentMethod.method,
						amount: Number(paymentMethod.amount),
						reference: paymentMethod.reference.trim() || null,
					}))
					.filter((paymentMethod) => paymentMethod.amount > 0);

		createPosSaleMutation.mutate({
			shiftId: activeShift.id,
			customerId: selectedCustomerId || null,
			discountAmount: saleDiscountAmount,
			items: cart.map((item) => ({
				productId: item.product.id,
				quantity: item.quantity,
				unitPrice: item.product.price,
				taxRate: item.product.taxRate,
				discountAmount: item.discountAmount,
				modifiers: item.modifiers.map((modifier) => ({
					modifierProductId: modifier.id,
					quantity: modifier.quantity,
					unitPrice: modifier.price,
				})),
			})),
			payments: salePayments,
			isCreditSale,
		});
	}, [
		activeShift,
		cart,
		createPosSaleMutation,
		isCreditSale,
		payments,
		discountInput,
		selectedCustomerId,
	]);

	const buildModifierSignature = useCallback(
		(modifiers: CartItemModifier[]) => {
			return modifiers
				.slice()
				.sort((modifierA, modifierB) =>
					modifierA.id.localeCompare(modifierB.id),
				)
				.map((modifier) => `${modifier.id}:${modifier.quantity}`)
				.join("|");
		},
		[],
	);

	const addToCart = useCallback(
		(product: Product, modifiers: CartItemModifier[]) => {
			setCart((prevCart) => {
				const targetModifierSignature = buildModifierSignature(modifiers);
				const existingItem = prevCart.find(
					(item) =>
						item.product.id === product.id &&
						buildModifierSignature(item.modifiers) === targetModifierSignature,
				);
				if (existingItem) {
					return prevCart.map((item) =>
						item.id === existingItem.id
							? { ...item, quantity: item.quantity + 1 }
							: item,
					);
				}
				return [
					...prevCart,
					{
						id: crypto.randomUUID(),
						product,
						quantity: 1,
						modifiers,
						discountAmount: 0,
					},
				];
			});
		},
		[buildModifierSignature],
	);

	const handleProductSelection = useCallback(
		(product: Product) => {
			if (modifierProducts.length === 0) {
				addToCart(product, []);
				return;
			}

			setSelectedProductForModifiers(product);
			setModifierQuantities({});
			setIsModifierModalOpen(true);
		},
		[addToCart, modifierProducts.length],
	);

	const updateModifierQuantity = useCallback(
		(modifierId: string, delta: number) => {
			setModifierQuantities((previousQuantities) => {
				const currentValue = previousQuantities[modifierId] ?? 0;
				const nextValue = Math.max(0, currentValue + delta);
				return {
					...previousQuantities,
					[modifierId]: nextValue,
				};
			});
		},
		[],
	);

	const handleConfirmModifiers = useCallback(() => {
		if (!selectedProductForModifiers) {
			return;
		}

		const selectedModifiers = modifierProducts
			.map((modifierProduct) => ({
				id: modifierProduct.id,
				name: modifierProduct.name,
				price: modifierProduct.price,
				quantity: modifierQuantities[modifierProduct.id] ?? 0,
			}))
			.filter((modifierProduct) => modifierProduct.quantity > 0);

		addToCart(selectedProductForModifiers, selectedModifiers);
		setIsModifierModalOpen(false);
		setSelectedProductForModifiers(null);
		setModifierQuantities({});
	}, [
		addToCart,
		modifierProducts,
		modifierQuantities,
		selectedProductForModifiers,
	]);

	const handleQuickAddWithoutModifiers = useCallback(() => {
		if (!selectedProductForModifiers) {
			return;
		}

		addToCart(selectedProductForModifiers, []);
		setIsModifierModalOpen(false);
		setSelectedProductForModifiers(null);
		setModifierQuantities({});
	}, [addToCart, selectedProductForModifiers]);

	const removeFromCart = useCallback((cartItemId: string) => {
		setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
	}, []);

	const updateQuantity = useCallback((cartItemId: string, delta: number) => {
		setCart((prevCart) => {
			return prevCart
				.map((item) => {
					if (item.id === cartItemId) {
						const newQuantity = item.quantity + delta;
						return { ...item, quantity: newQuantity > 0 ? newQuantity : 0 };
					}
					return item;
				})
				.filter((item) => item.quantity > 0);
		});
	}, []);

	const clearCart = useCallback(() => setCart([]), []);

	const updateItemDiscount = useCallback(
		(cartItemId: string, nextDiscountValue: string) => {
			const parsedDiscount = Math.max(
				0,
				Math.round(Number(nextDiscountValue) || 0),
			);

			setCart((prevCart) =>
				prevCart.map((item) => {
					if (item.id !== cartItemId) {
						return item;
					}

					const lineBaseAmount =
						item.product.price * item.quantity +
						item.modifiers.reduce(
							(sum, modifier) =>
								sum + modifier.price * modifier.quantity * item.quantity,
							0,
						);

					return {
						...item,
						discountAmount: Math.min(parsedDiscount, lineBaseAmount),
					};
				}),
			);
		},
		[],
	);

	const getProductQuantity = useCallback(
		(productId: string) => {
			return cart
				.filter((item) => item.product.id === productId)
				.reduce((sum, item) => sum + item.quantity, 0);
		},
		[cart],
	);

	const subTotal = cart.reduce((sum, item) => {
		const itemTotal = item.product.price * item.quantity;
		const modifiersTotal = item.modifiers.reduce(
			(modifierTotal, modifier) =>
				modifierTotal + modifier.price * modifier.quantity * item.quantity,
			0,
		);

		return sum + itemTotal + modifiersTotal;
	}, 0);

	const tax = cart.reduce(
		(sum, item) =>
			sum +
			Math.round(
				(item.product.price * item.quantity * item.product.taxRate) / 100,
			),
		0,
	);
	const saleDiscountAmount = Math.max(
		0,
		Math.round(Number(discountInput) || 0),
	);
	const itemsDiscountAmount = cart.reduce(
		(sum, item) => sum + item.discountAmount,
		0,
	);
	const discountAmount = saleDiscountAmount + itemsDiscountAmount;
	const totalAmount = Math.max(0, subTotal + tax - discountAmount);

	const totalPaid = payments.reduce(
		(sum, paymentMethod) => sum + (Number(paymentMethod.amount) || 0),
		0,
	);
	const paymentDifference = totalAmount - totalPaid;
	const hasPaymentDifference = paymentDifference !== 0;
	const projectedCreditBalance =
		(selectedCustomerCreditAccount?.balance ?? 0) + totalAmount;
	const cashSummary = shiftCloseSummary?.summaryByMethod.find(
		(summaryRow) => summaryRow.paymentMethod === "cash",
	);
	const hasInvalidCloseAmounts =
		shiftCloseSummary?.summaryByMethod.some((summaryRow) => {
			const amount = Number(closureAmounts[summaryRow.paymentMethod]);
			return !Number.isFinite(amount) || amount < 0;
		}) ?? false;
	const canOpenShift =
		startingCash.trim().length > 0 &&
		Number.isFinite(Number(startingCash)) &&
		Number(startingCash) >= 0;
	const canRegisterCashMovement =
		Boolean(activeShift) &&
		movementDescription.trim().length > 0 &&
		Number.isFinite(Number(movementAmount)) &&
		Number(movementAmount) > 0;

	return (
		<div className="flex flex-col h-full w-full bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
			{/* Top Header: Shift & Client Info */}
			<header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 bg-[var(--color-carbon)] z-10">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2 text-sm">
						<span
							className={`w-2.5 h-2.5 rounded-full ${
								activeShift
									? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
									: "bg-gray-500"
							}`}
						></span>
						<span className="font-semibold text-white">
							{activeShift?.terminalName || "Caja Principal"}
						</span>
						<span className="text-gray-400 text-xs px-1.5 py-0.5 bg-gray-800 rounded-md">
							{activeShift ? "Abierta" : "Cerrada"}
						</span>
					</div>
					<Separator orientation="vertical" className="h-5 border-gray-700" />
					<div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800 focus-within:border-gray-600 transition-colors">
						<Users className="w-4 h-4 text-gray-400" />
						<select
							value={selectedCustomerId}
							onChange={(event) => setSelectedCustomerId(event.target.value)}
							className="bg-transparent text-sm text-white outline-none border-none focus:ring-0 cursor-pointer min-w-[150px] appearance-none"
							aria-label="Seleccionar cliente"
						>
							<option value="" className="bg-gray-900">
								Cliente Mostrador
							</option>
							{customers.map((customer) => (
								<option
									key={customer.id}
									value={customer.id}
									className="bg-gray-900"
								>
									{customer.name}
								</option>
							))}
						</select>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setIsCreateCustomerModalOpen(true)}
							className="h-7 px-2 text-xs text-[var(--color-voltage)] hover:text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10"
						>
							<Plus className="w-3.5 h-3.5 mr-1" />
							Cliente
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{!activeShift && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsShiftOpenModalOpen(true)}
							className="h-9 border-[var(--color-voltage)]/40 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/20 transition-all"
						>
							Abrir Turno
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsCashMovementModalOpen(true)}
						disabled={!activeShift}
						className="h-9 border-gray-700 bg-gray-900/50 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-600 transition-all"
					>
						<ArrowLeftRight className="w-4 h-4 mr-2" />
						Movimiento de Caja
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsCloseShiftModalOpen(true)}
						disabled={!activeShift}
						className="h-9 border-red-900/30 bg-red-900/10 text-red-400 hover:text-red-300 hover:bg-red-900/30 hover:border-red-900/50 transition-all"
					>
						<Lock className="w-4 h-4 mr-2" />
						Cerrar Turno
					</Button>
				</div>
			</header>

			<div className="flex flex-1 min-h-0">
				{/* Left Panel: Menu */}
				<div className="flex-1 flex flex-col min-w-0 border-r border-gray-800 h-full">
					{/* Categories & Search */}
					<div className="p-4 space-y-4 shrink-0 border-b border-gray-800/50 bg-[#0a0a0a]">
						<div className="flex items-center gap-4">
							<div className="relative flex-1 max-w-md">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
								<Input
									placeholder="Buscar productos, código de barras..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9 h-10 bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus-visible:border-[var(--color-voltage)] focus-visible:ring-1 focus-visible:ring-[var(--color-voltage)] rounded-lg transition-all"
								/>
							</div>
						</div>

						<ScrollArea className="w-full whitespace-nowrap">
							<div className="flex w-max space-x-1.5 pb-2">
								{categories.map((category) => (
									<Button
										key={category.id}
										variant={
											activeCategoryId === category.id ? "default" : "outline"
										}
										onClick={() => setActiveCategoryId(category.id)}
										className={`rounded-lg px-4 h-8 text-sm font-medium transition-all ${
											activeCategoryId === category.id
												? "bg-[var(--color-voltage)] text-black hover:bg-[#c9e605] border-transparent shadow-sm"
												: "bg-transparent border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
										}`}
									>
										{category.name}
									</Button>
								))}
							</div>
							<ScrollBar orientation="horizontal" className="invisible" />
						</ScrollArea>
					</div>

					{/* Product Grid - Compact Text-Oriented Layout */}
					<ScrollArea className="flex-1 p-4 min-h-0 bg-[#0a0a0a]">
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">
							{regularProducts.map((product) => {
								const qty = getProductQuantity(product.id);
								const isOutOfStock =
									product.trackInventory && product.stock <= 0;
								return (
									<button
										key={product.id}
										type="button"
										onClick={() => handleProductSelection(product)}
										disabled={!activeShift || isOutOfStock}
										className="text-left bg-[#151515] rounded-xl p-3 border border-gray-800/80 flex flex-col justify-between transition-all hover:border-[var(--color-voltage)]/50 hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-voltage)] group min-h-[100px] relative overflow-hidden"
									>
										{qty > 0 && (
											<div className="absolute top-0 right-0 bg-[var(--color-voltage)] text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10">
												x{qty}
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
							})}
						</div>
						{isProductsFetching && (
							<div className="flex flex-col items-center justify-center h-16 text-gray-500">
								<p>Cargando productos...</p>
							</div>
						)}
						{regularProducts.length === 0 && (
							<div className="flex flex-col items-center justify-center h-48 text-gray-500">
								<p>No se encontraron productos.</p>
							</div>
						)}
					</ScrollArea>
				</div>

				{/* Right Panel: Order Detail */}
				<div className="w-[380px] bg-[var(--color-carbon)] flex flex-col shrink-0 h-full border-l border-gray-800">
					{/* Order Header */}
					<div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
						<div>
							<h2 className="text-lg font-bold text-white leading-none">
								Orden Actual
							</h2>
							<p className="text-xs text-gray-400 mt-1">
								{cart.reduce((sum, item) => sum + item.quantity, 0)} artículos
							</p>
						</div>
						<Button
							variant="ghost"
							onClick={clearCart}
							disabled={cart.length === 0}
							className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-medium h-8 px-2 text-xs rounded-md transition-all"
							aria-label="Limpiar carrito"
						>
							<Trash2 className="h-4 w-4 mr-1" />
							Limpiar
						</Button>
					</div>

					{/* Selected Items */}
					<ScrollArea className="flex-1 px-2 py-1 min-h-0 bg-[#0f0f0f]">
						<div className="space-y-1 py-2">
							{cart.map((item) => (
								<div
									key={item.id}
									className="bg-[#151515] p-3 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors group"
								>
									<div className="flex flex-col gap-2">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<h4 className="font-medium text-sm text-white truncate leading-tight">
													{item.product.name}
												</h4>
												<div className="text-xs text-gray-500 font-medium mt-0.5 tabular-nums">
													{formatCurrency(item.product.price)} / un
												</div>
												{item.modifiers.length > 0 && (
													<div className="mt-1 flex flex-wrap gap-1.5">
														{item.modifiers.map((modifier) => (
															<span
																key={`${item.id}-${modifier.id}`}
																className="text-[10px] bg-black/50 border border-gray-800 rounded px-1.5 py-0.5 text-gray-300"
															>
																x{modifier.quantity} {modifier.name}
															</span>
														))}
													</div>
												)}
											</div>
											<div className="font-bold text-sm text-white text-right shrink-0 tabular-nums">
												{formatCurrency(
													item.product.price * item.quantity +
														item.modifiers.reduce(
															(sum, modifier) =>
																sum +
																modifier.price *
																	modifier.quantity *
																	item.quantity,
															0,
														) -
														item.discountAmount,
												)}
											</div>
										</div>

										<div className="mt-1">
											<label
												htmlFor={`item-discount-${item.id}`}
												className="text-[10px] text-gray-500"
											>
												Descuento ítem
											</label>
											<div className="relative mt-1">
												<span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
													$
												</span>
												<Input
													id={`item-discount-${item.id}`}
													type="number"
													min={0}
													value={item.discountAmount}
													onChange={(event) =>
														updateItemDiscount(item.id, event.target.value)
													}
													className="h-8 pl-6 bg-black/50 border-gray-800/80 text-xs"
												/>
											</div>
										</div>

										{/* Controles de cantidad compactos */}
										<div className="flex items-center justify-between mt-1">
											<div className="flex items-center bg-black/50 rounded-md border border-gray-800/80">
												<button
													type="button"
													onClick={() => updateQuantity(item.id, -1)}
													className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-l-md transition-colors disabled:opacity-50"
													aria-label="Disminuir cantidad"
												>
													<Minus className="h-3 w-3" />
												</button>
												<div className="w-8 text-center text-sm font-semibold text-white">
													{item.quantity}
												</div>
												<button
													type="button"
													onClick={() => updateQuantity(item.id, 1)}
													className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-r-md transition-colors"
													aria-label="Aumentar cantidad"
												>
													<Plus className="h-3 w-3" />
												</button>
											</div>
											<button
												type="button"
												onClick={() => removeFromCart(item.id)}
												className="text-gray-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-400/10 transition-colors"
												aria-label="Eliminar producto"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							))}
							{cart.length === 0 && (
								<div className="flex flex-col items-center justify-center h-40 text-gray-500 space-y-2">
									<div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
										<Search className="h-5 w-5 text-gray-600" />
									</div>
									<p className="text-sm">Escanea o selecciona un producto</p>
								</div>
							)}
						</div>
					</ScrollArea>

					{/* Payment Summary */}
					<div className="p-4 bg-[#0a0a0a] border-t border-gray-800 shrink-0">
						<div className="space-y-3">
							<div className="space-y-1.5">
								<div className="flex justify-between text-sm text-gray-400">
									<span>Subtotal</span>
									<span className="text-gray-200 tabular-nums">
										{formatCurrency(subTotal)}
									</span>
								</div>
								<div className="flex justify-between text-sm text-gray-400">
									<span>Impuestos</span>
									<span className="text-gray-200 tabular-nums">
										{formatCurrency(tax)}
									</span>
								</div>
								{discountAmount > 0 && (
									<div className="flex justify-between text-sm text-red-400">
										<span>Descuento</span>
										<span className="tabular-nums">
											-{formatCurrency(discountAmount)}
										</span>
									</div>
								)}

								<div className="flex justify-between items-center pt-2 border-t border-gray-800/80 mt-2">
									<span className="font-bold text-base text-white">Total</span>
									<span className="font-bold text-xl text-[var(--color-voltage)] tabular-nums">
										{formatCurrency(totalAmount)}
									</span>
								</div>
							</div>

							<Button
								className="w-full h-12 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-bold text-base rounded-xl mt-2 transition-all shadow-[0_4px_14px_rgba(201,230,5,0.2)] hover:shadow-[0_6px_20px_rgba(201,230,5,0.3)]"
								disabled={cart.length === 0 || !activeShift}
								onClick={() => setIsCheckoutModalOpen(true)}
							>
								Cobrar
							</Button>
						</div>
					</div>
				</div>
			</div>
			{/* Shift Modals */}

			{/* Open Shift Modal */}
			<Dialog
				open={isShiftOpenModalOpen}
				onOpenChange={setIsShiftOpenModalOpen}
			>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Apertura de Turno</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-gray-400 mb-4">
							Ingresa la base de efectivo inicial en la caja para comenzar a
							operar.
						</p>
						<div className="grid gap-2">
							<label
								htmlFor={startingCashId}
								className="text-sm font-medium text-gray-300"
							>
								Base en Efectivo
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									id={startingCashId}
									type="number"
									placeholder="0"
									value={startingCash}
									onChange={(e) => setStartingCash(e.target.value)}
									className="pl-7 bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)] text-lg h-12"
								/>
							</div>
						</div>
						<div className="grid gap-2 mt-4">
							<label
								htmlFor={openShiftNotesId}
								className="text-sm font-medium text-gray-300"
							>
								Notas del turno
							</label>
							<Textarea
								id={openShiftNotesId}
								placeholder="Opcional: observaciones de apertura"
								value={openShiftNotes}
								onChange={(event) => setOpenShiftNotes(event.target.value)}
								className="min-h-[72px] bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
							/>
						</div>
						{openShiftMutation.error instanceof Error && (
							<p className="text-sm text-red-400 mt-3">
								{openShiftMutation.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsShiftOpenModalOpen(false)}
							className="text-gray-400 hover:text-white hover:bg-gray-800"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleOpenShift}
							disabled={!canOpenShift || openShiftMutation.isPending}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{openShiftMutation.isPending ? "Abriendo..." : "Abrir Turno"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Cash Movement Modal */}
			<Dialog
				open={isCashMovementModalOpen}
				onOpenChange={setIsCashMovementModalOpen}
			>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Movimiento de Caja</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{!activeShift && (
							<p className="text-sm text-red-400">
								Debes abrir un turno antes de registrar movimientos.
							</p>
						)}
						<div className="grid gap-2">
							<label
								htmlFor={movementTypeId}
								className="text-sm font-medium text-gray-300"
							>
								Tipo de Movimiento
							</label>
							<select
								id={movementTypeId}
								value={movementType}
								onChange={(e) => setMovementType(e.target.value)}
								className="flex h-10 w-full rounded-md border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-voltage)] focus:border-transparent"
							>
								<option value="inflow">Ingreso (Entrada manual)</option>
								<option value="expense">Gasto Operativo</option>
								<option value="payout">Pago a Proveedor</option>
							</select>
						</div>
						<div className="grid gap-2">
							<label
								htmlFor={movementAmountId}
								className="text-sm font-medium text-gray-300"
							>
								Monto
							</label>
							<Input
								id={movementAmountId}
								type="number"
								placeholder="0"
								value={movementAmount}
								onChange={(e) => setMovementAmount(e.target.value)}
								className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
							/>
						</div>
						<div className="grid gap-2">
							<label
								htmlFor={movementDescriptionId}
								className="text-sm font-medium text-gray-300"
							>
								Descripción
							</label>
							<Input
								id={movementDescriptionId}
								placeholder="Ej. Pago de internet, Base adicional..."
								value={movementDescription}
								onChange={(e) => setMovementDescription(e.target.value)}
								className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
							/>
						</div>
						{registerCashMovementMutation.error instanceof Error && (
							<p className="text-sm text-red-400">
								{registerCashMovementMutation.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCashMovementModalOpen(false)}
							className="text-gray-400 hover:text-white hover:bg-gray-800"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleCashMovement}
							disabled={
								!canRegisterCashMovement ||
								registerCashMovementMutation.isPending
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{registerCashMovementMutation.isPending
								? "Registrando..."
								: "Registrar Movimiento"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Close Shift Modal */}
			<Dialog
				open={isCloseShiftModalOpen}
				onOpenChange={setIsCloseShiftModalOpen}
			>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Cierre de Turno</DialogTitle>
					</DialogHeader>
					<div className="py-4 space-y-6">
						<div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
							<h4 className="text-sm font-medium text-gray-400 mb-3">
								Resumen del Sistema
							</h4>
							{isShiftSummaryFetching && (
								<p className="text-sm text-gray-400">Cargando resumen...</p>
							)}
							{shiftCloseSummary && (
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-300">Base inicial</span>
										<span className="text-white font-medium tabular-nums">
											{formatCurrency(shiftCloseSummary.shift.startingCash)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-300">Efectivo esperado</span>
										<span className="text-white font-medium tabular-nums">
											{formatCurrency(cashSummary?.expectedAmount ?? 0)}
										</span>
									</div>
									<Separator className="my-2 border-gray-700" />
									{shiftCloseSummary.summaryByMethod
										.filter((summaryRow) => summaryRow.paymentMethod !== "cash")
										.map((summaryRow) => (
											<div
												key={`expected-${summaryRow.paymentMethod}`}
												className="flex justify-between"
											>
												<span className="text-gray-300">
													{formatPaymentMethodLabel(summaryRow.paymentMethod)}
												</span>
												<span className="text-white font-medium tabular-nums">
													{formatCurrency(summaryRow.expectedAmount)}
												</span>
											</div>
										))}
									<Separator className="my-2 border-gray-700" />
									<div className="flex justify-between text-base">
										<span className="text-gray-200 font-semibold">
											Total Esperado
										</span>
										<span className="text-[var(--color-voltage)] font-bold tabular-nums">
											{formatCurrency(shiftCloseSummary.totalExpected)}
										</span>
									</div>
								</div>
							)}
						</div>

						{shiftCloseSummary && (
							<div className="grid gap-3">
								{shiftCloseSummary.summaryByMethod.map((summaryRow) => (
									<div key={summaryRow.paymentMethod} className="grid gap-2">
										<label
											htmlFor={`closure-${summaryRow.paymentMethod}`}
											className="text-sm font-medium text-gray-300"
										>
											{formatPaymentMethodLabel(summaryRow.paymentMethod)}{" "}
											(Esperado: {formatCurrency(summaryRow.expectedAmount)})
										</label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
												$
											</span>
											<Input
												id={`closure-${summaryRow.paymentMethod}`}
												type="number"
												placeholder="0"
												value={closureAmounts[summaryRow.paymentMethod] ?? ""}
												onChange={(event) =>
													setClosureAmounts((prevState) => ({
														...prevState,
														[summaryRow.paymentMethod]: event.target.value,
													}))
												}
												className="pl-7 bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
											/>
										</div>
										{closureAmounts[summaryRow.paymentMethod] && (
											<div
												className={`text-sm mt-1 flex items-center justify-between tabular-nums ${
													Number(closureAmounts[summaryRow.paymentMethod]) -
														summaryRow.expectedAmount ===
													0
														? "text-green-400"
														: "text-red-400"
												}`}
											>
												<span>Diferencia:</span>
												<span className="font-semibold">
													{formatCurrency(
														Number(closureAmounts[summaryRow.paymentMethod]) -
															summaryRow.expectedAmount,
													)}
												</span>
											</div>
										)}
									</div>
								))}
							</div>
						)}
						<div className="grid gap-2">
							<label
								htmlFor={closeShiftNotesId}
								className="text-sm font-medium text-gray-300"
							>
								Notas de cierre
							</label>
							<Textarea
								id={closeShiftNotesId}
								placeholder="Opcional: explica diferencias o novedades del cierre"
								value={closeShiftNotes}
								onChange={(event) => setCloseShiftNotes(event.target.value)}
								className="min-h-[72px] bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
							/>
						</div>
						{closeShiftMutation.error instanceof Error && (
							<p className="text-sm text-red-400">
								{closeShiftMutation.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCloseShiftModalOpen(false)}
							className="text-gray-400 hover:text-white hover:bg-gray-800"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleCloseShift}
							disabled={
								!activeShift ||
								!shiftCloseSummary ||
								hasInvalidCloseAmounts ||
								isShiftSummaryFetching ||
								closeShiftMutation.isPending
							}
							className="bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 border border-red-900/50"
						>
							{closeShiftMutation.isPending
								? "Cerrando..."
								: "Cerrar Turno Definitivamente"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Checkout Modal */}
			<Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="text-xl">Cobrar Orden</DialogTitle>
					</DialogHeader>
					<div className="py-4 space-y-6">
						<div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-lg border border-gray-800">
							<span className="text-gray-400 font-medium">Total a Pagar</span>
							<span className="text-3xl font-bold text-[var(--color-voltage)]">
								{formatCurrency(totalAmount)}
							</span>
						</div>

						<div className="space-y-4">
							<div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800 space-y-2">
								<label
									className="text-sm font-medium text-gray-300"
									htmlFor={discountInputId}
								>
									Descuento total
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
										$
									</span>
									<Input
										id={discountInputId}
										type="number"
										min={0}
										value={discountInput}
										onChange={(event) => setDiscountInput(event.target.value)}
										className="pl-7 h-10 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)]"
									/>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<h4 className="text-sm font-semibold text-gray-300">
									Métodos de Pago
								</h4>
								<div className="flex items-center gap-2">
									<input
										type="checkbox"
										id={creditSaleId}
										checked={isCreditSale}
										onChange={(e) => setIsCreditSale(e.target.checked)}
										className="w-4 h-4 rounded border-gray-700 bg-[#0a0a0a] text-[var(--color-voltage)] focus:ring-[var(--color-voltage)]"
									/>
									<label
										htmlFor={creditSaleId}
										className="text-sm text-gray-400 cursor-pointer"
									>
										Venta a Crédito (Fiado)
									</label>
								</div>
							</div>

							{isCreditSale && !selectedCustomerId && (
								<p className="text-sm text-amber-400">
									Selecciona un cliente para registrar venta a crédito.
								</p>
							)}

							{selectedCustomerCreditAccount && (
								<div className="bg-amber-900/20 border border-amber-900/40 rounded-lg p-3 space-y-1 text-sm">
									<p className="text-amber-300 font-medium">
										Saldo pendiente actual:{" "}
										{formatCurrency(selectedCustomerCreditAccount.balance)}
									</p>
									{isCreditSale && (
										<p className="text-amber-200">
											Saldo proyectado tras esta venta:{" "}
											{formatCurrency(projectedCreditBalance)}
										</p>
									)}
								</div>
							)}

							{!isCreditSale && (
								<div className="space-y-3">
									{payments.map((payment, index) => (
										<div
											key={payment.id}
											className="flex flex-col gap-2 p-3 bg-[#0a0a0a] rounded-lg border border-gray-800 relative group"
										>
											{payments.length > 1 && (
												<button
													type="button"
													onClick={() => removePaymentMethod(index)}
													className="absolute -top-2 -right-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
													aria-label="Eliminar método de pago"
												>
													<XIcon className="w-3 h-3" />
												</button>
											)}
											<div className="flex gap-2">
												<select
													value={payment.method}
													onChange={(e) =>
														updatePayment(index, "method", e.target.value)
													}
													className="flex-1 h-10 rounded-md border border-gray-700 bg-[#151515] px-3 text-sm text-white focus:outline-none focus:border-[var(--color-voltage)]"
												>
													<option value="cash">Efectivo</option>
													<option value="card">Tarjeta</option>
													<option value="transfer_nequi">Nequi</option>
													<option value="transfer_bancolombia">
														Bancolombia
													</option>
												</select>
												<div className="relative flex-1">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
														$
													</span>
													<Input
														type="number"
														placeholder="Monto"
														value={payment.amount}
														onChange={(e) =>
															updatePayment(index, "amount", e.target.value)
														}
														className="pl-7 h-10 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)]"
													/>
												</div>
											</div>
											{payment.method !== "cash" && (
												<Input
													placeholder="Referencia (Ej. últimos 4 dígitos o voucher)"
													value={payment.reference}
													onChange={(e) =>
														updatePayment(index, "reference", e.target.value)
													}
													className="h-9 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)] text-sm"
												/>
											)}
										</div>
									))}

									<Button
										variant="outline"
										onClick={addPaymentMethod}
										className="w-full h-9 border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent"
									>
										<Plus className="w-4 h-4 mr-2" />
										Dividir Pago (Otro método)
									</Button>
								</div>
							)}
						</div>

						{!isCreditSale && (
							<div className="flex justify-between items-center text-sm pt-2 border-t border-gray-800">
								<span className="text-gray-400">Diferencia de pago:</span>
								<span
									className={`font-semibold ${
										paymentDifference === 0
											? "text-green-400"
											: paymentDifference > 0
												? "text-red-400"
												: "text-amber-400"
									}`}
								>
									{formatCurrency(Math.abs(paymentDifference))}
								</span>
							</div>
						)}
						{createPosSaleMutation.error instanceof Error && (
							<p className="text-sm text-red-400">
								{createPosSaleMutation.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCheckoutModalOpen(false)}
							className="text-gray-400 hover:text-white"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleFinalizeSale}
							disabled={
								!activeShift ||
								cart.length === 0 ||
								createPosSaleMutation.isPending ||
								(isCreditSale && !selectedCustomerId) ||
								(!isCreditSale && hasPaymentDifference)
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{createPosSaleMutation.isPending
								? "Procesando..."
								: isCreditSale
									? "Confirmar Fiado"
									: "Finalizar Venta"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modifier Selection Modal */}
			<Dialog
				open={isModifierModalOpen}
				onOpenChange={(isOpen) => {
					setIsModifierModalOpen(isOpen);
					if (!isOpen) {
						setSelectedProductForModifiers(null);
						setModifierQuantities({});
					}
				}}
			>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							Añadir modificadores · {selectedProductForModifiers?.name}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						{modifierProducts.length === 0 ? (
							<p className="text-sm text-gray-400">
								No hay modificadores configurados para este negocio.
							</p>
						) : (
							modifierProducts.map((modifierProduct) => (
								<div
									key={modifierProduct.id}
									className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0a] p-3"
								>
									<div>
										<p className="text-sm font-medium text-white">
											{modifierProduct.name}
										</p>
										<p className="text-xs text-gray-400">
											{formatCurrency(modifierProduct.price)} c/u
										</p>
									</div>
									<div className="flex items-center bg-black/50 rounded-md border border-gray-800/80">
										<button
											type="button"
											onClick={() =>
												updateModifierQuantity(modifierProduct.id, -1)
											}
											className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-l-md transition-colors"
										>
											<Minus className="h-3 w-3" />
										</button>
										<div className="w-9 text-center text-sm font-semibold text-white">
											{modifierQuantities[modifierProduct.id] ?? 0}
										</div>
										<button
											type="button"
											onClick={() =>
												updateModifierQuantity(modifierProduct.id, 1)
											}
											className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-r-md transition-colors"
										>
											<Plus className="h-3 w-3" />
										</button>
									</div>
								</div>
							))
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={handleQuickAddWithoutModifiers}
							className="text-gray-300 hover:text-white"
						>
							Agregar sin modificadores
						</Button>
						<Button
							onClick={handleConfirmModifiers}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							Confirmar selección
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Quick Customer Creation Modal */}
			<Dialog
				open={isCreateCustomerModalOpen}
				onOpenChange={setIsCreateCustomerModalOpen}
			>
				<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[450px]">
					<DialogHeader>
						<DialogTitle>Crear cliente rápido</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid gap-2">
							<label
								htmlFor={customerNameId}
								className="text-sm font-medium text-gray-300"
							>
								Nombre
							</label>
							<Input
								id={customerNameId}
								value={newCustomerName}
								onChange={(event) => setNewCustomerName(event.target.value)}
								placeholder="Nombre del cliente"
								className="bg-[#0a0a0a] border-gray-800 text-white"
							/>
						</div>
						<div className="grid gap-2">
							<label
								htmlFor={customerPhoneId}
								className="text-sm font-medium text-gray-300"
							>
								Teléfono
							</label>
							<Input
								id={customerPhoneId}
								value={newCustomerPhone}
								onChange={(event) => setNewCustomerPhone(event.target.value)}
								placeholder="Opcional"
								className="bg-[#0a0a0a] border-gray-800 text-white"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-2">
								<label
									htmlFor={customerDocumentTypeId}
									className="text-sm font-medium text-gray-300"
								>
									Tipo doc
								</label>
								<select
									id={customerDocumentTypeId}
									value={newCustomerDocumentType}
									onChange={(event) =>
										setNewCustomerDocumentType(event.target.value)
									}
									className="flex h-10 w-full rounded-md border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-voltage)]"
								>
									<option value="CC">CC</option>
									<option value="NIT">NIT</option>
									<option value="CE">CE</option>
									<option value="PAS">Pasaporte</option>
								</select>
							</div>
							<div className="grid gap-2">
								<label
									htmlFor={customerDocumentNumberId}
									className="text-sm font-medium text-gray-300"
								>
									Número doc
								</label>
								<Input
									id={customerDocumentNumberId}
									value={newCustomerDocumentNumber}
									onChange={(event) =>
										setNewCustomerDocumentNumber(event.target.value)
									}
									placeholder="Opcional"
									className="bg-[#0a0a0a] border-gray-800 text-white"
								/>
							</div>
						</div>
						{createCustomerMutation.error instanceof Error && (
							<p className="text-sm text-red-400">
								{createCustomerMutation.error.message}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCreateCustomerModalOpen(false)}
							className="text-gray-400 hover:text-white"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleCreateCustomer}
							disabled={
								!newCustomerName.trim() || createCustomerMutation.isPending
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{createCustomerMutation.isPending
								? "Creando..."
								: "Crear cliente"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
