import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, DataTableValueArray } from "primereact/datatable";
import { Column } from "primereact/column";
import { Controller, FieldErrors, useForm } from "react-hook-form";
import * as z from "zod";
import { Toast } from "primereact/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import dayjs from "dayjs";
import { InputNumber } from "primereact/inputnumber";
import { ProgressSpinner } from "primereact/progressspinner";
import { show } from "./Message";

/**
 * The report details
 */
const details = ["hourly", "daily", "monthly"];

/**
 * Home component
 * @returns the Home ReactComponent
 */
const Simple = () => {
	/**
	 * The tabla of measurements
	 */
	const [measurements, setMeasurements] = useState([]);

	/**
	 * The channels of selected powermeter
	 */
	const [channels, setChannels] = useState<ChannelValue[]>([]);

	/**
	 * Zod validator of form input values
	 */
	const schema = z.object({
		fromDate: z.date(),
		toDate: z.date(),
		ipAddress: z.string().ip("v4").nonempty(),
		channel: z.number().nullable(),
		details: z.string().nonempty(),
		multiplier: z.number().nullable(),
	});

	/**
	 * Toaster reference
	 */
	const toast = useRef<Toast>(null);

	/**
	 * DataTable reference
	*/
	const dt = useRef<DataTable<DataTableValueArray>>(null);

	/**
	 * React hook form
	 */
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValue>({ resolver: zodResolver(schema) });

	/**
	 * Set default values
	 */
	useEffect(() => {
		setValue("multiplier", null);
	}, [setValue]);

	/**
	 * Form submit error handler
	 * @param errors submit errors
	 */
	const onSubmitError = useCallback((_fieldErrors: FieldErrors<FormValue>) => {
		//console.log(_fieldErrors);
		show(toast,
			"error",
			"Please fill form as needed. Read tooltips on red marked fields.",
		);
	}, []);

	/**
	* Get all measurements
	* @param params parameters of measurements report
	*/
	const updateTable = useCallback(async (params: FormValue) => {
		let values = [];
		if (dt && dt.current) {
			dt.current.reset();
		}
		setMeasurements([]);
		setIsLoading(true);
		let path = `/api/measurements/report?fromdate=${dayjs(
			params.fromDate,
		).format("YYYY-MM-DD")}&todate=${dayjs(params.toDate).add(1, "day").format(
			"YYYY-MM-DD",
		)}&ip=${String(params.ipAddress)}&details=${String(params.details)}&multiplier=${String(params.multiplier)}`;
		if (params.channel > 0) {
			path += `&channel=${params.channel}`;
		}
		const res = await fetch(path);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		values = await res.json();
		if (Array.isArray(values) && values.length > 0) {
			if (channels) {
				values.forEach((records: RecElement) => {
					const channel_names = channels.filter(
						(ch) => ch.channel === records.channel,
					);
					if (channel_names.length > 0) {
						records.channel_name = channel_names[0].channel_name;
					}
				});
			}
		}
		setIsLoading(false);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (values.err) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			show(toast, "error", String(values.err));
			values = [];
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		setMeasurements(values);
	}, [channels, dt]);

	/**
	 * Form submit handler
	 * @param data the form input values
	 */
	const onSubmit = useCallback(async (data: FormValue) => {
		const yearDiff = (dayjs(data.toDate).get("year") !== dayjs(data.fromDate).get("year"));
		if (
			dayjs(data.fromDate).get("year") < dayjs().get("year") &&
			data.details !== "monthly"
		) {
			show(toast,
				"error",
				"Details must be monthly when required year less then current year.",
			);
		} else if (yearDiff) {
			show(toast,
				"error",
				"'From date' and 'To date' must be in same year.",
			);
		} else if (dayjs(data.toDate).isBefore(data.fromDate)) {
			show(toast,
				"error",
				"To date must be greater then from date.",
			);
		} else {
			await updateTable(data);
		}
	}, [updateTable]);

	const header = (
		<>
			<div className="grid cols-2 justify-content-end w-ull">
				<div className="flex justify-content-end w-6 ">
					<h2>Measurements Simple</h2>
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

	/**
	 * Get all powermeters from RestAPI
	 * @returns powermeters array
	 */
	const fetchPower_meterValues = useCallback(async () => {
		const response = await fetch("/api/admin/crud/power_meter");
		let data: [] = [];
		if (response.ok) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			data = await response.json();
		}
		return data;
	}, []);

	/**
	 * Powermeter UseQuery
	 */
	const { data: power_meterValues } = useQuery({
		queryKey: ["power_meter"],
		queryFn: fetchPower_meterValues,
	});

	/**
	 * Get all channel of powermeter from RestAPI
	 * @param power_meter_id chanels of powermeter
	 */
	const fetchChannels = useCallback(async (power_meter_id: number) => {
		const filter = encodeURIComponent(
			JSON.stringify({ power_meter_id }),
		);
		const result = await fetch("/api/admin/crud/channels?filter=" + filter);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const data = await result.json();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		setChannels(data);
	}, []);

	const [isLoading, setIsLoading] = useState(false);

	const formComponent = (): ReactNode => {
		return (
			<form
				// eslint-disable-next-line  @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit(onSubmit, onSubmitError)}
				className="flex flex-column w-full gap-4 h-fit sticky "
				style={{ top: "80px" }}
			>
				<Controller
					name="fromDate"
					control={control}
					rules={{ required: "from date is required." }}
					render={({ field, fieldState }) => (
						<>
							<Calendar
								id={field.name}
								value={field.value || ""}
								placeholder="From date"
								tooltip={errors.fromDate?.message}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								onChange={(event) =>
									field.onChange(event.target.value as string)
								}
								dateFormat="yy-mm-dd"
							/>
						</>
					)}
				/>
				<Controller
					name="toDate"
					control={control}
					rules={{ required: "to date is required." }}
					render={({ field, fieldState }) => (
						<>
							<Calendar
								id={field.name}
								value={field.value || ""}
								placeholder="To date"
								tooltip={errors.fromDate?.message}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								onChange={(event) =>
									field.onChange(event.target.value as string)
								}
								dateFormat="yy-mm-dd"
							/>
						</>
					)}
				/>
				<Controller
					name="ipAddress"
					control={control}
					rules={{ required: "Time zone is required." }}
					render={({ field, fieldState }) => (
						<>
							<Dropdown
								id={field.name}
								value={field.value}
								tooltip={errors.ipAddress?.message}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								// eslint-disable-next-line @typescript-eslint/no-misused-promises
								onChange={async (event) => {
									if (power_meterValues) {
										const powermeter: PowerMeterValue[] = power_meterValues.filter(
											(item: PowerMeterValue) => {
												return item.ip_address === event.target.value;
											},
										);
										if (Array.isArray(powermeter) && powermeter.length > 0 && powermeter[0].id) {
											await fetchChannels(powermeter[0].id);
										}
										field.onChange(String(event.target.value));
									}
								}}
								options={power_meterValues}
								optionLabel="power_meter_name"
								optionValue="ip_address"
								placeholder="Select powermeter"
							/>
						</>
					)}
				/>
				<Controller
					name="channel"
					control={control}
					rules={{}}
					render={({ field, fieldState }) => (
						<>
							<Dropdown
								id={field.name}
								value={field.value}
								tooltip={errors.channel?.message}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								onChange={(event) => field.onChange(Number(event.target.value))}
								options={[{ channel_name: "All", channel: -1 }, ...channels]}
								optionLabel="channel_name"
								optionValue="channel"
								placeholder="Select channel"
							/>
						</>
					)}
				/>
				<Controller
					name="details"
					control={control}
					rules={{ required: "Details is required." }}
					render={({ field, fieldState }) => (
						<>
							<Dropdown
								id={field.name}
								value={field.value}
								tooltip={errors.ipAddress?.message}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								onChange={(event) => field.onChange(String(event.target.value))}
								options={details}
								placeholder="Select details"
							/>
						</>
					)}
				/>
				<Controller
					name="multiplier"
					control={control}
					rules={{}}
					render={({ field, fieldState }) => (
						<>
							<InputNumber id={field.name}
								value={field.value}
								className={classNames({
									"p-invalid": fieldState.invalid,
								})}
								tooltip={errors.fromDate?.message}
								onValueChange={(event) =>
									field.onChange(event.target.value as number)}
								style={{ width: "100%" }}
								placeholder="Multiplier" />
						</>
					)}
				/>

				<span className="filter-labels m-auto">
					<Button label="Send" icon="pi pi-check" type="submit" />
				</span>
			</form>
		);
	};

	return (
		<div className="card flex flex-row justify-content-start my-5 gap-3">
			<Toast ref={toast} />

			<div className=" flex min-h-fit h-screen w-3  ">
				{formComponent()}
			</div>
			{
				isLoading &&
				<div className="absolute w-full h-full surface-400 opacity-50 top-0 left-0 z-5 flex justify-content-center align-items-center">
					<ProgressSpinner
						style={{ width: "50px", height: "50px" }}
						strokeWidth="8"
						fill="var(--surface-ground)"
						animationDuration=".5s"
					/>
				</div>
			}

			<div className="card w-full">
				<DataTable
					value={measurements}
					ref={dt}
					header={header}
					tableStyle={{ minWidth: "50rem" }}
					paginator={true}
					rows={100}
				>
					<Column field="from_unix_time" header="From Date"></Column>
					<Column field="to_unix_time" header="To Date"></Column>
					<Column align={"center"} field="channel_name" header="Channel"></Column>
					<Column align={"right"} field="diff" header="Consumption (Wh)"></Column>
					<Column align={"right"} field="multipliedValue" header="Multiplied value"></Column>
				</DataTable>
			</div>
		</div>
	);
};

export default Simple;
