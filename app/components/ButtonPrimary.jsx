export default function ButtonPrimary({ children, onClick = undefined, className = "", ...props }) {
  const buttonStyles = {
    boxShadow: `
      0 1px 2px rgba(2, 8, 11, 0.05),
      inset 0 32px 24px rgba(255, 255, 255, 0.05),
      inset 0 2px 1px rgba(255, 255, 255, 0.25),
      inset 0 0px 0px rgba(2, 8, 11, 0.15),
      inset 0 -2px 1px rgba(0, 0, 0, 0.20)
    `,
  };

  return (
    <button
      className={`bg-[#D83232] hover:bg-[#B72929] text-white px-4 py-2 rounded-full font-body font-medium transition-colors cursor-pointer items-center gap-2 ${className}`}
      style={buttonStyles}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
} 
