import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "text-yellow-500";
    case "accepted":
    case "in_progress":
      return "text-blue-500";
    case "completed":
      return "text-green-500";
    case "missing_resources":
      return "text-orange-500";
    case "cancelled":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "accepted":
      return "Acceptée";
    case "in_progress":
      return "En cours";
    case "completed":
      return "Terminée";
    case "missing_resources":
      return "Ressources manquantes";
    case "cancelled":
      return "Annulée";
    default:
      return status;
  }
}
