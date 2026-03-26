import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { CartPanel } from "@/features/pos/components/CartPanel";
import { CashMovementModal } from "@/features/pos/components/modals/CashMovementModal";
import { CheckoutModal } from "@/features/pos/components/modals/CheckoutModal";
import { CloseShiftModal } from "@/features/pos/components/modals/CloseShiftModal";
import { CreateCustomerModal } from "@/features/pos/components/modals/CreateCustomerModal";
import { ModifierModal } from "@/features/pos/components/modals/ModifierModal";
import { OpenShiftModal } from "@/features/pos/components/modals/OpenShiftModal";
import { ShiftRequiredDialog } from "@/features/pos/components/modals/ShiftRequiredDialog";
import { PosHeader } from "@/features/pos/components/PosHeader";
import { ProductGrid } from "@/features/pos/components/ProductGrid";
import {
	useCreditAccounts,
	usePosCustomers,
	usePosProducts,
} from "@/features/pos/hooks";
import { useCreateCustomerModal } from "@/features/pos/hooks/useCreateCustomerModal";
import { useModifierModal } from "@/features/pos/hooks/useModifierModal";
import { usePosCart } from "@/features/pos/hooks/usePosCart";
import { usePosCheckout } from "@/features/pos/hooks/usePosCheckout";
import { usePosBootstrap } from "@/features/pos/hooks/usePosQueries";
import { usePosShift } from "@/features/pos/hooks/usePosShift";
import {
	getPosBootstrap,
	searchPosProducts,
} from "@/features/pos/pos.functions";
import { printThermalReceipt } from "@/features/pos/printing/printThermalReceipt";
import { buildSaleReceiptDocument } from "@/features/pos/printing/receiptDocuments";
import type { Category, Product } from "@/features/pos/types";
import { formatCurrency } from "@/features/pos/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_auth/pos")({
	loader: () => getPosBootstrap(),
	component: PosPage,
});

function PosPage() {
	const bootstrapData = Route.useLoaderData();

	// Local state (declared before queries to avoid reference errors)
	const [activeCategoryId, setActiveCategoryId] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [isShiftRequiredDialogOpen, setIsShiftRequiredDialogOpen] =
		useState(false);
	const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
	const deferredSearchQuery = useDeferredValue(searchQuery);

	// Data queries
	const { data: bootstrap = bootstrapData } = usePosBootstrap(bootstrapData);
	const { data: productSearchResult, isFetching: isProductsFetching } =
		usePosProducts(activeCategoryId, deferredSearchQuery);
	const { data: customerSearchResult } = usePosCustomers();
	const { data: creditAccountsSearchResult } = useCreditAccounts();

	// Derived data
	const activeShift = bootstrap.activeShift;
	const isMobile = useIsMobile();
	const categories = useMemo<Category[]>(
		() => [{ id: "all", name: "Todos" }, ...bootstrap.categories],
		[bootstrap.categories],
	);
	const filteredProducts = productSearchResult?.data ?? [];
	const modifierProducts = (bootstrap.modifierProducts ?? []) as Product[];
	const customers = customerSearchResult?.data ?? [];
	const creditAccounts = creditAccountsSearchResult?.data ?? [];
	const posSettings = bootstrap.settings;

	// Credit account lookup
	const customerById = useMemo(
		() => new Map(customers.map((customer) => [customer.id, customer])),
		[customers],
	);
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
	const selectedCustomer = selectedCustomerId
		? (customerById.get(selectedCustomerId) ?? null)
		: null;

	// Hooks
	const cart = usePosCart();
	const shift = usePosShift(activeShift, posSettings.paymentMethods);
	const handleSaleCreated = useCallback(
		(payload: {
			result: {
				saleId: string;
				status: string;
				subtotal: number;
				taxAmount: number;
				discountAmount: number;
				totalAmount: number;
				paidAmount: number;
				balanceDue: number;
			};
			snapshot: {
				cart: typeof cart.cart;
				payments: Array<{
					method: string;
					amount: number;
					reference: string | null;
				}>;
			};
		}) => {
			const receiptDocument = buildSaleReceiptDocument({
				documentId: payload.result.saleId,
				issuedAt: new Date(),
				status: payload.result.status,
				customerName: selectedCustomer?.name ?? "Cliente mostrador",
				customerMeta: formatPosCustomerMeta(selectedCustomer),
				terminalName:
					activeShift?.terminalName ?? posSettings.defaultTerminalName,
				items: payload.snapshot.cart.map((item) => ({
					name: item.product.name,
					quantity: item.quantity,
					unitPrice: item.product.price,
					totalAmount:
						item.product.price * item.quantity +
						item.modifiers.reduce(
							(sum, modifier) =>
								sum + modifier.price * modifier.quantity * item.quantity,
							0,
						) -
						item.discountAmount,
					discountAmount: item.discountAmount,
					modifiers: item.modifiers.map((modifier) => ({
						name: modifier.name,
						quantity: modifier.quantity,
						unitPrice: modifier.price,
					})),
				})),
				payments: payload.snapshot.payments,
				subtotal: payload.result.subtotal,
				taxAmount: payload.result.taxAmount,
				discountAmount: payload.result.discountAmount,
				totalAmount: payload.result.totalAmount,
				paidAmount: payload.result.paidAmount,
				balanceDue: payload.result.balanceDue,
			});

			printThermalReceipt(receiptDocument);
		},
		[
			activeShift?.terminalName,
			posSettings.defaultTerminalName,
			selectedCustomer,
		],
	);
	const checkout = usePosCheckout(
		activeShift?.id,
		cart.cart,
		cart.totals,
		selectedCustomerId,
		cart.discountInput,
		cart.clearCart,
		() => cart.setDiscountInput("0"),
		posSettings.paymentMethods,
		posSettings.allowCreditSales,
		handleSaleCreated,
	);
	const modifierModal = useModifierModal(cart.addToCart, modifierProducts);
	const createCustomer = useCreateCustomerModal((customerId) => {
		setSelectedCustomerId(customerId);
	});

	// Computed values for checkout modal
	const projectedCreditBalance =
		(selectedCustomerCreditAccount?.balance ?? 0) +
		checkout.remainingCreditAmount;
	const cartItemLabel = cart.totalItems === 1 ? "articulo" : "articulos";
	const mobileCartDescription =
		cart.totalItems > 0
			? "Revisa la orden y continua con el cobro"
			: "Agrega productos para empezar una venta";

	useEffect(() => {
		if (!isMobile) {
			setIsMobileCartOpen(false);
		}
	}, [isMobile]);

	const handleOpenShift = useCallback(() => {
		shift.setStartingCash(String(posSettings.defaultStartingCash));
		shift.setIsShiftOpenModalOpen(true);
	}, [posSettings.defaultStartingCash, shift]);

	const handleCategoryChange = useCallback((categoryId: string) => {
		setActiveCategoryId(categoryId);
	}, []);

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const clearSearchQuery = useCallback(() => {
		setSearchQuery("");
	}, []);

	const handleCustomerChange = useCallback((customerId: string) => {
		setSelectedCustomerId(customerId);
	}, []);

	const handleProductSelect = useCallback(
		(product: Product) => {
			if (!activeShift) {
				setIsShiftRequiredDialogOpen(true);
				return;
			}

			modifierModal.handleProductSelection(product);
		},
		[activeShift, modifierModal.handleProductSelection],
	);

	const handleOpenShiftFromDialog = useCallback(() => {
		setIsShiftRequiredDialogOpen(false);
		handleOpenShift();
	}, [handleOpenShift]);

	const handleCheckout = useCallback(() => {
		setIsMobileCartOpen(false);
		checkout.setIsCheckoutModalOpen(true);
	}, [checkout.setIsCheckoutModalOpen]);

	const handleBarcodeScan = useCallback(
		async (rawValue: string) => {
			const normalizedValue = rawValue.trim().toLowerCase();
			if (!normalizedValue) {
				return false;
			}

			const result = await searchPosProducts({
				data: {
					searchQuery: rawValue,
					categoryId: null,
					limit: 20,
					cursor: 0,
				},
			});

			const matchedProduct =
				result.data.find((product) => {
					const normalizedBarcode = product.barcode?.trim().toLowerCase();
					const normalizedSku = product.sku?.trim().toLowerCase();

					return (
						normalizedBarcode === normalizedValue ||
						normalizedSku === normalizedValue
					);
				}) ?? null;

			if (!matchedProduct) {
				return false;
			}

			if (!activeShift) {
				setIsShiftRequiredDialogOpen(true);
				return false;
			}

			cart.addToCart(matchedProduct, []);
			setSearchQuery("");
			return true;
		},
		[activeShift, cart],
	);

	const shouldAutoFocusSearch =
		!isMobileCartOpen &&
		!shift.isShiftOpenModalOpen &&
		!shift.isCashMovementModalOpen &&
		!shift.isCloseShiftModalOpen &&
		!modifierModal.isModifierModalOpen &&
		!createCustomer.isCreateCustomerModalOpen &&
		!isShiftRequiredDialogOpen &&
		!checkout.isCheckoutModalOpen;

	return (
		<div className="flex flex-col h-full w-full bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
			{/* Header */}
			<PosHeader
				activeShift={activeShift}
				defaultTerminalName={posSettings.defaultTerminalName}
				customers={customers}
				selectedCustomerId={selectedCustomerId}
				onCustomerChange={handleCustomerChange}
				onOpenShift={handleOpenShift}
				onCashMovement={() => shift.setIsCashMovementModalOpen(true)}
				onCloseShift={() => shift.setIsCloseShiftModalOpen(true)}
				onCreateCustomer={() =>
					createCustomer.setIsCreateCustomerModalOpen(true)
				}
			/>

			{/* Main Content */}
			<div className="flex flex-1 min-h-0 flex-col md:flex-row">
				<ProductGrid
					className="border-r-0 md:border-r"
					categories={categories}
					activeCategoryId={activeCategoryId}
					searchQuery={searchQuery}
					products={filteredProducts}
					isLoading={isProductsFetching}
					isActiveShift={Boolean(activeShift)}
					shouldAutoFocusSearch={shouldAutoFocusSearch}
					getProductQuantity={cart.getProductQuantity}
					onCategoryChange={handleCategoryChange}
					onSearchChange={handleSearchChange}
					onClearSearch={clearSearchQuery}
					onBarcodeScan={handleBarcodeScan}
					onProductSelect={handleProductSelect}
				/>

				<CartPanel
					className="hidden md:flex"
					cart={cart.cart}
					totalItems={cart.totalItems}
					totals={cart.totals}
					isActiveShift={Boolean(activeShift)}
					onUpdateQuantity={cart.updateQuantity}
					onRemoveItem={cart.removeFromCart}
					onUpdateItemDiscount={cart.updateItemDiscount}
					onClearCart={cart.clearCart}
					onCheckout={handleCheckout}
				/>
			</div>

			<div className="border-t border-gray-800 bg-[var(--color-carbon)] p-3 md:hidden">
				<Button
					type="button"
					variant="outline"
					onClick={() => setIsMobileCartOpen(true)}
					className="h-auto w-full justify-between border-gray-700 bg-[#0f0f0f] px-4 py-3 text-left text-white hover:border-gray-600 hover:bg-[#151515] hover:text-white"
				>
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]">
							<ShoppingCart className="h-5 w-5" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-white">
								{cart.totalItems > 0
									? `${cart.totalItems} ${cartItemLabel}`
									: "Orden vacia"}
							</p>
							<p className="truncate text-xs text-gray-400">
								{mobileCartDescription}
							</p>
						</div>
					</div>
					<div className="shrink-0 text-right">
						<p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
							Total
						</p>
						<p className="text-lg font-bold text-[var(--color-voltage)]">
							{formatCurrency(cart.totals.totalAmount)}
						</p>
					</div>
				</Button>
			</div>

			<Drawer
				open={isMobileCartOpen}
				onOpenChange={setIsMobileCartOpen}
				direction="bottom"
			>
				<DrawerContent className="max-h-[85vh] border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)]">
					<DrawerHeader className="sr-only">
						<DrawerTitle className="text-white">Orden actual</DrawerTitle>
						<DrawerDescription className="text-gray-400">
							{cart.totalItems > 0
								? `${cart.totalItems} ${cartItemLabel} en la venta`
								: "Tu carrito esta vacio"}
						</DrawerDescription>
					</DrawerHeader>
					<CartPanel
						className="h-[75vh] w-full border-l-0"
						cart={cart.cart}
						totalItems={cart.totalItems}
						totals={cart.totals}
						isActiveShift={Boolean(activeShift)}
						onUpdateQuantity={cart.updateQuantity}
						onRemoveItem={cart.removeFromCart}
						onUpdateItemDiscount={cart.updateItemDiscount}
						onClearCart={cart.clearCart}
						onCheckout={handleCheckout}
					/>
				</DrawerContent>
			</Drawer>

			{/* Modals */}
			<OpenShiftModal
				isOpen={shift.isShiftOpenModalOpen}
				onClose={() => shift.setIsShiftOpenModalOpen(false)}
				startingCash={shift.startingCash}
				setStartingCash={shift.setStartingCash}
				openShiftNotes={shift.openShiftNotes}
				setOpenShiftNotes={shift.setOpenShiftNotes}
				canOpenShift={shift.canOpenShift}
				isOpening={shift.isOpeningShift}
				error={shift.openShiftError}
				onConfirm={shift.handleOpenShift}
			/>

			<CashMovementModal
				isOpen={shift.isCashMovementModalOpen}
				onClose={() => shift.setIsCashMovementModalOpen(false)}
				movementType={shift.movementType}
				setMovementType={shift.setMovementType}
				movementPaymentMethod={shift.movementPaymentMethod}
				setMovementPaymentMethod={shift.setMovementPaymentMethod}
				paymentMethodOptions={posSettings.paymentMethods}
				movementAmount={shift.movementAmount}
				setMovementAmount={shift.setMovementAmount}
				movementDescription={shift.movementDescription}
				setMovementDescription={shift.setMovementDescription}
				canRegister={shift.canRegisterCashMovement}
				isRegistering={shift.isRegisteringMovement}
				hasActiveShift={Boolean(activeShift)}
				error={shift.cashMovementError}
				onConfirm={shift.handleCashMovement}
			/>

			<CloseShiftModal
				isOpen={shift.isCloseShiftModalOpen}
				onClose={() => shift.setIsCloseShiftModalOpen(false)}
				activeShift={activeShift}
				shiftCloseSummary={shift.shiftCloseSummary}
				isLoading={shift.isShiftSummaryFetching}
				closureAmounts={shift.closureAmounts}
				setClosureAmounts={shift.setClosureAmounts}
				closeShiftNotes={shift.closeShiftNotes}
				setCloseShiftNotes={shift.setCloseShiftNotes}
				hasInvalidAmounts={shift.hasInvalidCloseAmounts}
				isClosing={shift.isClosingShift}
				error={shift.closeShiftError}
				onConfirm={shift.handleCloseShift}
			/>

			<ModifierModal
				isOpen={modifierModal.isModifierModalOpen}
				onClose={modifierModal.handleCloseModal}
				selectedProduct={modifierModal.selectedProductForModifiers}
				modifierProducts={modifierProducts}
				modifierQuantities={modifierModal.modifierQuantities}
				onUpdateModifierQuantity={modifierModal.updateModifierQuantity}
				onConfirm={modifierModal.handleConfirmModifiers}
				onQuickAdd={modifierModal.handleQuickAddWithoutModifiers}
			/>

			<CreateCustomerModal
				isOpen={createCustomer.isCreateCustomerModalOpen}
				onClose={() => createCustomer.setIsCreateCustomerModalOpen(false)}
				name={createCustomer.newCustomerName}
				setName={createCustomer.setNewCustomerName}
				phone={createCustomer.newCustomerPhone}
				setPhone={createCustomer.setNewCustomerPhone}
				documentType={createCustomer.newCustomerDocumentType}
				setDocumentType={createCustomer.setNewCustomerDocumentType}
				documentNumber={createCustomer.newCustomerDocumentNumber}
				setDocumentNumber={createCustomer.setNewCustomerDocumentNumber}
				canCreate={createCustomer.canCreateCustomer}
				isCreating={createCustomer.isCreating}
				error={createCustomer.error}
				onConfirm={createCustomer.handleCreateCustomer}
			/>

			<ShiftRequiredDialog
				isOpen={isShiftRequiredDialogOpen}
				onClose={() => setIsShiftRequiredDialogOpen(false)}
				onOpenShift={handleOpenShiftFromDialog}
			/>

			<CheckoutModal
				isOpen={checkout.isCheckoutModalOpen}
				onClose={() => checkout.setIsCheckoutModalOpen(false)}
				totalAmount={cart.totals.totalAmount}
				discountInput={cart.discountInput}
				setDiscountInput={cart.setDiscountInput}
				payments={checkout.payments}
				paymentMethodOptions={posSettings.paymentMethods}
				allowCreditSales={posSettings.allowCreditSales}
				isCreditSale={checkout.isCreditSale}
				setIsCreditSale={checkout.setIsCreditSale}
				customers={customers}
				selectedCustomerId={selectedCustomerId}
				onCustomerChange={handleCustomerChange}
				selectedCustomerCreditAccount={selectedCustomerCreditAccount}
				projectedCreditBalance={projectedCreditBalance}
				remainingCreditAmount={checkout.remainingCreditAmount}
				shouldCreateCreditBalance={checkout.shouldCreateCreditBalance}
				canFinalize={checkout.canFinalizeSale}
				isProcessing={checkout.isProcessing}
				paymentDifference={checkout.paymentDifference}
				hasPaymentDifference={checkout.hasPaymentDifference}
				canReturnCashChange={checkout.canReturnCashChange}
				cashChangeDue={checkout.cashChangeDue}
				error={checkout.error}
				onAddPaymentMethod={checkout.addPaymentMethod}
				onRemovePaymentMethod={checkout.removePaymentMethod}
				onUpdatePayment={checkout.updatePayment}
				onConfirm={checkout.handleFinalizeSale}
			/>
		</div>
	);
}

function formatPosCustomerMeta(
	customer:
		| {
				phone?: string | null;
				documentNumber?: string | null;
		  }
		| null
		| undefined,
) {
	if (!customer) {
		return null;
	}

	const parts = [customer.phone, customer.documentNumber].filter(Boolean);
	return parts.join(" · ") || null;
}
