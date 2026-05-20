import { Download, FileText, UploadCloud } from 'lucide-react';
import type { RefObject } from 'react';
import { SectionCard } from '@/components/repository/edit/SectionCard';
import type { RepositoryFileInfo } from '@/types/repository';

export function FileInformationSection({
    file,
    fileInputRef,
    onReplaceFile,
    onDownload,
}: {
    file: RepositoryFileInfo;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onReplaceFile: (file: File) => void;
    onDownload: () => void;
}) {
    return (
        <SectionCard
            eyebrow="File Information"
            title="Document File"
            description="Review current file metadata or replace the repository document."
        >
            <div className="rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                        <FileText className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#101828]">
                            {file.name}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                            {file.type} - {file.size} - {file.pages} pages
                        </p>
                        <p className="mt-1 text-xs leading-4 text-[#99a1af]">
                            Uploaded{' '}
                            {new Date(file.uploadedAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={(event) => {
                                const replacement = event.target.files?.[0];

                                if (replacement) {
                                    onReplaceFile(replacement);
                                    event.target.value = '';
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 text-xs font-semibold text-[#1e3a8a]"
                        >
                            <UploadCloud className="size-4" />
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={onDownload}
                            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs font-semibold text-[#4a5565]"
                        >
                            <Download className="size-4" />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
