import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	DataTable,
	DataTableStateEvent,
	DataTableSelectionChangeEvent,
	DataTableValueArray,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AutoComplete } from "primereact/autocomplete";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog } from "primereact/confirmdialog";
import { classNames } from "primereact/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProgressSpinner } from "primereact/progressspinner";

/**
 * The input form objects
 *
 */
interface FormValues {
	id: number;
	asset_name_id: number;
	asset_name: string | undefined;
	power_meter_id: number;
	channel_id: number;
}

/**
 * The Zod validation schema of form data
 *
 */
const schema = z.object({
	asset_name_id: z.number(),
	channel_id: z.number().min(0),
});

/**
 * The assets component
 *
 * @returns the assets ReactComponent
 */
export default function Assets() {
	const queryClient = useQueryClient();
	/**
 * Lazy data model state
 */
	const [lazyState, setLazyState] = useState<DataTableStateEvent>({
		first: 0,
		rows: 100,
		page: 0,
		pageCount: 0,
		sortField: "",
		sortOrder: 1,
		multiSortMeta: [],
		filters: {},
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [assetNamesState, setAssetNamesState] = useState({});

	const getDefaultAssetsValues = useCallback((): AssetsValue => {
		return {
			asset_name_id: 0,
			power_meter_id: 0,
			channel_id: 0,
		};
	}, []);
	/**
 * The edited row of assets
 */
	const [editedRow, setEditedRow] = useState<AssetsValue | null>(
		getDefaultAssetsValues(),
	);
	/**
 * The selected row of assets
 */
	const [selectedRow, setSelectedRow] = useState<AssetsValue | null>(null);
	/**
 * Visibility of form editor dialog
 */
	const [visible, setVisible] = useState(false);
	/**
 * Visibility of confirm dialog
 */
	const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

	/** Loading state for the saving animation */
	const [loading, setLoading] = useState(false);

	const [assetName, setAssetName] = useState<AssetNameValues | null>(null);
	/**
 * On page request of DataTable
 */
	const onPage = useCallback((event: DataTableStateEvent) => {
		setLazyState(event);
	}, []);

	/**
 * Filter on assets DataTable
 */
	const onFilter = useCallback((event: DataTableStateEvent) => {
		event.first = 0;
		setLazyState(event);
	}, []);

	/**
 * Selection changed event callback
 */
	const onSelectionChange = useCallback(
		(e: DataTableSelectionChangeEvent<DataTableValueArray>) => {
			setSelectedRow(e.value as AssetsValue);
		},
		[],
	);

	/**
 * Reload DataTable and count
 */
	const updatePage = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: ["assetnames"] });
		await queryClient.invalidateQueries({ queryKey: ["assets"] });
		await queryClient.invalidateQueries({ queryKey: ["assetscount"] });
		setSelectedRow(null);
		setEditedRow(getDefaultAssetsValues());
	}, [queryClient, getDefaultAssetsValues]);

	/**
  * Assets data query
  */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { data: assetsValues, isLoading: isDataLoading } = useQuery({
		queryKey: ["assets", lazyState],
		queryFn: async () => {
			const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
			const res = await fetch(
				`/api/admin/crud/assets?first=${lazyState.first}&rowcount=${lazyState.rows}&filter=${filters}`,
			);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const values = await res.json();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			values.forEach((_element: PowerMeterValue, idx: number) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				values[idx].enabled = values[idx].enabled ? true : false;
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return values;
		},
	});

	/**
 * Asset names query
 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { data: assetNames } = useQuery({
		queryKey: ["assetnames", assetNamesState],
		queryFn: async () => {
			const res = await fetch(
				`/api/admin/crud/assets/asset_names`,
			);
			if (res.status !== 200) {
				throw new Error("Error fetching asset names");
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const values = await res.json();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return values;
		},
	});
	/**
 * Assets count query
 */
	const { data: assertCount, isLoading: isCountLoading } = useQuery<number>({
		queryKey: ["assetscount", lazyState],
		queryFn: async () => {
			const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
			const res = await fetch(
				`/api/admin/crud/assets/count?filter=${filters}`,
			);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { count } = await res.json();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return count;
		},
	});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { data: powermeterList } = useQuery({
		queryKey: ["powermeterlist"],
		queryFn: async () => {
			const res = await fetch(`/api/admin/crud/power_meter`);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const values = await res.json();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return values;
		},
	});

	const [channels, setChannels] = useState<ChannelValue[]>([]);

	const fetchChannels = useCallback(async (power_meter_id: number) => {
		const filter = encodeURIComponent(
			JSON.stringify({ power_meter_id }),
		);
		const result = await fetch("/api/admin/crud/channels?filter=" + filter);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const data: ChannelValue[] = await result.json();
		setChannels(data);
	}, []);

	/**
 * Toast reference
 */
	const toast = useRef<Toast>(null);

	/**
 * React hook form
 */
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	const saveAssetName = useCallback(async (asset_name: string) => {
		const result = await fetch("/api/admin/crud/assets/asset_names", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			cache: "no-cache",
			body: JSON.stringify({ name: asset_name }),
		});
		if (result.status !== 200) {
			throw new Error("Error saving asset name");
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const data = await result.json();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return data.lastID as number;
	}, []);

	/**
 * React hook form submit callback. Use for create and update RestAPI calls
 *
 * @param data submited data values
 */
	const onSubmit = useCallback(async (data: FormValues) => {
		if (String(control._formValues.asset_name).trim() === "") {
			show("error", "Please fill asset name.");
			return;
		}
		setLoading(true);
		let assetNameId = assetName?.id;
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
					show("success", `Updated asset: ${JSON.stringify(result)}`);
				})
				.catch((err) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					show("error", String(err.message));
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
					show("success", `Saved asset: ${JSON.stringify(result)}`);
					await updatePage();
				})
				.catch((err: Error) => {
					setLoading(false);
					setVisible(false);
					show("error", err.message);
				});
		}
	}, [control, editedRow, saveAssetName, updatePage, assetName]);

	/**
 * Show message
 * @param severity severity of message
 * @param message message to display
 */
	const show = (
		severity: "success" | "info" | "warn" | "error" | undefined,
		message: string,
	) => {
		if (toast.current !== null) {
			toast.current.show({
				severity,
				summary: "Form submit",
				detail: message,
			});
		}
	};

	/**
 * EditedRow useEffect
 */
	useEffect(() => {
		//console.log(selectedRows);
		if (editedRow && editedRow.id) {
			fetchChannels(editedRow.power_meter_id).then(() => {
				setValue("asset_name_id", editedRow.asset_name_id);
				setAssetName({ id: editedRow.asset_name_id, name: editedRow.asset_name as string });
				setValue("asset_name", editedRow.asset_name);
				setValue("power_meter_id", editedRow.power_meter_id);
				setValue("channel_id", editedRow.channel_id);
			}).catch((err) =>
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				show("error", String(err.message)),
			);
		} else {
			setChannels([]);
			setValue("asset_name_id", -1);
			setValue("asset_name", "");
			setValue("power_meter_id", -1);
			setValue("channel_id", -1);
		}
	}, [editedRow, setValue]);

	/**
 * Delete selected asset with RestAPI
 */
	const deleteSelectedRow = useCallback(() => {
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
					show("success", `Deleted asset: ${JSON.stringify(data)}`);
					await updatePage();
				})
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				.catch((err) => show("error", String(err.message)));
		}
	}, [selectedRow, updatePage]);

	/**
 * React hook form submition error handler
 * @param errors errors
 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const onSubmitError = useCallback((_fieldErrors: FieldErrors<FormValues>) => {
		//console.log(_fieldErrors);
		show(
			"error",
			"Please fill form as needed. Read tooltips on red marked fields.",
		);
	}, []);

	/**
 * DataTable reference
 */
	const dt = useRef<DataTable<DataTableValueArray>>(null);

	/**
 * Export measurements data to CSV
 * @param selectionOnly export only selected data
 */
	const exportCSV = useCallback((selectionOnly: boolean) => {
		if (dt && dt.current) {
			const currentRef = dt.current;
			currentRef.exportCSV({ selectionOnly });
		}
	}, []);

	const [items, setItems] = useState<string[]>([]);

	interface AssetNameValues {
		id: number;
		name: string;
	}

	const completeMethod = useCallback((e: { query: string; }) => {
		let result: string[] = [];
		if (Array.isArray(assetNames)) {
			result = assetNames.filter((item: AssetNameValues) => item.name.toLowerCase().startsWith(e.query.toLowerCase())).map((item: AssetNameValues) => item.name);
		}
		setItems(result);
	}, [assetNames]);

	const header = (
		<>
			<div className="grid cols-2 justify-content-end w-ull">
				<div className="flex justify-content-end w-6 ">
					<h2>Assets</h2>
				</div>
				<div className="flex align-items-center justify-content-end gap-2 end w-6">
					<Button
						type="button"
						icon="pi pi-file"
						rounded
						onClick={() => exportCSV(false)}
						data-pr-tooltip="CSV"
					/>
				</div>
			</div>
		</>
	);

	const formComponent = (): ReactNode => {
		return (
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit(onSubmit, onSubmitError)}
				style={{ width: "100%" }}
			>
				<Controller
					name="asset_name"
					control={control}
					rules={{ required: "asset name is required." }}
					render={({ field, fieldState }) => (
						<>
							<div className="grid align-items-baseline">
								<div className="col-12 mb-2 md:col-2 md:mb-0">
									<label htmlFor={field.name}>Asset name: </label>
								</div>
								<div className="col-12 md:col-10">
									<AutoComplete
										id={field.name}
										value={field.value || ""}
										tooltip={errors.asset_name_id?.message}
										className={classNames({
											"p-invalid": fieldState.invalid,
										})}
										suggestions={items}
										completeMethod={completeMethod}
										onChange={(e) => {
											// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
											const assetNameIdByName: AssetNameValues = assetNames.find((item: AssetNameValues) => item.name === e.value);
											// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
											setValue("asset_name_id", Number(assetNameIdByName?.id) || -1);
											setAssetName(assetNameIdByName);
											field.onChange(String(e.value));
										}}
										dropdown
										style={{ width: "100%" }}
									/>
								</div>
							</div>
						</>
					)}
				/>
				<Controller
					name="power_meter_id"
					control={control}
					rules={{ required: "Powermeter is required." }}
					render={({ field, fieldState }) => (
						<>
							<div className="grid align-items-baseline">
								<div className="col-12 mb-2 md:col-2 md:mb-0">
									<label htmlFor={field.name}>Powermeter: </label>
								</div>
								<div className="col-12 md:col-10">
									<Dropdown
										id={field.name}
										value={field.value}
										tooltip={errors.channel_id?.message}
										className={classNames({
											"p-invalid": fieldState.invalid,
										})}
										onChange={(event) => {
											(async () => {
												await fetchChannels(Number(event.target.value));
												setValue("channel_id", -1);
												field.onChange(Number(event.target.value));
												// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
											})().catch((err) => show("error", String(err.message)));
										}}
										// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
										options={powermeterList}
										optionLabel="power_meter_name"
										optionValue="id"
										placeholder="Select powermeter"
										style={{ width: "100%" }}
									/>
								</div>
							</div>
						</>
					)}
				/>
				<Controller
					name="channel_id"
					control={control}
					rules={{ required: "Time zone is required." }}
					render={({ field, fieldState }) => (
						<>
							<div className="grid align-items-baseline">
								<div className="col-12 mb-2 md:col-2 md:mb-0">
									<label htmlFor={field.name}>Channel: </label>
								</div>
								<div className="col-12 md:col-10">
									<Dropdown
										id={field.name}
										value={field.value}
										tooltip={errors.channel_id?.message}
										className={classNames({
											"p-invalid": fieldState.invalid,
										})}
										onChange={(event) => field.onChange(Number(event.target.value))}
										options={channels}
										optionLabel="channel_name"
										optionValue="id"
										placeholder="Select Channel"
										style={{ width: "100%" }}
									/>
								</div>
							</div>
						</>
					)}
				/>
				<div className="flex justify-content-end">
					<Button label="Submit" type="submit" icon="pi pi-check" />
				</div>
			</form>
		);
	};

	return (
		<div className="card">
			<Toast ref={toast} />
			<Dialog
				header="Asset"
				visible={visible}
				onHide={() => setVisible(false)}
				style={{ width: "50vw" }}
				className="absolute overflow-hidden"
			>
				{loading && (
					<div className="absolute w-full h-full surface-400 opacity-50 top-0 left-0 z-5 flex justify-content-center align-items-center">
						<ProgressSpinner
							style={{ width: "50px", height: "50px" }}
							strokeWidth="8"
							fill="var(--surface-ground)"
							animationDuration=".5s"
						/>
					</div>
				)}

				{formComponent()}

			</Dialog>
			<ConfirmDialog
				visible={confirmDialogVisible}
				accept={deleteSelectedRow}
				message="Are you sure you want to delete item?"
				header="Confirmation"
				icon="pi pi-exclamation-triangle"
				onHide={() => setConfirmDialogVisible(false)}
			/>
			<div className="card">
				<DataTable
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					value={assetsValues}
					ref={dt}
					header={header}
					selectionMode="single"
					selection={selectedRow}
					onSelectionChange={onSelectionChange}
					first={lazyState.first}
					paginator={true}
					lazy={true}
					rows={100}
					totalRecords={assertCount ?? 0}
					onPage={onPage}
					loading={isDataLoading || isCountLoading}
					onFilter={onFilter}
					filters={lazyState.filters}
					filterDisplay="row"
					tableStyle={{ minWidth: "50rem" }}
				>
					<Column selectionMode="single" header="Select one"></Column>
					<Column field="asset_name" header="Asset name"></Column>
					<Column field="power_meter_name" header="Powermeter name"></Column>
					<Column field="channel_name" header="Channel name"></Column>
				</DataTable>
			</div>
			<div className="flex flex-row gap-4 my-3">
				<Button
					label="New"
					icon="pi pi-check"
					onClick={() => {
						setSelectedRow(null);
						setEditedRow(getDefaultAssetsValues());
						setVisible(true);
					}}
				/>
				<Button
					label="Modify"
					icon="pi pi-check"
					onClick={() => {
						setEditedRow(selectedRow);
						setVisible(true);
					}}
					disabled={selectedRow && selectedRow.id ? false : true}
				/>
				<Button
					label="Delete"
					icon="pi pi-check"
					onClick={() => setConfirmDialogVisible(true)}
					disabled={selectedRow && selectedRow.id ? false : true}
				/>
			</div>
		</div>
	);
}
