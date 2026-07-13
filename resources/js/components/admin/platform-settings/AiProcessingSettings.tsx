import { Bot } from 'lucide-react';
import type { PlatformSettings } from '@/types/platform-settings';
import { SectionCard, ToggleRow } from './platform-settings-controls';

type AiProcessingSettingsProps = {
    settings: PlatformSettings['ai'];
    onChange: (settings: Partial<PlatformSettings['ai']>) => void;
};

export function AiProcessingSettings({
    settings,
    onChange,
}: AiProcessingSettingsProps) {
    return (
        <SectionCard
            title="AI Processing"
            icon={Bot}
            iconClassName="bg-[#dcfce7] text-[#15803d]"
        >
            <ToggleRow
                title="Enable AI-assisted Processing"
                description="Active and enforced for new dispatches, manual reruns, and queued jobs"
                icon={Bot}
                checked={settings.processingEnabled}
                onChange={(processingEnabled) =>
                    onChange({ processingEnabled })
                }
            />
        </SectionCard>
    );
}
