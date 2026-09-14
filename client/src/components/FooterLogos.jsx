import React from 'react';

export default function FooterLogos({ className = '', size = 'normal' }) {
    // Size variants for different layout densities
    const sizeClasses = size === 'small'
        ? 'h-7 w-7 sm:h-8 sm:w-8'
        : size === 'large'
        ? 'h-10 w-10 sm:h-12 sm:w-12'
        : 'h-8 w-8 sm:h-9 sm:w-9';

    return (
        <div className={`flex items-center gap-2.5 select-none ${className}`}>
            <img
                src="/griet.webp"
                alt="GRIET Logo"
                title="Gokaraju Rangaraju Institute of Engineering & Technology (GRIET)"
                className={`${sizeClasses} rounded-full object-contain bg-white p-0.5 shadow-sm ring-1 ring-white/20 hover:ring-white/50 hover:scale-105 transition-all duration-200`}
                loading="lazy"
            />
            <img
                src="/aac.webp"
                alt="AAC Logo"
                title="Advanced Academic Center (AAC)"
                className={`${sizeClasses} rounded-full object-contain bg-white p-0.5 shadow-sm ring-1 ring-white/20 hover:ring-white/50 hover:scale-105 transition-all duration-200`}
                loading="lazy"
            />
        </div>
    );
}
