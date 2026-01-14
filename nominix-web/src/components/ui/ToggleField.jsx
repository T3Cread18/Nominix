import React from 'react';
import { cn } from '../../utils/cn';

const ToggleField = ({
    label,
    name,
    checked,
    onChange,
    disabled = false,
    className
}) => (
    <div
        className={cn(
            "flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-gray-100/50 transition-all duration-300",
            "hover:bg-white hover:border-nominix-electric/20 hover:shadow-sm cursor-pointer group",
            disabled && "opacity-60 cursor-not-allowed",
            className
        )}
        onClick={() => !disabled && onChange({ target: { name, value: !checked, type: 'checkbox', checked: !checked } })}
    >
        <div className="relative inline-flex items-center cursor-pointer pointer-events-none">
            <input
                type="checkbox"
                name={name}
                checked={checked || false}
                readOnly
                disabled={disabled}
                className="sr-only peer"
            />
            <div className={cn(
                "w-11 h-6 rounded-full peer-focus:outline-none transition-all duration-300",
                checked ? "bg-nominix-electric" : "bg-gray-200 group-hover:bg-gray-300"
            )}></div>
            <div className={cn(
                "absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-all duration-300",
                checked ? "translate-x-full border-white" : ""
            )}></div>
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-gray-600 tracking-wider select-none transition-colors">
            {label}
        </span>
    </div>
);

export default ToggleField;
