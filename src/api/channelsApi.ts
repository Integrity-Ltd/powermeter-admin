/**
 * Channels query with RestAPI call
 */
import { useQuery } from "@tanstack/react-query";
import { DataTableStateEvent } from "primereact/datatable";
import { show } from "../pages/Message";
import { Dispatch, RefObject, SetStateAction, useCallback } from "react";
import { Toast } from "primereact/toast";

/**
 * The input form objects
 */
export interface FormValues {
	power_meter_id: number;
	channel: number;
	channel_name: string;
	enabled: boolean;
}

export const useGetChannels = (toast: RefObject<Toast>, lazyState: DataTableStateEvent) => useQuery<ChannelValue[], Error>(["channels"], async (): Promise<ChannelValue[]> => {
	try {
		const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
		const res = await fetch(
			`/api/admin/crud/channels?first=${lazyState.first}&rowcount=${lazyState.rows}&filter=${filters}`,
		);

		const values: ChannelValue[] = await res.json() as ChannelValue[];
		const resPowerMeters = await fetch(`/api/admin/crud/power_meter`);
		const powerMetersValues: PowerMeterValue[] = await resPowerMeters.json() as PowerMeterValue[];
		values.forEach((element: ChannelValue, idx: number) => {
			const result = powerMetersValues.filter(
				(powerMeter: PowerMeterValue) => {
					return powerMeter.id === element.power_meter_id;
				},
			);
			if (result.length > 0) {
				values[idx].power_meter_name = result[0].power_meter_name;
			}
			values[idx].enabled = values[idx].enabled ? true : false;
		});
		return values;
	} catch (e: unknown) {
		if (e instanceof Error) {
			show(toast, "error", "Please check is the powermeter-api runing. " + e.message);
		}
		return [];
	}
}, { refetchOnWindowFocus: false });

export const useGetChannelsCount = (toast: RefObject<Toast>, lazyState: DataTableStateEvent) => useQuery<number, Error>({
	queryKey: ["channelscount", lazyState],
	queryFn: async (): Promise<number> => {
		try {
			const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
			const res = await fetch(
				`/api/admin/crud/channels/count?filter=${filters}`,
			);
			const { count } = await res.json() as { count: number; };
			return count;
		} catch (e: unknown) {
			if (e instanceof Error) {
				show(toast, "error", "Please check is the powermeter-api runing." + e.message);
			}
			return 0;
		}
	},
});

export const submitCallback = (toast: RefObject<Toast>, setVisible: Dispatch<SetStateAction<boolean>>, updatePage: () => Promise<void>, editedRow: ChannelValue | undefined) => useCallback((data: FormValues) => {
	const params = {
		power_meter_id: data.power_meter_id,
		channel: data.channel,
		channel_name: data.channel_name,
		enabled: data.enabled,
	};
	if (editedRow && editedRow.id) {
		try {
			fetch("/api/admin/crud/channels/" + String(editedRow.id), {
				method: "PUT",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-cache",
				body: JSON.stringify(params),
			})
				.then((response) => {
					return response.json();
				})
				.then(async (result) => {
					await updatePage();
					setVisible(false);
					show(toast, "success", `Updated channel: ${JSON.stringify(result)}`);
				})
				.catch((err: Error) => {
					show(toast, "error", err.message);
				});
		} catch (e: unknown) {
			show(toast, "error", "Please check is the powermeter-api runing.");
		}
	} else {
		try {
			fetch("/api/admin/crud/channels", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-cache",
				body: JSON.stringify(params),
			})
				.then((response) => {
					if (response.ok) {
						return response.json();
					} else {
						throw new Error("Please check is the powermeter-api runing.");
					}
				})
				.then(async (result) => {
					await updatePage();
					setVisible(false);
					show(toast, "success", `Saved channel: ${JSON.stringify(result)}`);
				})
				.catch((err: Error) => {
					show(toast, "error", err.message);
					setVisible(false);
				});
		} catch (e) {
			show(toast, "error", "Please check is the powermeter-api runing.");
		}
	}
}, [editedRow, updatePage]);

export const deleteCallback = (toast: RefObject<Toast>, updatePage: () => Promise<void>, selectedRow: ChannelValue | undefined) => useCallback(() => {
	if (selectedRow) {
		try {
			fetch("/api/admin/crud/channels/" + String(selectedRow.id), {
				method: "DELETE",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				cache: "no-cache",
				body: JSON.stringify({ action: "delete" }),
			})
				.then((response) => {
					return response.json();
				})
				.then(async (data) => {
					show(toast, "success", `Deleted channels: ${JSON.stringify(data)}`);
					await updatePage();
				})
				.catch((err: Error) => show(toast, "error", err.message));
		} catch (e: unknown) {
			show(toast, "error", "Please check is the powermeter-api runing.");
		}
	}
}, [selectedRow]);

export const usePowerMeterValuesCallback = (toast: RefObject<Toast>, setPowerMeterValues: Dispatch<SetStateAction<PowerMeterValue[]>>) => useCallback(async () => {
	try {
		const response = await fetch("/api/admin/crud/power_meter");
		const data: PowerMeterValue[] = await response.json() as PowerMeterValue[];
		setPowerMeterValues(data);
	} catch (e: unknown) {
		show(toast, "error", "Please check is the powermeter-api runing.");
	}
}, []);
