import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/features/settings/settings.functions";

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

			await queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] });
		},
	});
}
