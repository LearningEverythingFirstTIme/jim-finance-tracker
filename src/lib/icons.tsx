'use client';

import * as LucideIcons from 'lucide-react';
import { Palette } from 'lucide-react';

const ICON_NAMES = [
  'Utensils', 'Car', 'Home', 'Zap', 'CreditCard', 'Heart', 'Film', 'User',
  'HandHeart', 'Shirt', 'Gift', 'MoreHorizontal', 'Briefcase', 'Laptop',
  'RotateCcw', 'Plus', 'Coffee', 'ShoppingCart', 'Plane', 'Gamepad2',
] as const;

const GOAL_ICON_NAMES = [
  'Target', 'Home', 'Car', 'Plane', 'Laptop', 'ShoppingCart', 'Gift', 'Heart',
  'Briefcase', 'DollarSign', 'Coffee', 'Film', 'Gamepad2', 'GraduationCap',
  'Baby', 'Trophy', 'Umbrella', 'CreditCard', 'Wallet', 'PiggyBank',
] as const;

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils: LucideIcons.Utensils,
  Car: LucideIcons.Car,
  Home: LucideIcons.Home,
  Zap: LucideIcons.Zap,
  CreditCard: LucideIcons.CreditCard,
  Heart: LucideIcons.Heart,
  Film: LucideIcons.Film,
  User: LucideIcons.User,
  HandHeart: LucideIcons.HandHeart,
  Shirt: LucideIcons.Shirt,
  Gift: LucideIcons.Gift,
  MoreHorizontal: LucideIcons.MoreHorizontal,
  Briefcase: LucideIcons.Briefcase,
  Laptop: LucideIcons.Laptop,
  RotateCcw: LucideIcons.RotateCcw,
  Plus: LucideIcons.Plus,
  Coffee: LucideIcons.Coffee,
  ShoppingCart: LucideIcons.ShoppingCart,
  Plane: LucideIcons.Plane,
  Gamepad2: LucideIcons.Gamepad2,
  Target: LucideIcons.Target,
  DollarSign: LucideIcons.DollarSign,
  GraduationCap: LucideIcons.GraduationCap,
  Baby: LucideIcons.Baby,
  Trophy: LucideIcons.Trophy,
  Umbrella: LucideIcons.Umbrella,
  Wallet: LucideIcons.Wallet,
  PiggyBank: LucideIcons.PiggyBank,
};

export function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  return iconMap[iconName] || Palette;
}

export { ICON_NAMES, GOAL_ICON_NAMES };

export function DynamicIcon({ name, className, ...props }: { name: string; className?: string } & React.SVGProps<SVGSVGElement>) {
  const Icon = getIconComponent(name);
  return <Icon className={className} {...props} />;
}
