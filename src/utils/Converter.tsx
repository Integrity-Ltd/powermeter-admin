// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertToCSV(data: any) {
    const rows = [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const headers = Object.keys(data[0]);

    // Add header row
    rows.push(headers.join(","));

    // Add data rows
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    data.forEach((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const values = headers.map((header) => item[header]);
        rows.push(values.join(","));
    });

    return rows.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadCsvFile(data: any, filename: string) {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
