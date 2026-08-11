import { Text } from "react-native";

interface EmptyStateProps {
  message: string;
  className?: string;
}

// Standardizes the "No X yet." text every FlatList's ListEmptyComponent
// already used, consistently (text-gray-500 → text-fg-muted, centered).
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <Text className={`py-8 text-center text-fg-muted ${className ?? ""}`}>{message}</Text>
  );
}
