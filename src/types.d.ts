/**
 * The input form objects
 */
interface FormValues {
    fromDate: string;
    toDate: string;
    ipAddress: string;
    channel: number;
    details: string;
}

interface PowerMeterValues {
    id?: number,
    asset_name: string,
    ip_address: string,
    port: number,
    time_zone: string,
    enabled: boolean,
}

interface ChannelValues {
    id?: number,
    power_meter_id: number,
    channel: number,
    channel_name: string,
    enabled: boolean,
}

interface RecElement {
    recorded_time: number,
    measured_value: number,
    channel: number,
    channel_name?: string,
    diff?: number,
    from_utc_time?: string,
    to_utc_time?: string,
    from_server_time?: string,
    to_server_time?: string,
    from_local_time?: string,
    to_local_time?: string,
}
