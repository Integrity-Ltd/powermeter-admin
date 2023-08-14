import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, DataTableValueArray } from "primereact/datatable";
import { Column } from "primereact/column";
import { Controller, FieldErrors, useForm } from "react-hook-form";
import * as z from 'zod';
import { Toast } from "primereact/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
import { Calendar } from 'primereact/calendar';
import { Dropdown } from "primereact/dropdown";
import dayjs from "dayjs";


/**
 * The report details
 */
const details = ['hourly', 'daily', 'monthly'];

/**
 * Home component
 * @returns the Home ReactComponent
 */
const Home = () => {

    /**
     * The tabla of measurements
     */
    const [measurements, setMeasurements] = useState([]);

    /**
     * The channels of selected powermeter
     */
    const [channels, setChannels] = useState<ChannelValues[]>([]);

    /**
     * Zod validator of form input values
     */
    const schema = z.object({
        fromDate: z.date(),
        toDate: z.date(),
        ipAddress: z.string().ip("v4").nonempty(),
        channel: z.number().nullable(),
        details: z.string().nonempty()
    });

    interface formValues {
        fromDate: string, toDate: string, ipAddress: string, channel: number, details: string
    }

    /**
     * Toaster reference
     */
    const toast = useRef<Toast>(null);

    /**
     * React hook form
     */
    const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

    /**
     * Show message
     * @param severity severity of message
     * @param message message to display
     */
    const show = (severity: "success" | "info" | "warn" | "error" | undefined, message: string) => {
        if (toast.current !== null) {
            toast.current.show({ severity: severity, summary: 'Form submit', detail: message });
        }
    }

    /**
     * Form submit error handler
     * @param errors submit errors
     */
    const onSubmitError = (errors: FieldErrors<FormValues>) => {
        //console.log(errors);
        show("error", "Please fill form as needed. Read tooltips on red marked fields.");
    }

    /**
     * Form submit handler
     * @param data the form input values
     */
    const onSubmit = (data: FormValues) => {
        if (dayjs(data.fromDate).get("year") < dayjs().get("year") && (data.details !== "monthly")) {
            show("error", "Details must be monthly when required year less then current year");
        } else {
            updateTable(data);
        }
    }

    const header = (
        <div className="flex align-items-center justify-content-end gap-2">
            <Button type="button" icon="pi pi-file" rounded onClick={() => exportCSV(false)} data-pr-tooltip="CSV" />
        </div>
    );

    /**
     * DataTable reference
     */
    const dt = useRef<DataTable<DataTableValueArray>>(null);

    /**
     * Export measurements data to CSV
     * @param selectionOnly export only selected data 
     */
    const exportCSV = (selectionOnly: boolean) => {
        if (dt && dt.current) {
            const currentRef = dt.current;
            currentRef.exportCSV({ selectionOnly });
        }
    };

    /**
     * Get all powermeters from RestAPI
     * @returns powermeters array
     */
    const fetchPower_meterValues = async () => {
        let response = await fetch('/api/admin/crud/power_meter');
        let data = await response.json();
        return data;
    }

    /**
     * Powermeter UseQuery
     */
    const { data: power_meterValues } = useQuery({
        queryKey: ["power_meter"],
        queryFn: fetchPower_meterValues
    });

    /**
     * Get all channel of powermeter from RestAPI
     * @param power_meter_id chanels of powermeter
     */
    const fetchChannels = async (power_meter_id: number) => {
        let filter = encodeURIComponent(JSON.stringify({ power_meter_id: power_meter_id }));
        let result = await fetch('/api/admin/crud/channels?filter=' + filter);
        let data = await result.json();
        setChannels(data);
    }

    const [isLoading, setIsLoading] = useState(false);

    /**
     * Get all measurements
     * @param params parameters of measurements report
     */
    const updateTable = async (params: formValues) => {
        let values = [];
        if (dt && dt.current) {
            dt.current.reset();
        }
        setIsLoading(true);
        let path = `/api/measurements/report?fromdate=${dayjs(params.fromDate).format("YYYY-MM-DD")}&todate=${dayjs(params.toDate).format("YYYY-MM-DD")}&ip=${params.ipAddress}&details=${params.details}`;
        if (params.channel > 0) {
            path += `&channel=${params.channel}`;
        }
        const res = await fetch(path);
        values = await res.json();
        setIsLoading(false);
        if (channels) {
            values.forEach((records: RecElement) => {
                let channel_names = channels.filter(ch => ch.channel === records.channel)
                if (channel_names.length > 0) {
                    records.channel_name = channel_names[0].channel_name
                }
            });
        }
        if (values.err) {
            show("error", values.err);
            values = [];
        }
        setMeasurements(values);
    }

    return (
        <div className="card">
            <Toast ref={toast} />
            <h1>Measurements</h1>
            <div className="">
                <form onSubmit={handleSubmit(onSubmit, onSubmitError)} style={{ width: '100%' }}>
                    <Controller
                        name="fromDate"
                        control={control}
                        rules={{ required: 'from date is required.' }}
                        render={({ field, fieldState }) => (
                            <>
                                <Calendar id={field.name} value={field.value || ''} placeholder="From date" tooltip={errors.fromDate?.message} className={classNames({ 'p-invalid': fieldState.invalid })} onChange={(event) => field.onChange((event.target.value as string))} dateFormat="yy-mm-dd" />
                            </>
                        )}
                    />
                    <Controller
                        name="toDate"
                        control={control}
                        rules={{ required: 'to date is required.' }}
                        render={({ field, fieldState }) => (
                            <>
                                <Calendar id={field.name} value={field.value || ''} placeholder="To date" tooltip={errors.fromDate?.message} className={classNames({ 'p-invalid': fieldState.invalid })} onChange={(event) => field.onChange((event.target.value as string))} dateFormat="yy-mm-dd" />
                            </>
                        )}
                    />
                    <Controller
                        name="ipAddress"
                        control={control}
                        rules={{ required: 'Time zone is required.' }}
                        render={({ field, fieldState }) => (
                            <>

                                <Dropdown id={field.name} value={field.value} tooltip={errors.ipAddress?.message} className={classNames({ 'p-invalid': fieldState.invalid })} onChange={(event) => {
                                    let powermeter = power_meterValues.filter((item: PowerMeterValues) => {
                                        return item.ip_address === event.target.value;
                                    })
                                    if (powermeter.length > 0) {
                                        fetchChannels(powermeter[0].id);
                                    }
                                    field.onChange(event.target.value)
                                }} options={power_meterValues} optionLabel="asset_name" optionValue="ip_address" placeholder="Select asset" />


                            </>
                        )}
                    />
                    <Controller
                        name="channel"
                        control={control}
                        rules={{}}
                        render={({ field, fieldState }) => (
                            <>
                                <Dropdown id={field.name} value={field.value} tooltip={errors.channel?.message} className={classNames({ 'p-invalid': fieldState.invalid })} onChange={(event) => field.onChange(event.target.value)} options={[{ channel_name: "All", channel: -1 }, ...channels]} optionLabel="channel_name" optionValue="channel" placeholder="Select channel" />
                            </>
                        )}
                    />
                    <Controller
                        name="details"
                        control={control}
                        rules={{ required: 'Details is required.' }}
                        render={({ field, fieldState }) => (
                            <>
                                <Dropdown id={field.name} value={field.value} tooltip={errors.ipAddress?.message} className={classNames({ 'p-invalid': fieldState.invalid })} onChange={(event) => field.onChange(event.target.value)} options={details} placeholder="Select details" />
                            </>
                        )}
                    />
                    <span className="filter-labels">
                        <Button label="Send" icon="pi pi-check" type="submit" />
                    </span>
                </form>
            </div>
            <div className="card">
                <DataTable value={measurements}
                    ref={dt}
                    header={header}
                    tableStyle={{ minWidth: '50rem' }}
                    loading={isLoading}
                    paginator={true}
                    rows={100}
                >
                    <Column field="from_local_time" header="From Local Time"></Column>
                    <Column field="to_local_time" header="To Local Time"></Column>
                    <Column field="from_server_time" header="From Server Time"></Column>
                    <Column field="to_server_time" header="To Server Time"></Column>
                    <Column field="from_utc_time" header="From UTC Time"></Column>
                    <Column field="to_utc_time" header="To UTC Time"></Column>
                    <Column field="channel_name" header="Channel"></Column>
                    <Column field="measured_value" header="Measured value"></Column>
                    <Column field="diff" header="Diff"></Column>
                </DataTable>
            </div>
        </div>
    )
}

export default Home;
