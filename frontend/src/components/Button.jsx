import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
    children,
    variant = 'primary',
    isLoading = false,
    className = '',
    ...props
}) => {
    const baseStyles = "w-full flex justify-center py-3 px-4 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "border-transparent text-black bg-primary hover:bg-opacity-90 focus:ring-primary",
        secondary: "border-transparent text-primary bg-primary/10 hover:bg-primary/20 focus:ring-primary",
        outline: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary",
        danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};

export default Button;
