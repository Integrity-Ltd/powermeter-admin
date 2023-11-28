import { useCallback, useEffect, useRef, useState } from "react";
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
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog } from "primereact/confirmdialog";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { classNames } from "primereact/utils";
import { convertToCSV, downloadCsvFile } from "../utils/Converter";
import { useGetChannels } from "./channelsApi";
import { show } from "../pages/Message";

/**
 * The input form objects
 */
interface FormValues {
	power_meter_id: number;
	channel: number;
	channel_name: string;
	enabled: boolean;
}

/**
 * The Zod validation schema of form data
 */
const schema = z.object({
	power_meter_id: z.number(),
	channel: z.number().min(1),
	channel_name: z.string().nonempty(),
	enabled: z.boolean(),
});

/**
 * The Channels component
 *
 * @returns the Channels ReactComponent
 */
const Channels = () => {
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

	const getDefaultChannelValue = (): ChannelValue => {
		return {
			power_meter_id: -1,
			channel: 1,
			channel_name: "",
			enabled: false,
		};
	};

	/**
 * Toast reference
 */
	const toast = useRef<Toast>(null);

	/**
 * The edited row of channel
 */
	const [editedRow, setEditedRow] = useState<ChannelValue | undefined>(
		getDefaultChannelValue(),
	);
	/**
 * The selected row of channel
 */
	const [selectedRow, setSelectedRow] = useState<ChannelValue | undefined>(undefined);
	/**
 * Visibility of form editor dialog
 */
	const [visible, setVisible] = useState(false);
	/**
 * Visibility of confirm dialog
 */
	const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

	/**
 * On page request of DataTable
 */
	const onPage = useCallback((event: DataTableStateEvent) => {
		setLazyState(event);
	}, []);

	/**
 * Filter on powermeter DataTable
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
			setSelectedRow(e.value as ChannelValue);
		},
		[],
	);

	/**
 * Reload DataTable and count
 */
	const updatePage = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: ["channels"] });
		await queryClient.invalidateQueries({ queryKey: ["channelscount"] });
		setSelectedRow(undefined);
		setEditedRow(getDefaultChannelValue());
	}, [queryClient]);
	/**
 * Channels query with RestAPI call
 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { data: channelsValues, isLoading: isDataLoading } = useGetChannels(toast, lazyState);

	/**
 * Channel count query with RestAPI call
 */
	const { data: channelsCount, isLoading: isCountLoading } = useQuery<number, Error>({
		queryKey: ["channelscount", lazyState],
		queryFn: async (): Promise<number> => {
			try {
				const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
				const res = await fetch(
					`/api/admin/crud/channels/count?filter=${filters}`,
				);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const { count } = await res.json();
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return count;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (e: any) {
				show(toast, "error", "Please check is the powermeter-api runing.");
				return 0;
			}
		},
	});

	/**
 * React hook form
 */
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	/**
 * React hook form submition error handler
 * @param errors errors
 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const onSubmitError = useCallback((_fieldErrors: FieldErrors<FormValues>) => {
		//console.log(_fieldErrors);
		show(toast,
			"error",
			"Please fill form as needed. Read tooltips on red marked fields.",
		);
	}, []);

	/**
 * React hook form submit callback. Use for create and update RestAPI calls
 *
 * @param data submited data values
 */
	const onSubmit = useCallback((data: FormValues) => {
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

	/**
 * Power meter values state hook
 */
	const [power_meterValues, setPower_meterValues] = useState<
		PowerMeterValue[]
	>([]);
	/**
 * Power meter values fetch
 */

	const fetchPower_meterValues = useCallback(async () => {
		try {
			const response = await fetch("/api/admin/crud/power_meter");
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const data: PowerMeterValue[] = await response.json();
			setPower_meterValues(data);
			// eslint-disable-next-line
		} catch (e: any) {
			show(toast, "error", "Please check is the powermeter-api runing.");
		}
	}, []);

	/**
 * EditedRow useEffect
 */
	useEffect(() => {
		//console.log(selectedRows);
		fetchPower_meterValues().then(() => {
			if (editedRow && editedRow.id) {
				setValue("power_meter_id", editedRow.power_meter_id);
				setValue("channel", editedRow.channel);
				setValue("channel_name", editedRow.channel_name);
				setValue("enabled", editedRow.enabled ? true : false);
			} else {
				setValue("power_meter_id", -1);
				setValue("channel", 1);
				setValue("channel_name", "");
				setValue("enabled", false);
			}
		}).catch((err: Error) => {
			show(toast, "error", err.message);
		});
	}, [editedRow, setValue, fetchPower_meterValues]);

	/**
 * Delete selected powermeter with RestAPI
 */
	const deleteSelectedRow = useCallback(() => {
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (e: any) {
				show(toast, "error", "Please check is the powermeter-api runing.");
			}
		}
	}, [selectedRow]);

	/**
 * DataTable reference
 */
	const dt = useRef<DataTable<DataTableValueArray>>(null);

	/**
 * Export measurements data to CSV
 * @param selectionOnly export only selected data
 */
	const exportCSV = useCallback(async (_selectionOnly: boolean) => {
		//dt.current.exportCSV({ selectionOnly });
		try {
			const result = await fetch("/api/admin/crud/channels");
			const data: ChannelValue[] = await result.json() as ChannelValue[];
			const csv = convertToCSV(data);
			downloadCsvFile(csv, "download.csv");
			// eslint-disable-next-line
		} catch (e: any) {
			show(toast, "error", "Please check is the powermeter-api runing.");
		}
	}, []);

	const header = (
		<>
			<div className="grid cols-2 justify-content-end w-ull">
				<div className="flex justify-content-end w-6 ">
					<h2>Channels</h2>
				</div>
				<div className="flex align-items-center justify-content-end gap-2 end w-6 ">
					<Button
						type="button"
						icon="pi pi-file"
						rounded
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={() => (async () => {
							await exportCSV(false);
						})()
						}
						data-pr-tooltip="CSV"
					/>
				</div>
			</div>
		</>
	);

	const formComoonent = (
		<form
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={handleSubmit(onSubmit, onSubmitError)}
			style={{ width: "100%" }}
		>
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
									tooltip={errors.power_meter_id?.message}
									className={classNames({
										"p-invalid": fieldState.invalid,
									})}
									value={field.value}
									onChange={(event) => field.onChange(Number(event.target.value))}
									options={power_meterValues}
									optionLabel="power_meter_name"
									optionValue="id"
									placeholder="Select Power meter"
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					</>
				)}
			/>
			<Controller
				name="channel"
				control={control}
				rules={{ required: "channel is required." }}
				render={({ field, fieldState }) => (
					<>
						<div className="grid align-items-baseline">
							<div className="col-12 mb-2 md:col-2 md:mb-0">
								<label htmlFor={field.name}>Channel: </label>
							</div>
							<div className="col-12 md:col-10">
								<InputNumber
									id={field.name}
									value={field.value || 0}
									tooltip={errors.channel?.message}
									className={classNames({
										"p-invalid": fieldState.invalid,
									})}
									onValueChange={(event) =>
										field.onChange(event.target.value as number)
									}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					</>
				)}
			/>
			<Controller
				name="channel_name"
				control={control}
				rules={{ required: "channel_name is required." }}
				render={({ field, fieldState }) => (
					<>
						<div className="grid align-items-baseline">
							<div className="col-12 mb-2 md:col-2 md:mb-0">
								<label htmlFor={field.name}>Channel name: </label>
							</div>
							<div className="col-12 md:col-10">
								<InputText
									id={field.name}
									value={field.value || ""}
									tooltip={errors.channel_name?.message}
									className={classNames({
										"p-invalid": fieldState.invalid,
									})}
									onChange={field.onChange}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					</>
				)}
			/>
			<Controller
				name="enabled"
				control={control}
				rules={{ required: "enabled is required." }}
				render={({ field, fieldState }) => (
					<>
						<div className="grid align-items-baseline">
							<div className="col-12 mb-2 md:col-2 md:mb-0">
								<label htmlFor={field.name}>Enabled: </label>
							</div>
							<div className="col-12 md:col-10">
								<Checkbox
									onChange={(event) =>
										field.onChange(event.target.checked ? true : false)
									}
									tooltip={errors.enabled?.message}
									className={classNames({
										"p-invalid": fieldState.invalid,
									})}
									checked={field.value}
								></Checkbox>
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

	return (
		<div className="card">
			<Toast ref={toast} />
			<Dialog
				header="channels"
				visible={visible}
				onHide={() => setVisible(false)}
				style={{ width: "50vw" }}
			>

				{formComoonent}

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
					value={channelsValues}
					ref={dt}
					header={header}
					selectionMode="single"
					selection={selectedRow}
					onSelectionChange={onSelectionChange}
					first={lazyState.first}
					paginator={true}
					lazy={true}
					rows={100}
					totalRecords={channelsCount ?? 0}
					onPage={onPage}
					loading={isDataLoading || isCountLoading}
					onFilter={onFilter}
					filters={lazyState.filters}
					filterDisplay="row"
					tableStyle={{ minWidth: "50rem" }}
				>
					<Column selectionMode="single" header="Select one"></Column>
					<Column field="power_meter_name" header="Powermeter name"></Column>
					<Column field="channel" header="Channel"></Column>
					<Column field="channel_name" header="Channel name"></Column>
					<Column field="enabled" header="Enabled"></Column>
				</DataTable>
			</div>
			<div className="flex flex-row gap-4 my-3">
				<Button
					label="New"
					icon="pi pi-check"
					onClick={() => {
						setSelectedRow(undefined);
						setEditedRow(getDefaultChannelValue());
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
};

export default Channels;
