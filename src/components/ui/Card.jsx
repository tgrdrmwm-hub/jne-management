import clsx from 'clsx';

export const Card = ({ children, className, ...props }) => {
  return (
    <div 
      className={clsx(
        "bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-slate-200/60 p-5 transition-shadow duration-300", 
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }) => (
  <div className={clsx("flex justify-between items-center mb-4", className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className }) => (
  <h3 className={clsx("text-base font-bold text-gray-800", className)}>
    {children}
  </h3>
);
