import { Toast } from "primereact/toast";
import { RefObject } from "react";

/**
* Show message
* @param severity severity of message
* @param message message to display
*/
export const show = (
	toast: RefObject<Toast>,
	severity: "success" | "info" | "warn" | "error" | undefined,
	message: string,
) => {
	if (toast.current !== null) {
		toast.current.show({
			severity,
			summary: "Form submit",
			detail: message,
		});
	}
};
