import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'NexoPOS',
  description: 'Punto de venta e inventario',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
