import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const InputField = forwardRef(({
    label,
    className,
    icon: Icon,
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
        <input
            ref={ref}
            className={cn(
                "w-full p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark",
                "focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300",
                "placeholder:text-gray-300 placeholder:font-medium",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100/50"
            )}
            {...props}
        />
    </div>
));

InputField.displayName = "InputField";

export default InputField;
