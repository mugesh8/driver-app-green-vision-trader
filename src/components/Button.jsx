export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-[#34C759] text-white hover:bg-[#2DB84D]',
    secondary: 'bg-[#333333] text-white',
    danger: 'bg-[#EF4444] text-white',
  };

  return (
    <button
      type={type}
      className={`w-full py-3 px-4 rounded-xl font-semibold text-base disabled:opacity-70 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
