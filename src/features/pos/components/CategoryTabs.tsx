import { Button, ScrollArea } from "@mantine/core";
import type { Category } from "../types";

interface CategoryTabsProps {
	categories: Category[];
	activeCategoryId: string;
	onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({
	categories,
	activeCategoryId,
	onCategoryChange,
}: CategoryTabsProps) {
	return (
		<ScrollArea className="w-full whitespace-nowrap" scrollbarSize={0}>
			<div className="flex w-max space-x-1.5 pb-2">
				{categories.map((category) => (
					<Button
						key={category.id}
						variant={activeCategoryId === category.id ? "filled" : "outline"}
						size="compact-sm"
						onClick={() => onCategoryChange(category.id)}
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
		</ScrollArea>
	);
}
