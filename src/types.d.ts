/**
 * The input form objects
 */
interface FormValue {
	fromDate: string;
	toDate: string;
	ipAddress: string;
	channel: number;
	details: string;
	multiplier: number | null;
}

interface StatisticsFormValue {
	assetNameId: number;
	details: string;
}

interface PowerMeterValue {
	id?: number;
	power_meter_name: string;
	ip_address: string;
	port: number;
	time_zone: string;
	enabled: boolean;
}

interface AssetNameValue {
	id?: number;
	name: string;
}

interface AssetsValue {
	id?: number;
	asset_name_id: number;
	asset_name?: string;
	power_meter_id: number;
	channel_id: number;
}

interface ChannelValue {
	id?: number;
	power_meter_id: number;
	channel: number;
	channel_name: string;
	enabled: boolean;
	power_meter_name?: string;
}

interface RecElement {
	recorded_time: number;
	measured_value: number;
	channel: number;
	channel_name?: string;
	diff?: number;
	from_utc_time?: string;
	to_utc_time?: string;
	from_server_time?: string;
	to_server_time?: string;
	from_local_time?: string;
	to_local_time?: string;
}
