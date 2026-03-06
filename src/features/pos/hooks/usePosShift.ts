import { useCallback, useState } from "react";
import type { ActiveShift } from "../types";
import {
	useCloseShiftMutation,
	useOpenShiftMutation,
	useRegisterCashMovementMutation,
	useShiftCloseSummary,
} from "./usePosQueries";

export function usePosShift(activeShift: ActiveShift | null) {
	// Modals state
	const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
	const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
	const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

	// Open shift form state
	const [startingCash, setStartingCash] = useState("");
	const [openShiftNotes, setOpenShiftNotes] = useState("");

	// Cash movement form state
	const [movementType, setMovementType] = useState("inflow");
	const [movementAmount, setMovementAmount] = useState("");
	const [movementDescription, setMovementDescription] = useState("");

	// Close shift form state
	const [closeShiftNotes, setCloseShiftNotes] = useState("");
	const [closureAmounts, setClosureAmounts] = useState<Record<string, string>>(
		{},
	);

	// Queries and mutations
	const openShiftMutation = useOpenShiftMutation();
	const registerCashMovementMutation = useRegisterCashMovementMutation();
	const closeShiftMutation = useCloseShiftMutation();

	const { data: shiftCloseSummary, isFetching: isShiftSummaryFetching } =
		useShiftCloseSummary(activeShift?.id, isCloseShiftModalOpen);

	// Open shift handler
	const handleOpenShift = useCallback(() => {
		const parsedStartingCash = Number(startingCash);
		if (!Number.isFinite(parsedStartingCash) || parsedStartingCash < 0) {
			return;
		}

		openShiftMutation.mutate(
			{
				startingCash: parsedStartingCash,
				notes: openShiftNotes.trim() || null,
			},
			{
				onSuccess: () => {
					setIsShiftOpenModalOpen(false);
					setStartingCash("");
					setOpenShiftNotes("");
				},
			},
		);
	}, [openShiftMutation, openShiftNotes, startingCash]);

	// Cash movement handler
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

		registerCashMovementMutation.mutate(
			{
				shiftId: activeShift.id,
				type: movementType as "expense" | "payout" | "inflow",
				amount: parsedAmount,
				description: movementDescription.trim(),
			},
			{
				onSuccess: () => {
					setIsCashMovementModalOpen(false);
					setMovementAmount("");
					setMovementDescription("");
					setMovementType("inflow");
				},
			},
		);
	}, [
		activeShift,
		movementAmount,
		movementDescription,
		movementType,
		registerCashMovementMutation,
	]);

	// Close shift handler
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

		closeShiftMutation.mutate(
			{
				shiftId: activeShift.id,
				closures,
				notes: closeShiftNotes.trim() || null,
			},
			{
				onSuccess: () => {
					setIsCloseShiftModalOpen(false);
					setClosureAmounts({});
					setCloseShiftNotes("");
				},
			},
		);
	}, [
		activeShift,
		closeShiftMutation,
		closeShiftNotes,
		closureAmounts,
		shiftCloseSummary,
	]);

	// Computed values
	const canOpenShift =
		startingCash.trim().length > 0 &&
		Number.isFinite(Number(startingCash)) &&
		Number(startingCash) >= 0;

	const canRegisterCashMovement =
		Boolean(activeShift) &&
		movementDescription.trim().length > 0 &&
		Number.isFinite(Number(movementAmount)) &&
		Number(movementAmount) > 0;

	const hasInvalidCloseAmounts =
		shiftCloseSummary?.summaryByMethod.some((summaryRow) => {
			const amount = Number(closureAmounts[summaryRow.paymentMethod]);
			return !Number.isFinite(amount) || amount < 0;
		}) ?? false;

	const cashSummary = shiftCloseSummary?.summaryByMethod.find(
		(summaryRow) => summaryRow.paymentMethod === "cash",
	);

	return {
		// Modal states
		isShiftOpenModalOpen,
		setIsShiftOpenModalOpen,
		isCashMovementModalOpen,
		setIsCashMovementModalOpen,
		isCloseShiftModalOpen,
		setIsCloseShiftModalOpen,

		// Form states - Open shift
		startingCash,
		setStartingCash,
		openShiftNotes,
		setOpenShiftNotes,

		// Form states - Cash movement
		movementType,
		setMovementType,
		movementAmount,
		setMovementAmount,
		movementDescription,
		setMovementDescription,

		// Form states - Close shift
		closeShiftNotes,
		setCloseShiftNotes,
		closureAmounts,
		setClosureAmounts,

		// Data
		shiftCloseSummary,
		isShiftSummaryFetching,
		cashSummary,

		// Loading states
		isOpeningShift: openShiftMutation.isPending,
		isRegisteringMovement: registerCashMovementMutation.isPending,
		isClosingShift: closeShiftMutation.isPending,

		// Errors
		openShiftError: openShiftMutation.error,
		cashMovementError: registerCashMovementMutation.error,
		closeShiftError: closeShiftMutation.error,

		// Handlers
		handleOpenShift,
		handleCashMovement,
		handleCloseShift,

		// Computed
		canOpenShift,
		canRegisterCashMovement,
		hasInvalidCloseAmounts,
	};
}
