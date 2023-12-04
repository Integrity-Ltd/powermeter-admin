import { Controller, FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onAssetSubmitCallback, useAssetNames as useAssetNameList, useFetchChannelsCallback, usePowerMeterList } from "../api/assetsApi";
import { Dispatch, RefObject, SetStateAction, useCallback, useEffect, useState } from "react";
import { classNames } from "primereact/utils";
import { AutoComplete } from "primereact/autocomplete";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { show } from "../pages/Message";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { useQueryClient } from "@tanstack/react-query";

type AssetFormComponentProps = {
	toast: RefObject<Toast>;
	visible: boolean;
	setVisible: Dispatch<SetStateAction<boolean>>;
	updatePage: () => Promise<void>;
	editedRow: AssetsValue | undefined;
};

/**
 * The input form objects
 *
 */
export interface AssetFormValues {
	id: number;
	asset_name_id: number;
	asset_name: string | undefined;
	power_meter_id: number;
	channel_id: number;
}

const AssetFormComponent = ({
	toast,
	visible,
	setVisible,
	updatePage,
	editedRow,

}: AssetFormComponentProps) => {
	/**
	 * The Zod validation schema of form data
	 *
	 */
	const schema = z.object({
		asset_name_id: z.number(),
		channel_id: z.number().min(0),
	});

	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<AssetFormValues>({ resolver: zodResolver(schema) });

	const [assetName, setAssetName] = useState<AssetNameValue | undefined>(undefined);

	/**
	 * Asset names query
	 */
	const { data: assetNameList } = useAssetNameList();

	/**
	 * React hook form submition error handler
	 * @param errors errors
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const onSubmitError = useCallback((_fieldErrors: FieldErrors<AssetFormValues>) => {
		//console.log(_fieldErrors);
		show(toast, "error", "Please fill form as needed. Read tooltips on red marked fields.",
		);
	}, []);

	/** Loading state for the saving animation */
	const [loading, setLoading] = useState(false);

	/**
	 * React hook form submit callback. Use for create and update RestAPI calls
	 *
	 * @param data submited data values
	 */
	const onSubmit = onAssetSubmitCallback(toast, setVisible, updatePage, editedRow, setLoading, control, assetName, setAssetName);

	const [items, setItems] = useState<string[]>([]);

	const completeMethod = useCallback((e: { query: string; }) => {
		let result: string[] = [];
		if (Array.isArray(assetNameList)) {
			result = assetNameList.filter((item: AssetNameValue) => item.name.toLowerCase().startsWith(e.query.toLowerCase())).map((item: AssetNameValue) => item.name);
		}
		setItems(result);
	}, [assetNameList]);

	const [channels, setChannels] = useState<ChannelValue[]>([]);

	const fetchChannels = useFetchChannelsCallback(setChannels);

	const { data: powermeterList } = usePowerMeterList();

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
			}).catch((err: Error) =>
				show(toast, "error", String(err.message)),
			);
		} else {
			setChannels([]);
			setAssetName({ id: -1, name: "" });
			setValue("asset_name_id", -1);
			setValue("asset_name", "");
			setValue("power_meter_id", -1);
			setValue("channel_id", -1);
		}
	}, [editedRow, setValue]);

	return (
		<>
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
												if (assetNameList) {
													const assetNameIdByName: AssetNameValue | undefined = assetNameList.find((item: AssetNameValue) => item.name === e.value);
													setValue("asset_name_id", Number(assetNameIdByName?.id) || -1);
													setAssetName(assetNameIdByName);
												}
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
												})().catch((err: Error) => show(toast, "error", err.message));
											}}
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
			</Dialog>
		</>
	);
};

export default AssetFormComponent;
