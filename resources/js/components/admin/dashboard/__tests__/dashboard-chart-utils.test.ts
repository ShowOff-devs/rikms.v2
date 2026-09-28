import { describe, expect, it } from 'vitest';
import {
    chartPosition,
    chartScale,
} from '@/components/admin/dashboard/dashboard-chart-utils';

describe('dashboard chart scaling', () => {
    it('expands the scale to contain values above the former fixed limits', () => {
        const scale = chartScale([12, 480, 73]);

        expect(scale.maximum).toBeGreaterThanOrEqual(480);
        expect(scale.ticks).toHaveLength(5);
        expect(scale.ticks.at(-1)).toBe(0);
        expect(chartPosition(480, scale.maximum, 208)).toBeLessThanOrEqual(208);
    });

    it('keeps zero-value datasets finite and inside the plot', () => {
        const scale = chartScale([0]);

        expect(scale.maximum).toBeGreaterThan(0);
        expect(chartPosition(0, scale.maximum, 208)).toBe(0);
    });
});
