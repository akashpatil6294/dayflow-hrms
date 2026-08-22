import React from 'react';
import logoSrc from '../../assets/logo.png';

/**
 * Dayflow brand mark — sunrise + wave, the "workday" cycle from clock-in
 * to clock-out. Full-color raster mark, so it's rendered on its own
 * (no tinted background box) wherever it appears.
 */
export const Logo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ className, ...props }) => (
  <img src={logoSrc} alt="Dayflow" className={className} {...props} />
);

export default Logo;
