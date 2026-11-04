
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-6 py-2.5 font-semibold rounded-lg shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 focus:ring-green-500',
    secondary: 'text-green-700 bg-white border border-green-600 hover:bg-green-50 focus:ring-green-500',
  };

  const disabledClasses = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:border-transparent';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
