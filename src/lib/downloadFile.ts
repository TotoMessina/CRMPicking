/** Keep the filename and MIME type on both the file and the download link. */
export function downloadFile(parts: BlobPart[], fileName: string, type: string): void {
    const file = new File(parts, fileName, { type });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);

    try {
        link.click();
    } finally {
        // Allow the browser to finish starting the download before releasing it.
        window.setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(url);
        }, 60_000);
    }
}
