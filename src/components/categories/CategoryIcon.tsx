import {
  Baby,
  Bath,
  BedDouble,
  BookOpen,
  Car,
  Flower2,
  Gift,
  HeartPulse,
  House,
  Milk,
  Package,
  Plug,
  Puzzle,
  Shirt,
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** Ícones disponíveis para categorias (o banco guarda só a chave). */
export const ICONES: Record<string, LucideIcon> = {
  shirt: Shirt,
  bath: Bath,
  bed: BedDouble,
  milk: Milk,
  stroller: Baby,
  plug: Plug,
  health: HeartPulse,
  flower: Flower2,
  gift: Gift,
  toy: Puzzle,
  book: BookOpen,
  car: Car,
  home: House,
  sun: Sun,
  star: Star,
  package: Package,
};

export function CategoryIcon({ icone, className }: { icone: string; className?: string }) {
  const Icone = ICONES[icone] ?? Package;
  return <Icone aria-hidden className={className} />;
}
