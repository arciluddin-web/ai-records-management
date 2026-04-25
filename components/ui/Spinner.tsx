
import React from 'react';

interface SpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', className }) => {
    const sizeClasses = {
        small: 'h-5 w-5 border-2',
        medium: 'h-8 w-8 border-2',
        large: 'h-16 w-16 border-4'
    };
    
    return (
        <div 
            className={`animate-spin rounded-full border-solid border-blue-500 border-t-transparent ${sizeClasses[size]} ${className}`}
            role="status"
            aria-live="polite"
        >
           <span className="sr-only">Loading...</span>
        </div>
    );
};
