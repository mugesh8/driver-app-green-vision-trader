export default function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl bg-[#2C2C2E] p-4 ${className}`}
    >
      {children}
    </div>
  );
}
