import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, DataTableValueArray } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import { useRef, useState } from "react";
import { Fieldset } from 'primereact/fieldset';
import { Controller, FieldErrors, useForm } from "react-hook-form";
import * as z from "zod";

const Home = () => {
  /**
 * The tabla of measurements
 */
  const [measurements, setMeasurements] = useState([]);

  /**
 * Zod validator of form input values
 */
  const schema = z.object({
    assetNameId: z.number().nullable(),
    details: z.string().nonempty(),
  });

  const [isLoading, setIsLoading] = useState(false);

  const [allAvgConsumption, setAllAvgConsumption] = useState(0);

  const [allSumConsumption, setAllSumConsumption] = useState(0);

  const [assetName, setAssetName] = useState("");

  /**
   * Toaster reference
   */
  const toast = useRef<Toast>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StatisticsFormValues>({ resolver: zodResolver(schema) });

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

  const fetchAssetNameValues = async () => {
    let response = await fetch("/api/admin/crud/assets/asset_names");
    let data: [] = [];
    if (response.ok) {
      data = await response.json();
    }
    return data;
  };

  const { data: assetNameValues } = useQuery({
    queryKey: ["assetNameValues"],
    queryFn: fetchAssetNameValues,
  });


  const header = (
    <>
      <div className="grid cols-2 justify-content-end w-ull">
        <div className="flex justify-content-end w-6 ">
          <h2>Statistics</h2>
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
  const onSubmit = async (data: StatisticsFormValues) => {
    setIsLoading(true);
    const query = "/api/measurements/statistics?asset_name_id=" + data.assetNameId + "&details=" + data.details;
    const response = await fetch(query);
    if (response.ok) {
      const result = await response.json();
      let sum = 0;
      let avg = 0;
      result.forEach((element: any) => {
        sum += element.sum;
        avg += element.avg;
      });
      setAllAvgConsumption(avg);
      setAllSumConsumption(sum);
      if (result.length > 0) {
        setAssetName(result[0].asset_name);
      }
      setMeasurements(result);
    }
    setIsLoading(false);
  }

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
            name="assetNameId"
            control={control}
            rules={{ required: "Time zone is required." }}
            render={({ field, fieldState }) => (
              <>
                <Dropdown
                  id={field.name}
                  value={field.value}
                  tooltip={errors.assetNameId?.message}
                  className={classNames({
                    "p-invalid": fieldState.invalid,
                  })}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                  }
                  }
                  options={assetNameValues}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select asset"
                />
              </>
            )}
          />
          <Controller
            name="details"
            control={control}
            rules={{ required: "Time zone is required." }}
            render={({ field, fieldState }) => (
              <>
                <Dropdown
                  id={field.name}
                  value={field.value}
                  tooltip={errors.assetNameId?.message}
                  className={classNames({
                    "p-invalid": fieldState.invalid,
                  })}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                  }
                  }
                  options={[
                    { id: "1h", name: "1 hour" },
                    { id: "1d", name: "1 day" },
                    { id: "30d", name: "30 day" },
                  ]}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select interval"
                />
              </>
            )}
          />
          <span className="filter-labels m-auto">
            <Button label="Send" icon="pi pi-check" type="submit" />
          </span>
        </form>
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
          rows={100}
        >
          <Column align={"center"} field="asset_name" header="Asset name"></Column>
          <Column align={"center"} field="power_meter_name" header="Powermeter name"></Column>
          <Column align={"center"} field="channel_name" header="Channel name"></Column>
          <Column align={"center"} field="avg" header="Average consumption (W)"></Column>
          <Column align={"center"} field="sum" header="Consumption (Wh)"></Column>
        </DataTable>
        {assetName ?
          <Fieldset legend="Combined">
            <label>{assetName} - all channels - Average consumption (W): {allAvgConsumption}</label>
            <br />
            <label>{assetName} - all channels - Consumption (Wh): {allSumConsumption}</label>
          </Fieldset>
          : <></>}
      </div>
    </div>
  )
};

export default Home;
