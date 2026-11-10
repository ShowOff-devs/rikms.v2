import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
    new URL('./toast-provider.tsx', import.meta.url),
    'utf8',
);

describe('toast viewport accessibility and responsive behavior', () => {
    it('stays fixed in the top-right while the page scrolls', () => {
        expect(source).toContain('fixed top-3 right-3');
        expect(source).toContain('z-[100]');
    });

    it('fits mobile viewports and supports accessible dismissal', () => {
        expect(source).toContain('w-[calc(100vw-1.5rem)] max-w-sm');
        expect(source).toContain(
            'aria-label={`Dismiss ${record.title} notification`}',
        );
        expect(source).toContain(
            "record.type === 'error' ? 'alert' : 'status'",
        );
        expect(source).toContain('motion-reduce:animate-none');
    });
});
