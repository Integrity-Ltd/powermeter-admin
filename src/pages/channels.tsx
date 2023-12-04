import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
	DataTable,
	DataTableStateEvent,
	DataTableSelectionChangeEvent,
	DataTableValueArray,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { convertToCSV, downloadCsvFile } from "../utils/Converter";
import { deleteCallback, useGetChannels, useGetChannelsCount } from "../api/channelsApi";
import { show } from "../pages/Message";
import ChannelFormComponent from "../forms/channelForm";

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
	const [isEditDialogvisible, setIsEditDialogVisible] = useState(false);
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
	const { data: channelsValues, isLoading: isDataLoading } = useGetChannels(toast, lazyState);

	/**
	 * Channel count query with RestAPI call
	 */
	const { data: channelsCount, isLoading: isCountLoading } = useGetChannelsCount(toast, lazyState);

	/**
	 * Power meter values state hook
	 */
	const [powerMeterValues, setPowerMeterValues] = useState<PowerMeterValue[]>([]);

	/**
	 * Delete selected powermeter with RestAPI
	 */
	const deleteSelectedRow = deleteCallback(toast, updatePage, selectedRow);

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
		} catch (e: unknown) {
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
						onClick={() => exportCSV(false)}
						data-pr-tooltip="CSV"
					/>
				</div>
			</div>
		</>
	);

	return (
		<div className="card">
			<Toast ref={toast} />

			<ChannelFormComponent toast={toast} visible={isEditDialogvisible} setVisible={setIsEditDialogVisible} updatePage={updatePage} editedRow={editedRow} powerMeterValues={powerMeterValues} setPowerMeterValues={setPowerMeterValues}></ChannelFormComponent>

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
						setIsEditDialogVisible(true);
					}}
				/>
				<Button
					label="Modify"
					icon="pi pi-check"
					onClick={() => {
						setEditedRow(selectedRow);
						setIsEditDialogVisible(true);
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
