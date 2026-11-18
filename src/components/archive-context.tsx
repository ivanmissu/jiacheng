"use client";
import { createContext, useContext } from "react";
import type { ArchiveData, Person } from "@/lib/types";
export type PageKey = "overview" | "tree" | "members" | "timeline" | "archives" | "kinship" | "workspace" | "backups" | "book";
export type ArchiveContextValue = {
  data: ArchiveData; people: Person[]; page: PageKey; navigate: (page: PageKey) => void;
  me: string | null; setMe: (id: string | null) => void; openIdentity: () => void;
  openPerson: (id: string) => void; openEditor: (person?: Partial<Person>) => void;
  openSource: (id: string) => void; openShare: (person?: Person) => void;
  requestAdmin: (page?: PageKey) => void; mutate: (input: Record<string, unknown>, message?: string) => Promise<boolean>;
  toast: (message: string, error?: boolean) => void; query: string; setQuery: (q: string) => void;
  sourceId: string; setSourceId: (id: string) => void;
};
export const ArchiveContext = createContext<ArchiveContextValue | null>(null);
export function useArchive() {
  const context = useContext(ArchiveContext);
  if (!context) throw new Error("Archive provider is required");
  return context;
}
