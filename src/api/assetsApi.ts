import { useQuery } from "@tanstack/react-query";
import { DataTableStateEvent } from "primereact/datatable";
import { Toast } from "primereact/toast";
import { Dispatch, RefObject, SetStateAction, useCallback } from "react";
import { show } from "../pages/Message";
import { Control } from "react-hook-form";
import { AssetFormValues } from "../forms/assetForm";

export const useAssetsValues = (lazyState: DataTableStateEvent) => useQuery<AssetsValue[], Error>(["assets", lazyState], async (): Promise<AssetsValue[]> => {
	const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
	const res = await fetch(
		`/api/admin/crud/assets?first=${lazyState.first}&rowcount=${lazyState.rows}&filter=${filters}`,
	);
	if (res.status !== 200) {
		throw new Error("Error fetching assets");
	}
	const values = await res.json() as AssetsValue[];
	return values;
}, { refetchOnWindowFocus: false });

export const useAssetNames = () => useQuery<AssetNameValue[], Error>(["assetnames"], async () => {
	const res = await fetch(
		`/api/admin/crud/assets/asset_names`,
	);
	if (res.status !== 200) {
		throw new Error("Error fetching asset names");
	}
	const values = await res.json() as AssetNameValue[];
	return values;
}, { refetchOnWindowFocus: false });

export const useAssetsCount = (lazyState: DataTableStateEvent) => useQuery<number>(["assetscount", lazyState], async () => {
	const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
	const res = await fetch(
		`/api/admin/crud/assets/count?filter=${filters}`,
	);
	if (res.status !== 200) {
		throw new Error("Error fetching assets count");
	}
	const { count } = await res.json() as { count: number; };
	return count;
}, { refetchOnWindowFocus: false });

export const useFetchChannelsCallback = (setChannels: Dispatch<SetStateAction<ChannelValue[]>>) => useCallback(async (powerMeterId: number) => {
	const filter = encodeURIComponent(
		JSON.stringify({ power_meter_id: powerMeterId }),
	);
	const result = await fetch("/api/admin/crud/channels?filter=" + filter);
	if (result.status !== 200) {
		throw new Error("Error fetching channels");
	}
	const data = await result.json() as ChannelValue[];
	setChannels(data);
}, []);

export const usePowerMeterList = () => useQuery<PowerMeterValue[]>(["powermeterlist"], async () => {
	const res = await fetch(`/api/admin/crud/power_meter`);
	if (res.status !== 200) {
		throw new Error("Error fetching power meters");
	}
	const values = await res.json() as PowerMeterValue[];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return values;
}, { refetchOnWindowFocus: false });

const saveAssetName = async (assetName: string) => {
	const result = await fetch("/api/admin/crud/assets/asset_names", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		cache: "no-cache",
		body: JSON.stringify({ name: assetName }),
	});
	if (result.status !== 200) {
		throw new Error("Error saving asset name");
	}

	const data = await result.json() as { lastID: number; };
	return data.lastID;
};

export const deleteAssetRowCallback = (toast: RefObject<Toast>, updatePage: () => Promise<void>, selectedRow: AssetsValue | undefined) => useCallback(() => {
	if (selectedRow) {
		fetch("/api/admin/crud/assets/" + String(selectedRow.id), {
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
				show(toast, "success", `Deleted asset: ${JSON.stringify(data)}`);
				await updatePage();
			})
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			.catch((err) => show(toast, "error", String(err.message)));
	}
}, [selectedRow, updatePage]);

export const onAssetSubmitCallback = (
	toast: RefObject<Toast>,
	setVisible: Dispatch<SetStateAction<boolean>>,
	updatePage: () => Promise<void>,
	editedRow: AssetsValue | undefined,
	setLoading: Dispatch<SetStateAction<boolean>>,
	control: Control<AssetFormValues, any>,
	assetName: AssetNameValue | undefined,
	setAssetName: Dispatch<SetStateAction<AssetNameValue | undefined>>,
) => useCallback(async (data: AssetFormValues) => {
	if (String(control._formValues.asset_name).trim() === "") {
		show(toast, "error", "Please fill asset name.");
		return;
	}
	setLoading(true);
	let assetNameId = assetName?.id as number;
	if (!assetNameId) {
		assetNameId = await saveAssetName(control._formValues.asset_name as string);
		setAssetName({ id: assetNameId, name: control._formValues.asset_name as string });
	}

	const params = {
		asset_name_id: assetNameId,
		channel_id: data.channel_id,
	};

	if (editedRow && editedRow.id) {
		fetch("/api/admin/crud/assets/" + String(editedRow.id), {
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
				setLoading(false);
				await updatePage();
				setVisible(false);
				show(toast, "success", `Updated asset: ${JSON.stringify(result)}`);
			})
			.catch((err) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				show(toast, "error", String(err.message));
			});
		setLoading(false);
	} else {
		fetch("/api/admin/crud/assets", {
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
				setLoading(false);
				setVisible(false);
				show(toast, "success", `Saved asset: ${JSON.stringify(result)}`);
				await updatePage();
			})
			.catch((err: Error) => {
				setLoading(false);
				setVisible(false);
				show(toast, "error", err.message);
			});
	}
}, [control, editedRow, updatePage, assetName]);
