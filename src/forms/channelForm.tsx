import { InputText } from "primereact/inputtext";
import { classNames } from "primereact/utils";
import { FormValues, channelSubmitCallback } from "../api/channelsApi";
import { Controller, FieldErrors, useForm } from "react-hook-form";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Dispatch, RefObject, SetStateAction, useCallback, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { show } from "../pages/Message";
import { usePowerMeterValuesCallback } from "../api/channelsApi";

type ChannelFormComponentProps = {
	toast: RefObject<Toast>;
	visible: boolean;
	setVisible: Dispatch<SetStateAction<boolean>>;
	updatePage: () => Promise<void>;
	editedRow: ChannelValue | undefined;
	powerMeterValues: PowerMeterValue[];
	setPowerMeterValues: Dispatch<SetStateAction<PowerMeterValue[]>>;
};

const ChannelFormComponent = ({
	toast,
	visible,
	setVisible,
	updatePage,
	editedRow,
	powerMeterValues,
	setPowerMeterValues,
}: ChannelFormComponentProps) => {

	/**
 * The Zod validation schema of form data
 */
	const channelSchema = z.object({
		power_meter_id: z.number(),
		channel: z.number().min(1),
		channel_name: z.string().nonempty(),
		enabled: z.boolean(),
	});

	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(channelSchema) });

	/**
	 * Power meter values fetch
	 */
	const fetchPowerMeterValues = usePowerMeterValuesCallback(toast, setPowerMeterValues);

	/**
	 * EditedRow useEffect
	 */
	useEffect(() => {
		//console.log(selectedRows);
		fetchPowerMeterValues().then(() => {
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
	}, [editedRow, setValue, fetchPowerMeterValues]);

	/**
	   * React hook form submit callback. Use for create and update RestAPI calls
	   *
	   * @param data submited data values
	   */
	const onSubmit = channelSubmitCallback(toast, setVisible, updatePage, editedRow);

	/**
	 * React hook form submition error handler
	 * @param errors errors
	 */
	const onSubmitError = useCallback((_fieldErrors: FieldErrors<FormValues>) => {
		//console.log(_fieldErrors);
		show(toast,
			"error",
			"Please fill form as needed. Read tooltips on red marked fields.",
		);
	}, []);

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				header="channels"
				visible={visible}
				onHide={() => setVisible(false)}
				style={{ width: "50vw" }}
			>

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
											options={powerMeterValues}
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
			</Dialog>
		</>
	);
};

export default ChannelFormComponent;
