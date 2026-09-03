import clsx from 'clsx';
import { Search } from 'lucide-react';
import { Input } from './Input';

export const Table = ({ children, className }) => (
  <div className="w-full overflow-x-auto">
    <table className={clsx("w-full text-left border-collapse", className)}>
      {children}
    </table>
  </div>
);

export const Thead = ({ children, className }) => (
  <thead className={clsx("bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10", className)}>
    {children}
  </thead>
);

export const Tbody = ({ children, className }) => (
  <tbody className={clsx("bg-white divide-y divide-gray-50", className)}>
    {children}
  </tbody>
);

export const Tr = ({ children, className }) => (
  <tr className={clsx("hover:bg-slate-50/50 transition-colors duration-150", className)}>
    {children}
  </tr>
);

export const Th = ({ children, className }) => (
  <th className={clsx("px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider", className)}>
    {children}
  </th>
);

export const Td = ({ children, className, ...props }) => (
  <td className={clsx("px-5 py-3 text-sm text-slate-600", className)} {...props}>
    {children}
  </td>
);

export const TableHeader = ({ title, onSearch, rightContent }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    {title && <h3 className="text-base font-bold text-gray-800">{title}</h3>}
    <div className="flex items-center gap-3 w-full sm:w-auto">
      {onSearch && (
        <div className="relative w-full sm:w-64">
          <Input 
            icon={Search} 
            placeholder="Cari..." 
            onChange={(e) => onSearch(e.target.value)} 
          />
        </div>
      )}
      {rightContent}
    </div>
  </div>
);
