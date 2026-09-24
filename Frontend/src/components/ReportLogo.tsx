import React from 'react';
import crifLogo from '../assets/report/crif-logo.png';

interface ReportLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}

/**
 * ReportLogo - Official CRIF High Mark PROV2 Report Logo Component
 * Preserves exact aspect ratio and visual fidelity matching the official reference PDF.
 */
export const ReportLogo: React.FC<ReportLogoProps> = ({
  className = '',
  width = 110,
  height = 'auto',
  alt = 'CRIF - Together to the next level',
}) => {
  return (
    <img
      src={crifLogo}
      alt={alt}
      width={width}
      height={height}
      className={`report-logo object-contain block ${className}`}
      style={{
        objectFit: 'contain',
        aspectRatio: '182 / 87',
        maxWidth: '100%',
      }}
    />
  );
};

export default ReportLogo;
