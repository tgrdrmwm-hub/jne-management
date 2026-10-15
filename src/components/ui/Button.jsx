import clsx from 'clsx';
import { forwardRef, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  icon: Icon,
  disabled,
  loading = false,
  onClick,
  debounceTime = 650,
  allowDoubleClick = false,
  ...props 
}, ref) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const lastClickRef = useRef(0);

  const isActuallyLoading = loading || internalLoading;
  const isButtonDisabled = disabled || isActuallyLoading;

  const handleClick = async (e) => {
    if (isButtonDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const now = Date.now();
    // Mencegah double click beruntun yang tidak disengaja
    if (!allowDoubleClick && now - lastClickRef.current < debounceTime) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    lastClickRef.current = now;

    if (onClick) {
      try {
        const result = onClick(e);
        // Otomatis tangani fungsi asynchronous (Promise)
        if (result && typeof result.then === 'function') {
          setInternalLoading(true);
          await result;
        }
      } finally {
        setInternalLoading(false);
      }
    }
  };

  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer";
  
  const variants = {
    primary: "bg-[var(--color-jne-blue)] hover:bg-[var(--color-jne-blue-hover)] text-white shadow-sm focus:ring-[var(--color-jne-blue)]",
    danger: "bg-[var(--color-jne-red)] hover:bg-[var(--color-jne-red-hover)] text-white shadow-sm focus:ring-[var(--color-jne-red)]",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-200 shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
    icon: "p-2.5",
  };

  return (
    <button
      ref={ref}
      disabled={isButtonDisabled}
      onClick={handleClick}
      data-allow-double-click={allowDoubleClick ? 'true' : 'false'}
      className={clsx(
        baseStyles, 
        variants[variant], 
        sizes[size], 
        isActuallyLoading && "pointer-events-none opacity-80",
        className
      )}
      {...props}
    >
      {isActuallyLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin text-current shrink-0" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 18} className="shrink-0" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
