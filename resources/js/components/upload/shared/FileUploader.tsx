import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FileUploaderProps = {
    fileName?: string;
    helperText: string;
    accept: string;
    error?: string;
    onFileSelect: (file: File) => void;
};

export default function FileUploader({
    fileName,
    helperText,
    accept,
    error,
    onFileSelect,
}: FileUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (files: FileList | null) => {
        const file = files?.item(0);

        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <div
            className={cn(
                'flex min-h-[250px] flex-col items-center justify-center rounded-[14px] border border-dashed bg-white px-6 py-8 text-center',
                error ? 'border-[#fb2c36] bg-[#fff7f7]' : 'border-[#d1d5dc]',
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
                event.preventDefault();
                handleFiles(event.dataTransfer.files);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept}
                onChange={(event) => handleFiles(event.target.files)}
            />
            <div className="flex size-14 items-center justify-center rounded-[14px] bg-[#e5e7eb] text-[#1e3a8a]">
                <Upload className="size-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#344054]">
                {fileName ?? 'Drag & drop your document here'}
            </p>
            <p className="mt-1 text-xs text-[#99a1af]">or</p>
            <Button
                type="button"
                className="mt-4 h-10 rounded-[14px] bg-[#1e3a8a] px-5 text-white hover:bg-[#172f70]"
                onClick={() => inputRef.current?.click()}
            >
                <Upload className="size-4" />
                Browse File
            </Button>
            <p className="mt-5 text-xs text-[#99a1af]">{helperText}</p>
            {error ? (
                <p className="mt-3 text-xs font-medium text-[#fb2c36]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
