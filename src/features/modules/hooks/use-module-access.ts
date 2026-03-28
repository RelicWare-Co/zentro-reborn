import { useQuery } from "@tanstack/react-query";
import { getOrganizationCapabilities } from "@/features/modules/module-access.functions";

export const ORGANIZATION_CAPABILITIES_QUERY_KEY = [
	"organization-capabilities",
];

export type OrganizationCapabilities = Awaited<
	ReturnType<typeof getOrganizationCapabilities>
>;

export function useOrganizationCapabilities(input?: {
	initialData?: OrganizationCapabilities;
	enabled?: boolean;
}) {
	return useQuery({
		queryKey: ORGANIZATION_CAPABILITIES_QUERY_KEY,
		queryFn: () => getOrganizationCapabilities(),
		initialData: input?.initialData,
		enabled: input?.enabled ?? true,
	});
}
