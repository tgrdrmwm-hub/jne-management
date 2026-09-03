import clsx from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  className, 
  containerClassName,
  icon: Icon,
  ...props 
}, ref) => {
  return (
    <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-4",
            Icon && "pl-10",
            error 
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
              : "border-slate-300 focus:border-[var(--color-jne-blue)] focus:ring-[var(--color-jne-blue)]/10 hover:border-slate-400",
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = forwardRef(({ 
  label, 
  error, 
  className, 
  containerClassName,
  options = [],
  ...props 
}, ref) => {
  return (
    <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          "w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
          error 
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
            : "border-slate-300 focus:border-[var(--color-jne-blue)] focus:ring-[var(--color-jne-blue)]/10 hover:border-slate-400",
          className
        )}
        {...props}
      >
        <option value="">Pilih...</option>
        {options.map((opt, i) => (
          <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';
