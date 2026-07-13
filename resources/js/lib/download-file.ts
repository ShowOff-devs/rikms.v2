export type DownloadedFile = {
    fileName: string;
};

export async function downloadResponseFile(
    response: Response,
    fallbackFileName: string,
): Promise<DownloadedFile> {
    const blob = await response.blob();
    const fileName = downloadFileName(response) ?? fallbackFileName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return { fileName };
}

export function downloadFileName(response: Response) {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(
        disposition,
    );
    const encodedName = match?.[1];
    const plainName = match?.[2];

    if (encodedName) {
        return decodeURIComponent(encodedName);
    }

    return plainName;
}
