param(
    [Parameter(Mandatory = $true)][string]$DocumentPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ClipboardMetafile
{
    [DllImport("user32.dll")]
    private static extern bool OpenClipboard(IntPtr hWndNewOwner);

    [DllImport("user32.dll")]
    private static extern bool CloseClipboard();

    [DllImport("user32.dll")]
    private static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CopyEnhMetaFile(IntPtr hemfSrc, string lpszFile);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteEnhMetaFile(IntPtr hemf);

    public static void SaveEnhancedMetafile(string path)
    {
        const uint CF_ENHMETAFILE = 14;
        if (!OpenClipboard(IntPtr.Zero))
            throw new InvalidOperationException("Unable to open the clipboard.");

        try
        {
            IntPtr source = GetClipboardData(CF_ENHMETAFILE);
            if (source == IntPtr.Zero)
                throw new InvalidOperationException("Enhanced metafile data is unavailable.");

            IntPtr copy = CopyEnhMetaFile(source, path);
            if (copy == IntPtr.Zero)
                throw new InvalidOperationException("Unable to copy enhanced metafile data.");

            DeleteEnhMetaFile(copy);
        }
        finally
        {
            CloseClipboard();
        }
    }
}
'@

$resolvedDocument = (Resolve-Path -LiteralPath $DocumentPath).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$resolvedOutput = (Resolve-Path -LiteralPath $OutputDirectory).Path
$originalClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()

$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
$document = $word.Documents.Open($resolvedDocument, $false, $true)
$word.ActiveWindow.WindowState = 2

try {
    $document.Repaginate()
    $pageCount = $document.ComputeStatistics(2)

    for ($page = 1; $page -le $pageCount; $page++) {
        $start = $document.GoTo(1, 1, $page).Start
        if ($page -lt $pageCount) {
            $end = $document.GoTo(1, 1, $page + 1).Start - 1
        }
        else {
            $end = $document.Content.End - 1
        }

        $range = $document.Range($start, $end)
        $range.Select()
        $word.Selection.CopyAsPicture()
        Start-Sleep -Milliseconds 350
        $path = Join-Path $resolvedOutput ('page-{0:D2}.png' -f $page)
        $emfPath = Join-Path $resolvedOutput ('page-{0:D2}.emf' -f $page)
        [ClipboardMetafile]::SaveEnhancedMetafile($emfPath)
        $metafile = [System.Drawing.Imaging.Metafile]::FromFile($emfPath)
        $image = New-Object System.Drawing.Bitmap 1275, 1650
        $graphics = [System.Drawing.Graphics]::FromImage($image)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $scale = [Math]::Min(1125 / $metafile.Width, 1500 / $metafile.Height)
            $drawWidth = [int]($metafile.Width * $scale)
            $drawHeight = [int]($metafile.Height * $scale)
            $drawX = [int]((1275 - $drawWidth) / 2)
            $drawY = [int]((1650 - $drawHeight) / 2)
            $graphics.DrawImage($metafile, $drawX, $drawY, $drawWidth, $drawHeight)
            $image.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $graphics.Dispose()
            $image.Dispose()
            $metafile.Dispose()
            Remove-Item -LiteralPath $emfPath -Force
        }

        Write-Output $path
    }
}
finally {
    $document.Close($false)
    $word.Quit()
    if ($null -ne $originalClipboard) {
        [System.Windows.Forms.Clipboard]::SetDataObject($originalClipboard, $true)
    }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
