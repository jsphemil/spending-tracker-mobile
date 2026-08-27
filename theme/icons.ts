import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarSync,
  Car,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clapperboard,
  Copy,
  CreditCard,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plane,
  Receipt,
  Shapes,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react-native";

// Every category/account `icon` column stores a plain, untyped string —
// historically a MaterialCommunityIcons name (spec.md's icon system predates
// this design refresh). Swapping the icon library is a rendering-layer
// change only: this map translates each already-persisted slug to its
// Lucide equivalent so existing data keeps resolving correctly. Anything
// added to constants/iconLibrary.ts's picker uses new keys that are also
// registered here.
export const ICON_MAP: Record<string, LucideIcon> = {
  // structural/UI icons
  "view-dashboard-outline": LayoutDashboard,
  "wallet-outline": Wallet,
  "swap-horizontal": ArrowLeftRight,
  "calendar-sync-outline": CalendarSync,
  "shape-outline": Shapes,
  "account-circle-outline": CircleUserRound,
  "pencil-outline": Pencil,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "calendar-month-outline": CalendarDays,
  "content-copy": Copy,
  "trash-can-outline": Trash2,
  // category icon picker options
  shopping: ShoppingBag,
  cart: ShoppingCart,
  "silverware-fork-knife": UtensilsCrossed,
  home: Home,
  briefcase: Briefcase,
  "heart-pulse": HeartPulse,
  gift: Gift,
  movie: Clapperboard,
  "book-open": BookOpen,
  car: Car,
  airplane: Plane,
  "credit-card": CreditCard,
  cash: Banknote,
  "trending-up": TrendingUp,
  cellphone: Smartphone,
  wifi: Wifi,
  flash: Zap,
  "emoticon-happy": Smile,
  "dots-horizontal": MoreHorizontal,
  // seed-only value, not offered by the picker but already persisted
  receipt: Receipt,
  // account-type icons (persisted via constants/accountTypes.ts)
  "piggy-bank": PiggyBank,
  bank: Landmark,
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MoreHorizontal;
}
