/**
 * Channels query with RestAPI call
 */
import { useQuery } from "@tanstack/react-query";
import { DataTableStateEvent } from "primereact/datatable";
import { show } from "./Message";
import { RefObject } from "react";
import { Toast } from "primereact/toast";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const useGetChannels = (toast: RefObject<Toast>, lazyState: DataTableStateEvent) => useQuery<ChannelValues[], Error>(["channels"], async () => {
    try {
        const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
        const res = await fetch(
            `/api/admin/crud/channels?first=${lazyState.first}&rowcount=${lazyState.rows}&filter=${filters}`,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const values = await res.json();

        const resPowerMeters = await fetch(`/api/admin/crud/power_meter`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const powerMetersValues = await resPowerMeters.json();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        values.forEach((element: ChannelValues, idx: number) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const result = powerMetersValues.filter(
                (powerMeter: PowerMeterValues) => {
                    return powerMeter.id === element.power_meter_id;
                },
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (result.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                values[idx].power_meter_name = result[0].power_meter_name;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            values[idx].enabled = values[idx].enabled ? true : false;
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return values;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        show(toast, "error", "Please check is the powermeter-api runing.");
    }
}, { refetchOnWindowFocus: false });
