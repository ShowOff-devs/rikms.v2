import { Download, FilePlus2, FileText, LoaderCircle } from 'lucide-react';
import type { RefObject } from 'react';
import { SectionCard } from '@/components/repository/edit/SectionCard';
import type { RepositoryFileInfo } from '@/types/repository';

export function FileInformationSection({
    files,
    fileInputRef,
    onAddFiles,
    onDownload,
    disabled = false,
    isUploading = false,
}: {
    files: RepositoryFileInfo[];
    fileInputRef: RefObject<HTMLInputElement | null>;
    onAddFiles: (files: File[]) => void;
    onDownload: (file: RepositoryFileInfo) => void;
    disabled?: boolean;
    isUploading?: boolean;
}) {
    return (
        <SectionCard
            eyebrow="File Information"
            title="Document Files"
            description="Review the files attached to this record or add more PDF documents."
        >
            <div className="mb-4 flex flex-col gap-3 rounded-[14px] border border-dashed border-[#bfdbfe] bg-[#f8fbff] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-[#101828]">
                        Add additional documents
                    </p>
                    <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                        Select one or more PDF files. Existing documents will be
                        kept.
                    </p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                        const selectedFiles = Array.from(
                            event.target.files ?? [],
                        );

                        if (selectedFiles.length > 0) {
                            onAddFiles(selectedFiles);
                            event.target.value = '';
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 text-xs font-semibold text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUploading ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <FilePlus2 className="size-4" />
                    )}
                    {isUploading ? 'Uploading...' : 'Add documents'}
                </button>
            </div>

            <div className="space-y-3">
                {files.length === 0 ? (
                    <div className="rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] p-5 text-center text-sm text-[#6a7282]">
                        No document files have been uploaded yet.
                    </div>
                ) : null}

                {files.map((file, index) => (
                    <div
                        key={file.id ?? `${file.name}-${file.uploadedAt}`}
                        className="rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] p-4"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                                <FileText className="size-6" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <p className="truncate text-sm font-bold text-[#101828]">
                                        {file.name}
                                    </p>
                                    {index === 0 ? (
                                        <span className="shrink-0 rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a] uppercase">
                                            Primary
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                                    {file.type} - {file.size}
                                    {file.pages > 0
                                        ? ` - ${file.pages} pages`
                                        : ''}
                                </p>
                                <p className="mt-1 text-xs leading-4 text-[#99a1af]">
                                    Uploaded{' '}
                                    {new Date(file.uploadedAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onDownload(file)}
                                    disabled={!file.canDownload}
                                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-semibold text-[#4a5565] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download className="size-4" />
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}
