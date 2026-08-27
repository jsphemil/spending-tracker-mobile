// Full icon-choice list offered by ui/IconPicker for categories and
// accounts — replaces the old fixed 19-option CATEGORY_ICONS grid with
// broad freedom of choice. Keys are resolved to a Lucide component via
// theme/icons.ts's ICON_MAP/resolveIcon(); grouping/labels here are purely
// for the picker UI, not persisted (only `key` is written to the DB).
export interface IconOption {
  key: string;
  label: string;
}

export interface IconGroup {
  title: string;
  icons: IconOption[];
}

export const ICON_LIBRARY: IconGroup[] = [
  {
    title: "Shopping & Food",
    icons: [
      { key: "shopping", label: "Shopping" },
      { key: "cart", label: "Groceries" },
      { key: "silverware-fork-knife", label: "Dining Out" },
      { key: "coffee", label: "Coffee" },
      { key: "pizza", label: "Fast Food" },
      { key: "wine", label: "Drinks" },
      { key: "cake", label: "Bakery" },
      { key: "shirt", label: "Clothing" },
    ],
  },
  {
    title: "Home & Bills",
    icons: [
      { key: "home", label: "Home & Rent" },
      { key: "receipt", label: "Bills" },
      { key: "flash", label: "Electricity" },
      { key: "wifi", label: "Internet" },
      { key: "cellphone", label: "Phone" },
      { key: "key", label: "Deposit" },
      { key: "hammer", label: "Repairs" },
      { key: "sofa", label: "Furniture" },
      { key: "lightbulb", label: "Utilities" },
      { key: "droplets", label: "Water" },
    ],
  },
  {
    title: "Transport",
    icons: [
      { key: "car", label: "Car" },
      { key: "fuel", label: "Fuel" },
      { key: "bus", label: "Public Transit" },
      { key: "train", label: "Train" },
      { key: "bike", label: "Bike" },
      { key: "parking", label: "Parking" },
    ],
  },
  {
    title: "Health & Fitness",
    icons: [
      { key: "heart-pulse", label: "Health" },
      { key: "stethoscope", label: "Doctor" },
      { key: "pill", label: "Pharmacy" },
      { key: "dumbbell", label: "Fitness" },
      { key: "activity", label: "Wellness" },
    ],
  },
  {
    title: "Entertainment",
    icons: [
      { key: "movie", label: "Movies" },
      { key: "book-open", label: "Books" },
      { key: "gamepad", label: "Gaming" },
      { key: "music", label: "Music" },
      { key: "headphones", label: "Streaming" },
      { key: "emoticon-happy", label: "Fun" },
      { key: "sparkles", label: "Beauty" },
    ],
  },
  {
    title: "Travel",
    icons: [
      { key: "airplane", label: "Flights" },
      { key: "hotel", label: "Hotel" },
      { key: "map-pin", label: "Travel" },
      { key: "luggage", label: "Luggage" },
    ],
  },
  {
    title: "Finance & Business",
    icons: [
      { key: "credit-card", label: "Card Payment" },
      { key: "cash", label: "Cash" },
      { key: "trending-up", label: "Investments" },
      { key: "trending-down", label: "Loss" },
      { key: "piggy-bank", label: "Savings" },
      { key: "bank", label: "Bank" },
      { key: "briefcase", label: "Business" },
      { key: "percent", label: "Interest" },
      { key: "calculator", label: "Taxes" },
      { key: "shield", label: "Insurance" },
      { key: "wallet-outline", label: "Wallet" },
      { key: "coins", label: "Coins" },
    ],
  },
  {
    title: "Family & Personal",
    icons: [
      { key: "gift", label: "Gifts" },
      { key: "users", label: "Family" },
      { key: "baby", label: "Kids" },
      { key: "paw-print", label: "Pets" },
      { key: "scissors", label: "Personal Care" },
    ],
  },
  {
    title: "Education",
    icons: [
      { key: "graduation-cap", label: "Education" },
      { key: "backpack", label: "Supplies" },
    ],
  },
  {
    title: "Other",
    icons: [
      { key: "dots-horizontal", label: "Other" },
      { key: "star", label: "Favorite" },
      { key: "flag", label: "Goal" },
      { key: "target", label: "Target" },
      { key: "trophy", label: "Achievement" },
      { key: "package", label: "Shipping" },
      { key: "leaf", label: "Eco" },
      { key: "recycle", label: "Recycling" },
    ],
  },
];

export const ALL_ICON_OPTIONS: IconOption[] = ICON_LIBRARY.flatMap((g) => g.icons);
