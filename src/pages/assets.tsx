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
import { deleteAssetRowCallback, useAssetsCount, useAssetsValues } from "../api/assetsApi";
import AssetFormComponent from "../forms/assetForm";
import { show } from "./Message";

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
	const [editedRow, setEditedRow] = useState<AssetsValue | undefined>(
		getDefaultAssetsValues(),
	);
	/**
 * The selected row of assets
 */
	const [selectedRow, setSelectedRow] = useState<AssetsValue | undefined>(undefined);
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
		await queryClient.invalidateQueries({ queryKey: ["assets"] });
		await queryClient.invalidateQueries({ queryKey: ["assetscount"] });
		setSelectedRow(undefined);
		setEditedRow(getDefaultAssetsValues());
	}, [queryClient, getDefaultAssetsValues]);

	/**
	 * Assets data query
	 *  */
	const { data: assetsValues, isLoading: isDataLoading } = useAssetsValues(lazyState);

	/**
	   * Assets count query
	   */
	const { data: assertCount, isLoading: isCountLoading } = useAssetsCount(lazyState);

	/**
	 * Toast reference
	 */
	const toast = useRef<Toast>(null);

	/**
	 * Delete selected asset with RestAPI
	 */
	const deleteSelectedRow = deleteAssetRowCallback(toast, updatePage, selectedRow);

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

	return (
		<div className="card">
			<Toast ref={toast} />

			<AssetFormComponent
				toast={toast}
				visible={isEditDialogvisible}
				setVisible={setIsEditDialogVisible}
				updatePage={updatePage}
				editedRow={editedRow}
			/>

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
						queryClient.invalidateQueries({ queryKey: ["assetnames"] }).then(() => {
							setSelectedRow(undefined);
							setEditedRow(getDefaultAssetsValues());
							setIsEditDialogVisible(true);
						}).catch((err: Error) => {
							show(toast, "error", "Error Message" + err.message);
						});
					}}
				/>
				<Button
					label="Modify"
					icon="pi pi-check"
					onClick={() => {
						queryClient.invalidateQueries({ queryKey: ["assetnames"] }).then(() => {
							setEditedRow(selectedRow);
							setIsEditDialogVisible(true);
						}).catch((err: Error) => {
							show(toast, "error", "Error Message" + err.message);
						});
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
