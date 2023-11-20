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
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog } from "primereact/confirmdialog";
import { classNames } from "primereact/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProgressSpinner } from "primereact/progressspinner";

dayjs.extend(utc);
dayjs.extend(timezone);

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
    type Key =
        | "calendar"
        | "collation"
        | "currency"
        | "numberingSystem"
        | "timeZone"
        | "unit";

    function supportedValuesOf(input: Key): string[];
}

const timeZonesList = Intl.supportedValuesOf("timeZone");
const defaultTimeZone = dayjs.tz.guess();

/**
 * The input form objects
 *
 */
interface FormValues {
    id: number;
    power_meter_name: string;
    ip_address: string;
    port: number;
    time_zone: string;
    enabled: boolean;
}

/**
 * The Zod validation schema of form data
 *
 */
const schema = z.object({
    power_meter_name: z.string().nonempty(),
    ip_address: z.string().ip("v4").nonempty(),
    port: z.number().min(1),
    time_zone: z.string().nonempty(),
    enabled: z.boolean(),
});

/**
 * The power mater component
 *
 * @returns the power meter ReactComponent
 */
export default function Powermeter() {
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

    const getDefaultPowerMeterValues = (): PowerMeterValues => {
        return {
            power_meter_name: "",
            ip_address: "",
            port: 50003,
            time_zone: defaultTimeZone,
            enabled: false,
        };
    };
    /**
     * The edited row of power meter
     */
    const [editedRow, setEditedRow] = useState<PowerMeterValues | null>(
        getDefaultPowerMeterValues()
    );
    /**
     * The selected row of power meter
     */
    const [selectedRow, setSelectedRow] = useState<PowerMeterValues | null>(null);
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
            setSelectedRow(e.value as PowerMeterValues);
        },
        []
    );

    /**
     * Reload DataTable and count
     */
    const updatePage = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["power_meter"] });
        await queryClient.invalidateQueries({ queryKey: ["power_metercount"] });
        setSelectedRow(null);
        setEditedRow(getDefaultPowerMeterValues());
    }, [queryClient]);

    /**
     * Power meter data query
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { data: power_meterValues, isLoading: isDataLoading } = useQuery({
        queryKey: ["power_meter", lazyState],
        queryFn: async () => {
            const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
            const res = await fetch(
                `/api/admin/crud/power_meter?first=${lazyState.first}&rowcount=${lazyState.rows}&filter=${filters}`
            );
            let values = await res.json();
            values.forEach((element: PowerMeterValues, idx: number) => {
                values[idx].enabled = values[idx].enabled ? true : false;
            });
            return values;
        },
    });

    /**
     * Power meter count query
     */
    const { data: count, isLoading: isCountLoading } = useQuery<number>({
        queryKey: ["power_metercount", lazyState],
        queryFn: async () => {
            const filters = encodeURIComponent(JSON.stringify(lazyState.filters));
            const res = await fetch(
                `/api/admin/crud/power_meter/count?filter=${filters}`
            );
            const { count } = await res.json();
            return count;
        },
    });

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

    /**
     * React hook form submit callback. Use for create and update RestAPI calls
     *
     * @param data submited data values
     */
    const onSubmit = useCallback((data: FormValues) => {
        setLoading(true);
        const params = {
            power_meter_name: data.power_meter_name,
            ip_address: data.ip_address,
            port: data.port,
            time_zone: data.time_zone,
            enabled: data.enabled ? true : false,
        };

        if (editedRow && editedRow.id) {
            fetch("/api/admin/crud/power_meter/" + editedRow.id, {
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
                .then((data) => {
                    setLoading(false);
                    updatePage();
                    setVisible(false);
                    show("success", `Updated powermeter: ${JSON.stringify(data)}`);
                })
                .catch((err) => {
                    show("error", err)
                });
            setLoading(false);
        } else {
            fetch("/api/admin/crud/power_meter", {
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
                .then((data) => {
                    setLoading(false);
                    setVisible(false);
                    show("success", `Saved powermeter: ${JSON.stringify(data)}`);
                    updatePage();
                })
                .catch((err: Error) => {
                    setLoading(false);
                    setVisible(false);
                    show("error", err.message);
                });
        }
    }, [editedRow, updatePage]);

    /**
     * Show message
     * @param severity severity of message
     * @param message message to display
     */
    const show = useCallback((
        severity: "success" | "info" | "warn" | "error" | undefined,
        message: string
    ) => {
        if (toast.current !== null) {
            toast.current.show({
                severity: severity,
                summary: "Form submit",
                detail: message,
            });
        }
    }, []);

    /**
     * EditedRow useEffect
     */
    useEffect(() => {
        //console.log(selectedRows);
        if (editedRow && editedRow.id) {
            setValue("power_meter_name", editedRow.power_meter_name);
            setValue("ip_address", editedRow.ip_address);
            setValue("port", editedRow.port);
            setValue("time_zone", editedRow.time_zone);
            setValue("enabled", editedRow.enabled ? true : false);
        } else {
            setValue("power_meter_name", "");
            setValue("ip_address", "");
            setValue("port", 50003);
            setValue("time_zone", defaultTimeZone);
            setValue("enabled", false);
        }
    }, [editedRow, setValue]);

    /**
     * Delete selected powermeter with RestAPI
     */
    const deleteSelectedRow = useCallback(() => {
        if (selectedRow) {
            fetch("/api/admin/crud/power_meter/" + selectedRow.id, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                cache: "no-cache",
                body: JSON.stringify({ action: "delete" }),
            })
                .then((response) => {
                    return response.json();
                })
                .then((data) => {
                    show("success", `Deleted power_meter: ${JSON.stringify(data)}`);
                    updatePage();
                })
                .catch((err) => show("error", err));
        }
    }, [selectedRow]);

    /**
     * React hook form submition error handler
     * @param errors errors
     */
    const onSubmitError = useCallback((errors: FieldErrors<FormValues>) => {
        //console.log(errors);
        show(
            "error",
            "Please fill form as needed. Read tooltips on red marked fields."
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

    const header = (
        <>
            <div className="grid cols-2 justify-content-end w-ull">
                <div className="flex justify-content-end w-6 ">
                    <h2>Powermeters</h2>
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
                onSubmit={handleSubmit(onSubmit, onSubmitError)}
                style={{ width: "100%" }}
            >
                <Controller
                    name="power_meter_name"
                    control={control}
                    rules={{ required: "Powermeter name is required." }}
                    render={({ field, fieldState }) => (
                        <>
                            <div className="grid align-items-baseline">
                                <div className="col-12 mb-2 md:col-2 md:mb-0">
                                    <label htmlFor={field.name}>Power meter name: </label>
                                </div>
                                <div className="col-12 md:col-10">
                                    <InputText
                                        id={field.name}
                                        value={field.value || ""}
                                        tooltip={errors.power_meter_name?.message}
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
                    name="ip_address"
                    control={control}
                    rules={{ required: "IP Address is required." }}
                    render={({ field, fieldState }) => (
                        <>
                            <div className="grid align-items-baseline">
                                <div className="col-12 mb-2 md:col-2 md:mb-0">
                                    <label htmlFor={field.name}>IP Address: </label>
                                </div>
                                <div className="col-12 md:col-10">
                                    <InputText
                                        disabled={
                                            editedRow !== undefined &&
                                            editedRow !== null &&
                                            editedRow.id !== undefined &&
                                            editedRow.id > -1
                                        }
                                        id={field.name}
                                        value={field.value || ""}
                                        tooltip={errors.ip_address?.message}
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
                    name="port"
                    control={control}
                    rules={{ required: "Port is required." }}
                    render={({ field, fieldState }) => (
                        <>
                            <div className="grid align-items-baseline">
                                <div className="col-12 mb-2 md:col-2 md:mb-0">
                                    <label htmlFor={field.name}>Port: </label>
                                </div>
                                <div className="col-12 md:col-10">
                                    <InputNumber
                                        disabled={
                                            editedRow !== undefined &&
                                            editedRow !== null &&
                                            editedRow.id !== undefined &&
                                            editedRow.id > -1
                                        }
                                        id={field.name}
                                        value={field.value}
                                        tooltip={errors.port?.message}
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
                    name="time_zone"
                    control={control}
                    rules={{ required: "Time zone is required." }}
                    render={({ field, fieldState }) => (
                        <>
                            <div className="grid align-items-baseline">
                                <div className="col-12 mb-2 md:col-2 md:mb-0">
                                    <label htmlFor={field.name}>Time zone: </label>
                                </div>
                                <div className="col-12 md:col-10">
                                    <Dropdown
                                        id={field.name}
                                        value={field.value}
                                        tooltip={errors.time_zone?.message}
                                        className={classNames({
                                            "p-invalid": fieldState.invalid,
                                        })}
                                        onChange={(event) => field.onChange(event.target.value)}
                                        options={timeZonesList}
                                        placeholder="Select TimeZone"
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
                    rules={{ required: "Enabled is required." }}
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
    };

    return (
        <div className="card">
            <Toast ref={toast} />
            <Dialog
                header="Power meter"
                visible={visible}
                onHide={() => setVisible(false)}
                style={{ width: "50vw" }}
                className="absolute overflow-hidden"
            >
                {formComponent()}

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
                    value={power_meterValues}
                    ref={dt}
                    header={header}
                    selectionMode="single"
                    selection={selectedRow}
                    onSelectionChange={onSelectionChange}
                    first={lazyState.first}
                    paginator={true}
                    lazy={true}
                    rows={100}
                    totalRecords={count ?? 0}
                    onPage={onPage}
                    loading={isDataLoading || isCountLoading}
                    onFilter={onFilter}
                    filters={lazyState.filters}
                    filterDisplay="row"
                    tableStyle={{ minWidth: "50rem" }}
                >
                    <Column selectionMode="single" header="Select one"></Column>
                    <Column field="power_meter_name" header="Powermeter name"></Column>
                    <Column field="ip_address" header="IP address"></Column>
                    <Column field="port" header="Port"></Column>
                    <Column field="time_zone" header="Time zone"></Column>
                    <Column field="enabled" header="Enabled"></Column>
                </DataTable>
            </div>
            <div className="flex flex-row gap-4 my-3">
                <Button
                    label="New"
                    icon="pi pi-check"
                    onClick={() => {
                        setSelectedRow(null);
                        setEditedRow(getDefaultPowerMeterValues());
                        setVisible(true);
                    }}
                />
                <Button
                    label="Modify"
                    icon="pi pi-check"
                    onClick={() => {
                        setEditedRow(selectedRow);
                        control._formValues["time_zone"] = defaultTimeZone;
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
