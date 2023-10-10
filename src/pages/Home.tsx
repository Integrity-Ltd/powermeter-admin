import { useEffect, useRef, useState } from "react";
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

/**
 * The report details
 */
const details = ["hourly", "daily", "monthly"];

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
    details: z.string().nonempty(),
    multiplier: z.number().nullable(),
  });


  /**
   * Toaster reference
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
   * Show message
   * @param severity severity of message
   * @param message message to display
   */
  const show = (
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
  };

  /**
   * Set default values
   */
  useEffect(() => {
    setValue("multiplier", null);
  }, [])

  /**
   * Form submit error handler
   * @param errors submit errors
   */
  const onSubmitError = (errors: FieldErrors<FormValues>) => {
    //console.log(errors);
    show(
      "error",
      "Please fill form as needed. Read tooltips on red marked fields."
    );
  };

  /**
   * Form submit handler
   * @param data the form input values
   */
  const onSubmit = (data: FormValues) => {
    const yearDiff = (dayjs(data.toDate).get("year") !== dayjs(data.fromDate).get("year"));
    if (
      dayjs(data.fromDate).get("year") < dayjs().get("year") &&
      data.details !== "monthly"
    ) {
      show(
        "error",
        "Details must be monthly when required year less then current year."
      );
    } else if (yearDiff) {
      show(
        "error",
        "'From date' and 'To date' must be in same year."
      );
    } else if (dayjs(data.toDate).isBefore(data.fromDate)) {
      show(
        "error",
        "To date must be greater then from date."
      );
    } else {
      updateTable(data);
    }
  };

  const header = (
    <>
      <div className="grid cols-2 justify-content-end w-ull">
        <div className="flex justify-content-end w-6 ">
          <h2>Measurements</h2>
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
    let response = await fetch("/api/admin/crud/power_meter");
    let data: [] = [];
    if (response.ok) {
      data = await response.json();
    }
    return data;
  };

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
  const fetchChannels = async (power_meter_id: number) => {
    let filter = encodeURIComponent(
      JSON.stringify({ power_meter_id: power_meter_id })
    );
    let result = await fetch("/api/admin/crud/channels?filter=" + filter);
    let data = await result.json();
    setChannels(data);
  };

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get all measurements
   * @param params parameters of measurements report
   */
  const updateTable = async (params: FormValues) => {
    let values = [];
    if (dt && dt.current) {
      dt.current.reset();
    }
    setIsLoading(true);
    let path = `/api/measurements/report?fromdate=${dayjs(
      params.fromDate
    ).format("YYYY-MM-DD")}&todate=${dayjs(params.toDate).add(1, 'day').format(
      "YYYY-MM-DD"
    )}&ip=${params.ipAddress}&details=${params.details}&multiplier=${params.multiplier}`;
    if (params.channel > 0) {
      path += `&channel=${params.channel}`;
    }
    const res = await fetch(path);
    values = await res.json();
    setIsLoading(false);
    if (Array.isArray(values) && values.length > 0) {
      if (channels) {
        values.forEach((records: RecElement) => {
          let channel_names = channels.filter(
            (ch) => ch.channel === records.channel
          );
          if (channel_names.length > 0) {
            records.channel_name = channel_names[0].channel_name;
          }
        });
      }
    }
    if (values.err) {
      show("error", values.err);
      values = [];
    }
    setMeasurements(values);
  };

  return (
    <div className="card flex flex-row justify-content-start my-5 gap-3">
      <Toast ref={toast} />

      <div className=" flex min-h-fit h-screen w-3  ">
        <form
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
                  onChange={(event) => {
                    if (power_meterValues) {
                      let powermeter: PowerMeterValues[] = power_meterValues.filter(
                        (item: PowerMeterValues) => {
                          return item.ip_address === event.target.value;
                        }
                      );
                      if (Array.isArray(powermeter) && powermeter.length > 0 && powermeter[0].id) {
                        fetchChannels(powermeter[0].id);
                      }
                      field.onChange(event.target.value);
                    }
                  }}
                  options={power_meterValues}
                  optionLabel="asset_name"
                  optionValue="ip_address"
                  placeholder="Select asset"
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
                  onChange={(event) => field.onChange(event.target.value)}
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
                  onChange={(event) => field.onChange(event.target.value)}
                  options={details}
                  placeholder="Select details"
                />
              </>
            )}
          />
          <Controller
            name="multiplier"
            control={control}
            rules={{ required: "Details is required." }}
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
                  style={{ width: '100%' }}
                  placeholder="Multiplier" />
              </>
            )}
          />

          <span className="filter-labels m-auto">
            <Button label="Send" icon="pi pi-check" type="submit" />
          </span>
        </form>
      </div>

      <div className="card w-full">
        <DataTable
          value={measurements}
          ref={dt}
          header={header}
          tableStyle={{ minWidth: "50rem" }}
          loading={isLoading}
          paginator={true}
          rows={100}
        >
          <Column field="from_utc_time" header="From UTC Time"></Column>
          <Column field="to_utc_time" header="To UTC Time"></Column>
          <Column align={"center"} field="channel_name" header="Channel"></Column>
          <Column align={"right"} field="diff" header="Measured value (Wh)"></Column>
          <Column align={"right"} field="multipliedValue" header="Multiplied value"></Column>
        </DataTable>
      </div>
    </div>
  );
};

export default Home;
