"use client";
import { useRouter } from "next/navigation";
import { FoodSearch } from "@/components/food-search";

export function FoodBrowser() {
  const router = useRouter();
  return <FoodSearch onSelect={(f) => router.push(`/foods/${f.id}`)} autoFocus />;
}
