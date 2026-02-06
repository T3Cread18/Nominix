import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

const SelectField = forwardRef(({
    label,
    options = [],
    className,
    icon: Icon,
    placeholder = "-- Seleccionar --",
    ...props
}, ref) => (
    <div className={cn("space-y-1.5", className)}>
        {label && (
            <label className="text-[10px] font-black uppercase text-gray-400 pl-3 tracking-wider flex items-center gap-2">
                {Icon && <Icon size={12} className="text-gray-300" />}
                {label}
                {props.required && <span className="text-red-400">*</span>}
            </label>
        )}
        <div className="relative">
            <select
                ref={ref}
                className={cn(
                    "w-full p-4 pr-10 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark appearance-none cursor-pointer",
                    "focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100/50"
                )}
                {...props}
            >
                <option value="" disabled className="text-gray-300">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown size={16} strokeWidth={3} />
            </div>
        </div>
    </div>
));

SelectField.displayName = "SelectField";

export default SelectField;
