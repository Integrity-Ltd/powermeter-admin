export function convertToCSV(data: any) {
    const rows = [];
    const headers = Object.keys(data[0]);

    // Add header row
    rows.push(headers.join(','));

    // Add data rows
    data.forEach((item: any) => {
        const values = headers.map(header => item[header]);
        rows.push(values.join(','));
    });

    return rows.join('\n');
}

export function downloadCSVFile(data: any, filename: string) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
