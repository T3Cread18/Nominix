import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const ToggleField = forwardRef(({
    label,
    className,
    ...props
}, ref) => (
    <label
        className={cn(
            "flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-gray-100/50 transition-all duration-300",
            "hover:bg-white hover:border-nominix-electric/20 hover:shadow-sm cursor-pointer group",
            props.disabled && "opacity-60 cursor-not-allowed",
            className
        )}
    >
        <div className="relative inline-flex items-center cursor-pointer pointer-events-none">
            <input
                type="checkbox"
                ref={ref}
                className="sr-only peer"
                {...props}
            />
            {/* Track */}
            <div className={cn(
                "w-11 h-6 rounded-full peer-focus:outline-none transition-all duration-300",
                "bg-gray-200 peer-checked:bg-nominix-electric group-hover:bg-gray-300"
            )}></div>

            {/* Knob */}
            <div className={cn(
                "absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all duration-300",
                "peer-checked:translate-x-full peer-checked:border-white"
            )}></div>
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-gray-600 tracking-wider select-none transition-colors">
            {label}
        </span>
    </label>
));

ToggleField.displayName = "ToggleField";

export default ToggleField;
