export function chartScale(values: number[], intervals = 4) {
    const maximum = Math.max(...values, 0);

    if (maximum === 0) {
        return {
            maximum: intervals,
            ticks: Array.from(
                { length: intervals + 1 },
                (_, index) => intervals - index,
            ),
        };
    }

    const roughStep = maximum / intervals;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalizedStep = roughStep / magnitude;
    const niceStep =
        normalizedStep <= 1
            ? 1
            : normalizedStep <= 2
              ? 2
              : normalizedStep <= 5
                ? 5
                : 10;
    const step = niceStep * magnitude;
    const scaleMaximum = step * intervals;

    return {
        maximum: scaleMaximum,
        ticks: Array.from(
            { length: intervals + 1 },
            (_, index) => scaleMaximum - index * step,
        ),
    };
}

export function chartPosition(value: number, maximum: number, size: number) {
    if (maximum <= 0) {
        return 0;
    }

    return (Math.max(0, value) / maximum) * size;
}
