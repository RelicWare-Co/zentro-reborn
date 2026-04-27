import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ORGANIZATION_CAPABILITIES_QUERY_KEY } from "@/features/modules/hooks/use-module-access";
import {
	getSettings,
	updateSettings,
} from "@/features/settings/settings.functions";

export const SETTINGS_QUERY_KEY = ["organization-settings"];

export type SettingsPageData = Awaited<ReturnType<typeof getSettings>>;

export function useSettings(initialData?: SettingsPageData) {
	return useQuery({
		queryKey: SETTINGS_QUERY_KEY,
		queryFn: () => getSettings(),
		initialData,
	});
}

export function useUpdateSettingsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: { settings: SettingsPageData["settings"] }) =>
			updateSettings({
				data: payload,
			}),
		onSuccess: async (result) => {
			queryClient.setQueryData<SettingsPageData | undefined>(
				SETTINGS_QUERY_KEY,
				(currentValue) =>
					currentValue
						? {
								...currentValue,
								settings: result.settings,
							}
						: currentValue,
			);

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] }),
				queryClient.invalidateQueries({
					queryKey: ORGANIZATION_CAPABILITIES_QUERY_KEY,
				}),
			]);
		},
	});
}
