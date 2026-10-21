import React from "react";

interface UsdssIconProps {
  className?: string;
  size?: number;
}

export const UsdssIcon: React.FC<UsdssIconProps> = ({ className = "w-5 h-5", size = 20 }) => {
  return (
    <img
      src="/usdss.png"
      alt="USDSS"
      width={size}
      height={size}
      className={`inline-block rounded-full object-contain shrink-0 select-none ${className}`}
    />
  );
};
