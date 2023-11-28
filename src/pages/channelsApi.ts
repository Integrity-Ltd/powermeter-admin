/**
 * Channels query with RestAPI call
 */
import { useQuery } from "@tanstack/react-query";
import { DataTableStateEvent } from "primereact/datatable";
import { show } from "./Message";
import { RefObject } from "react";
import { Toast } from "primereact/toast";

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
