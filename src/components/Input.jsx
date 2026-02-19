export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  icon: Icon,
  rightIcon: RightIcon,
  className = '',
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full py-3 rounded-xl bg-[#333333] text-white placeholder-[#A0A0A0] border border-gray-600 ${
          Icon ? 'pl-12' : 'pl-4'
        } ${RightIcon ? 'pr-12' : 'pr-4'}`}
        {...props}
      />
      {RightIcon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#34C759]">
          <RightIcon className="w-5 h-5" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
