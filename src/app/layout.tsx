import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "BASSFIT | ...fitness sin límites de edad.. — Entrenamientos, Asesorías & Equipamiento",
  description:
    "Plataforma oficial de Bassfit: Planes de Entrenamiento Personalizados, Longevidad Activa, Asesorías 1 a 1, Equipamiento Deportivo y Suplementación Consultiva.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${lato.variable} ${montserrat.variable}`}>
      <body className="antialiased bg-white text-[#0F172A]">{children}</body>
    </html>
  );
}

