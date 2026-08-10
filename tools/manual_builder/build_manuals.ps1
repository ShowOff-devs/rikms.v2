param(
    [string]$ContentPath = (Join-Path $PSScriptRoot 'manual_content.json'),
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'docs\user-manuals')
)

$ErrorActionPreference = 'Stop'

function Convert-HexToWordColor {
    param([Parameter(Mandatory = $true)][string]$Hex)

    $clean = $Hex.TrimStart('#')
    $red = [Convert]::ToInt32($clean.Substring(0, 2), 16)
    $green = [Convert]::ToInt32($clean.Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($clean.Substring(4, 2), 16)

    return $red + (256 * $green) + (65536 * $blue)
}

function Set-StyleFont {
    param(
        $Style,
        [string]$Name,
        [double]$Size,
        [int]$Color,
        [bool]$Bold = $false
    )

    $Style.Font.Name = $Name
    $Style.Font.NameAscii = $Name
    $Style.Font.Size = $Size
    $Style.Font.Color = $Color
    $Style.Font.Bold = if ($Bold) { -1 } else { 0 }
}

function Configure-DocumentStyles {
    param($Document, [int]$AccentColor)

    $ink = Convert-HexToWordColor '172033'
    $darkAccent = Convert-HexToWordColor '1F4D78'

    $normal = $Document.Styles.Item('Normal')
    Set-StyleFont -Style $normal -Name 'Calibri' -Size 11 -Color $ink
    $normal.ParagraphFormat.Alignment = 0
    $normal.ParagraphFormat.SpaceBefore = 0
    $normal.ParagraphFormat.SpaceAfter = 6
    $normal.ParagraphFormat.LineSpacingRule = 5
    $normal.ParagraphFormat.LineSpacing = 15

    $h1 = $Document.Styles.Item('Heading 1')
    Set-StyleFont -Style $h1 -Name 'Calibri' -Size 16 -Color $AccentColor -Bold $true
    $h1.ParagraphFormat.SpaceBefore = 18
    $h1.ParagraphFormat.SpaceAfter = 10
    $h1.ParagraphFormat.LineSpacingRule = 0
    $h1.ParagraphFormat.KeepWithNext = -1
    $h1.ParagraphFormat.KeepTogether = -1
    $h1.ParagraphFormat.OutlineLevel = 1

    $h2 = $Document.Styles.Item('Heading 2')
    Set-StyleFont -Style $h2 -Name 'Calibri' -Size 13 -Color $AccentColor -Bold $true
    $h2.ParagraphFormat.SpaceBefore = 14
    $h2.ParagraphFormat.SpaceAfter = 7
    $h2.ParagraphFormat.LineSpacingRule = 0
    $h2.ParagraphFormat.KeepWithNext = -1
    $h2.ParagraphFormat.KeepTogether = -1
    $h2.ParagraphFormat.OutlineLevel = 2

    $h3 = $Document.Styles.Item('Heading 3')
    Set-StyleFont -Style $h3 -Name 'Calibri' -Size 12 -Color $darkAccent -Bold $true
    $h3.ParagraphFormat.SpaceBefore = 10
    $h3.ParagraphFormat.SpaceAfter = 5
    $h3.ParagraphFormat.LineSpacingRule = 0
    $h3.ParagraphFormat.KeepWithNext = -1
    $h3.ParagraphFormat.OutlineLevel = 3
}

function Set-SelectionStyle {
    param($Selection, [string]$StyleName)

    $Selection.Style = $StyleName
    $Selection.Font.Reset()
    $Selection.ParagraphFormat.Reset()
    $Selection.Style = $StyleName
}

function Add-Paragraph {
    param(
        $Selection,
        [string]$Text,
        [string]$StyleName = 'Normal',
        [int]$Alignment = 0,
        [bool]$Italic = $false,
        [bool]$Bold = $false,
        [int]$Color = -1,
        [double]$Size = 0,
        [double]$SpaceAfter = -1
    )

    Set-SelectionStyle -Selection $Selection -StyleName $StyleName
    $Selection.ParagraphFormat.Alignment = $Alignment
    $Selection.Font.Italic = if ($Italic) { -1 } else { 0 }
    $Selection.Font.Bold = if ($Bold) { -1 } else { 0 }
    if ($Color -ge 0) { $Selection.Font.Color = $Color }
    if ($Size -gt 0) { $Selection.Font.Size = $Size }
    if ($SpaceAfter -ge 0) { $Selection.ParagraphFormat.SpaceAfter = $SpaceAfter }
    $Selection.TypeText($Text)
    $Selection.TypeParagraph()
}

function Add-List {
    param($Selection, $Items, [ValidateSet('bullet', 'number')][string]$Kind)

    foreach ($item in $Items) {
        $start = $Selection.Start
        Set-SelectionStyle -Selection $Selection -StyleName 'Normal'
        $Selection.ParagraphFormat.LeftIndent = 27
        $Selection.ParagraphFormat.FirstLineIndent = -13.5
        $Selection.ParagraphFormat.SpaceAfter = 4
        $Selection.ParagraphFormat.LineSpacingRule = 5
        $Selection.ParagraphFormat.LineSpacing = 15
        $Selection.TypeText([string]$item)
        $Selection.TypeParagraph()
        $paragraphRange = $Selection.Document.Range($start, $Selection.Start - 1)
        if ($Kind -eq 'bullet') {
            $paragraphRange.ListFormat.ApplyBulletDefault()
        }
        else {
            $paragraphRange.ListFormat.ApplyNumberDefault()
        }
    }

    $Selection.Range.ListFormat.RemoveNumbers()
    Set-SelectionStyle -Selection $Selection -StyleName 'Normal'
}

function Add-Note {
    param($Selection, [string]$Label, [string]$Text, [string]$Tone, [int]$AccentColor)

    $palette = switch ($Tone) {
        'danger' { @{ Fill = 'FDECEC'; Border = 'B42318'; Ink = '7A271A' } }
        'warn'   { @{ Fill = 'FFF7E6'; Border = 'D97706'; Ink = '7C4A03' } }
        default  { @{ Fill = 'EEF4FF'; Border = '3B82F6'; Ink = '173B6C' } }
    }

    $table = $Selection.Document.Tables.Add($Selection.Range, 1, 1)
    $table.Style = 'Table Grid'
    $table.AllowAutoFit = $false
    $table.AutoFitBehavior(0)
    $table.PreferredWidthType = 3
    $table.PreferredWidth = 468
    $table.Rows.LeftIndent = 6
    $table.TopPadding = 5
    $table.BottomPadding = 5
    $table.LeftPadding = 8
    $table.RightPadding = 8

    $cell = $table.Cell(1, 1)
    $cell.Range.Text = "${Label}: ${Text}"
    $cell.Shading.BackgroundPatternColor = Convert-HexToWordColor $palette.Fill
    $cell.Range.Font.Name = 'Calibri'
    $cell.Range.Font.Size = 10.5
    $cell.Range.Font.Bold = 0
    $cell.Range.Font.Italic = 0
    $cell.Range.Font.Color = Convert-HexToWordColor $palette.Ink
    $cell.Range.ParagraphFormat.SpaceBefore = 0
    $cell.Range.ParagraphFormat.SpaceAfter = 0
    $cell.Range.ParagraphFormat.LineSpacingRule = 5
    $cell.Range.ParagraphFormat.LineSpacing = 14
    $cell.VerticalAlignment = 1

    foreach ($borderIndex in @(-1, -2, -3, -4)) {
        $border = $table.Borders.Item($borderIndex)
        $border.LineStyle = 1
        $border.LineWidth = 4
        $border.Color = Convert-HexToWordColor $palette.Border
    }

    $labelRange = $cell.Range.Duplicate
    $labelRange.SetRange($cell.Range.Start, $cell.Range.Start + $Label.Length + 1)
    $labelRange.Font.Bold = -1

    $Selection.SetRange($table.Range.End, $table.Range.End)
    $Selection.TypeParagraph()
    $Selection.ParagraphFormat.SpaceAfter = 4
}

function Add-DataTable {
    param($Selection, $Block, [int]$AccentColor)

    $headers = @($Block.headers)
    $rows = @($Block.rows)
    $table = $Selection.Document.Tables.Add($Selection.Range, $rows.Count + 1, $headers.Count)
    $table.Style = 'Table Grid'
    $table.AllowAutoFit = $false
    $table.AutoFitBehavior(0)
    $table.PreferredWidthType = 3
    $table.PreferredWidth = 468
    $table.Rows.LeftIndent = 6
    $table.TopPadding = 4
    $table.BottomPadding = 4
    $table.LeftPadding = 6
    $table.RightPadding = 6
    $table.Rows.AllowBreakAcrossPages = -1
    $table.Rows.Item(1).HeadingFormat = -1

    if ($Block.PSObject.Properties.Name -contains 'widths') {
        $widths = @($Block.widths)
        for ($columnIndex = 1; $columnIndex -le $widths.Count; $columnIndex++) {
            $table.Columns.Item($columnIndex).Width = [double]$widths[$columnIndex - 1] * 72
        }
    }

    for ($columnIndex = 1; $columnIndex -le $headers.Count; $columnIndex++) {
        $cell = $table.Cell(1, $columnIndex)
        $cell.Range.Text = [string]$headers[$columnIndex - 1]
        $cell.Shading.BackgroundPatternColor = $AccentColor
        $cell.Range.Font.Name = 'Calibri'
        $cell.Range.Font.Size = 9.5
        $cell.Range.Font.Bold = -1
        $cell.Range.Font.Italic = 0
        $cell.Range.Font.Color = Convert-HexToWordColor 'FFFFFF'
        $cell.Range.ParagraphFormat.SpaceAfter = 0
        $cell.Range.ParagraphFormat.Alignment = 0
        $cell.VerticalAlignment = 1
    }

    for ($rowIndex = 1; $rowIndex -le $rows.Count; $rowIndex++) {
        $row = @($rows[$rowIndex - 1])
        for ($columnIndex = 1; $columnIndex -le $headers.Count; $columnIndex++) {
            $cell = $table.Cell($rowIndex + 1, $columnIndex)
            $cell.Range.Text = [string]$row[$columnIndex - 1]
            $cell.Range.Font.Name = 'Calibri'
            $cell.Range.Font.Size = 9.5
            $cell.Range.Font.Bold = 0
            $cell.Range.Font.Italic = 0
            $cell.Range.Font.Color = Convert-HexToWordColor '25324A'
            $cell.Range.ParagraphFormat.SpaceAfter = 0
            $cell.Range.ParagraphFormat.LineSpacingRule = 5
            $cell.Range.ParagraphFormat.LineSpacing = 13
            $cell.Range.ParagraphFormat.Alignment = 0
            $cell.VerticalAlignment = 1
            if (($rowIndex % 2) -eq 0) {
                $cell.Shading.BackgroundPatternColor = Convert-HexToWordColor 'F7F9FC'
            }
        }
    }

    $Selection.SetRange($table.Range.End, $table.Range.End)
    $Selection.TypeParagraph()
    $Selection.ParagraphFormat.SpaceAfter = 4
}

function Add-Cover {
    param($Selection, $Manual, [string]$LogoPath, [int]$AccentColor)

    for ($i = 0; $i -lt 3; $i++) {
        Add-Paragraph -Selection $Selection -Text '' -SpaceAfter 8
    }

    $Selection.ParagraphFormat.Alignment = 1
    $shape = $Selection.InlineShapes.AddPicture($LogoPath, $false, $true, $Selection.Range)
    $shape.LockAspectRatio = -1
    $shape.Width = 94
    $shape.AlternativeText = 'RIKMS logo'
    $Selection.SetRange($shape.Range.End, $shape.Range.End)
    $Selection.TypeParagraph()

    Add-Paragraph -Selection $Selection -Text 'REGIONWIDE INTEGRATED KNOWLEDGE MANAGEMENT SYSTEM' -Alignment 1 -Bold $true -Color $AccentColor -Size 10.5 -SpaceAfter 18
    Add-Paragraph -Selection $Selection -Text $Manual.title -Alignment 1 -Bold $true -Color $AccentColor -Size 30 -SpaceAfter 8
    Add-Paragraph -Selection $Selection -Text $Manual.role -Alignment 1 -Bold $true -Color (Convert-HexToWordColor 'D97706') -Size 18 -SpaceAfter 16
    Add-Paragraph -Selection $Selection -Text $Manual.subtitle -Alignment 1 -Color (Convert-HexToWordColor '4B5563') -Size 12.5 -SpaceAfter 36
    Add-Paragraph -Selection $Selection -Text $Manual.version -Alignment 1 -Bold $true -Color (Convert-HexToWordColor '374151') -Size 10.5 -SpaceAfter 8
    Add-Paragraph -Selection $Selection -Text 'Prepared from the implemented RIKMS v2 workflows and controls.' -Alignment 1 -Italic $true -Color (Convert-HexToWordColor '6B7280') -Size 9.5 -SpaceAfter 28

    $start = $Selection.Start
    Add-Paragraph -Selection $Selection -Text 'Use only with an authorized RIKMS account. Protect credentials, restricted records, exports, and recovery codes according to organizational policy.' -Alignment 1 -Color (Convert-HexToWordColor '475569') -Size 9.5 -SpaceAfter 0
    $noticeRange = $Selection.Document.Range($start, $Selection.Start - 1)
    $noticeRange.Shading.BackgroundPatternColor = Convert-HexToWordColor 'F3F6FA'
    $noticeRange.ParagraphFormat.LeftIndent = 45
    $noticeRange.ParagraphFormat.RightIndent = 45
    $noticeRange.ParagraphFormat.SpaceBefore = 8
    $noticeRange.ParagraphFormat.SpaceAfter = 8
}

function Configure-HeadersAndFooters {
    param($Document, $Manual, [int]$AccentColor)

    $section = $Document.Sections.Item(1)
    $section.PageSetup.DifferentFirstPageHeaderFooter = -1

    $header = $section.Headers.Item(1)
    $header.Range.Text = "$($Manual.title) | $($Manual.role)"
    $header.Range.Font.Name = 'Calibri'
    $header.Range.Font.Size = 8.5
    $header.Range.Font.Color = Convert-HexToWordColor '6B7280'
    $header.Range.ParagraphFormat.Alignment = 2

    $firstHeader = $section.Headers.Item(2)
    $firstHeader.Range.Text = ''

    $footer = $section.Footers.Item(1)
    $footer.Range.Text = 'RIKMS | '
    $footer.Range.Font.Name = 'Calibri'
    $footer.Range.Font.Size = 8.5
    $footer.Range.Font.Color = Convert-HexToWordColor '6B7280'
    $footer.Range.ParagraphFormat.Alignment = 1
    $fieldRange = $footer.Range.Duplicate
    $fieldRange.SetRange($footer.Range.End - 1, $footer.Range.End - 1)
    $footer.Range.Fields.Add($fieldRange, 33) | Out-Null

    $firstFooter = $section.Footers.Item(2)
    $firstFooter.Range.Text = ''
}

function Add-ManualSection {
    param($Selection, $Section, [int]$AccentColor, [bool]$AddPageBreak)

    if ($AddPageBreak) {
        $Selection.InsertBreak(7)
    }

    Add-Paragraph -Selection $Selection -Text $Section.title -StyleName 'Heading 1'
    Add-Paragraph -Selection $Selection -Text $Section.lead -Italic $true -Color (Convert-HexToWordColor '4B5563') -Size 11 -SpaceAfter 10

    foreach ($block in @($Section.blocks)) {
        switch ($block.type) {
            'subheading' { Add-Paragraph -Selection $Selection -Text $block.text -StyleName 'Heading 2' }
            'p'          { Add-Paragraph -Selection $Selection -Text $block.text }
            'bullets'    { Add-List -Selection $Selection -Items @($block.items) -Kind 'bullet' }
            'steps'      { Add-List -Selection $Selection -Items @($block.items) -Kind 'number' }
            'table'      { Add-DataTable -Selection $Selection -Block $block -AccentColor $AccentColor }
            'note'       { Add-Note -Selection $Selection -Label $block.label -Text $block.text -Tone $block.tone -AccentColor $AccentColor }
            default      { throw "Unknown block type: $($block.type)" }
        }
    }
}

function Build-Manual {
    param($Word, $Manual, [string]$OutputPath, [string]$PdfPath, [string]$LogoPath)

    Write-Output "Starting: $($Manual.title)"
    $accentColor = Convert-HexToWordColor $Manual.accent
    $document = $Word.Documents.Add()

    try {
        $document.PageSetup.PaperSize = 2
        $document.PageSetup.Orientation = 0
        $document.PageSetup.PageWidth = 612
        $document.PageSetup.PageHeight = 792
        $document.PageSetup.TopMargin = 72
        $document.PageSetup.BottomMargin = 72
        $document.PageSetup.LeftMargin = 72
        $document.PageSetup.RightMargin = 72
        $document.PageSetup.HeaderDistance = 35.4
        $document.PageSetup.FooterDistance = 35.4

        Configure-DocumentStyles -Document $document -AccentColor $accentColor
        $selection = $Word.Selection
        Add-Cover -Selection $selection -Manual $Manual -LogoPath $LogoPath -AccentColor $accentColor
        Write-Output "Cover complete: $($Manual.title)"
        $selection.InsertBreak(7)

        Add-Paragraph -Selection $selection -Text 'Contents' -StyleName 'Normal' -Bold $true -Color $accentColor -Size 20 -SpaceAfter 6
        Add-Paragraph -Selection $selection -Text 'Select a heading in Word to jump to that section. Update the table if pagination changes after editing.' -Italic $true -Color (Convert-HexToWordColor '6B7280') -Size 9.5 -SpaceAfter 10
        $toc = $document.TablesOfContents.Add($selection.Range, $true, 1, 2)
        $selection.SetRange($toc.Range.End, $toc.Range.End)
        $selection.InsertBreak(7)

        $index = 0
        foreach ($manualSection in @($Manual.sections)) {
            Add-ManualSection -Selection $selection -Section $manualSection -AccentColor $accentColor -AddPageBreak ($index -gt 0)
            Write-Output "Section complete: $($manualSection.title)"
            $index++
        }

        Write-Output "Updating fields: $($Manual.title)"
        Configure-HeadersAndFooters -Document $document -Manual $Manual -AccentColor $accentColor
        $document.Repaginate()
        $toc.Update()
        $document.Fields.Update() | Out-Null
        $document.Repaginate()
        $toc.Update()

        Write-Output "Saving DOCX: $OutputPath"
        $document.SaveAs2($OutputPath, 16)
        Write-Output "Exporting PDF: $PdfPath"
        $document.ExportAsFixedFormat($PdfPath, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
        $pages = $document.ComputeStatistics(2)

        return [pscustomobject]@{
            Docx = $OutputPath
            Pdf = $PdfPath
            Pages = $pages
        }
    }
    finally {
        $document.Close($false)
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
    }
}

if (-not (Test-Path -LiteralPath $ContentPath)) {
    throw "Manual content was not found: $ContentPath"
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$content = Get-Content -Raw -LiteralPath $ContentPath | ConvertFrom-Json
$logoPath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'public\assets\rikms-logo.png'

if (-not (Test-Path -LiteralPath $logoPath)) {
    throw "RIKMS logo was not found: $logoPath"
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $agencyResult = Build-Manual -Word $word -Manual $content.agency `
        -OutputPath (Join-Path $OutputDirectory 'RIKMS_Agency_User_Manual.docx') `
        -PdfPath (Join-Path $OutputDirectory 'RIKMS_Agency_User_Manual.pdf') `
        -LogoPath $logoPath

    $superAdminResult = Build-Manual -Word $word -Manual $content.superadmin `
        -OutputPath (Join-Path $OutputDirectory 'RIKMS_Super_Admin_User_Manual.docx') `
        -PdfPath (Join-Path $OutputDirectory 'RIKMS_Super_Admin_User_Manual.pdf') `
        -LogoPath $logoPath

    @($agencyResult, $superAdminResult) | ConvertTo-Json -Depth 3
}
finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
