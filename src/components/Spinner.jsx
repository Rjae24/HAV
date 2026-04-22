// Spinner de carga reutilizable
export default function Spinner({ size = 'md', color = 'white' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' };
  const colors = { white: 'border-white', teal: 'border-hav-primary', green: 'border-hav-secondary' };

  return (
    <div
      className={`${sizes[size]} ${colors[color]} border-2 border-t-transparent rounded-full animate-spin`}
    />
  );
}
