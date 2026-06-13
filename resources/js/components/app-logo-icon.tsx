import type { ImgHTMLAttributes } from 'react';

export const RIKMS_LOGO_SRC = '/assets/rikms-logo.png';

export default function AppLogoIcon({
    alt = 'RIKMS',
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src={RIKMS_LOGO_SRC}
            alt={alt}
            className={['object-contain', props.className]
                .filter(Boolean)
                .join(' ')}
        />
    );
}
