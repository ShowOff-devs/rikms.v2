type CharacterCounterProps = {
    value: string;
    min?: number;
};

export default function CharacterCounter({
    value,
    min = 0,
}: CharacterCounterProps) {
    const count = value.trim().length;
    const isReady = count >= min;

    return (
        <p className="text-xs font-medium text-[#99a1af]">
            {count} characters
            {min > 0 ? (
                <span className={isReady ? 'text-[#00a63e]' : 'text-[#d97706]'}>
                    {' '}
                    / minimum {min}
                </span>
            ) : null}
        </p>
    );
}
