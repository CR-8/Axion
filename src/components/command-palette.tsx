"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Briefcase, User, Phone, MapPin, Loader2 } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase";

interface ClientResult {
  id: string;
  name: string;
  phone: string;
}

interface CaseResult {
  id: string;
  case_number: string;
  court_name: string | null;
  court_city: string | null;
  clients: { name: string } | null;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [clients, setClients] = React.useState<ClientResult[]>([]);
  const [cases, setCases] = React.useState<CaseResult[]>([]);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch search results (simple debounce/effect)
  React.useEffect(() => {
    if (!open) return;
    if (!search.trim()) {
      setClients([]);
      setCases([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const [clientsRes, casesRes] = await Promise.all([
          fetch(`/api/clients?search=${encodeURIComponent(search)}`),
          fetch(`/api/cases?search=${encodeURIComponent(search)}`),
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData.slice(0, 5));
        }
        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setCases(casesData.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to query command palette search:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, open]);

  // Navigate and close
  const runCommand = React.useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Global Search Palette" description="Search clients, cases, phone numbers, or court names...">
      <CommandInput
        placeholder="Type to search clients, cases, phone numbers..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[350px]">
        {loading && (
          <div className="flex items-center justify-center py-6 text-text-secondary gap-2 text-xs">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Searching database...</span>
          </div>
        )}
        
        {!loading && search && clients.length === 0 && cases.length === 0 && (
          <CommandEmpty>No results found for "{search}".</CommandEmpty>
        )}

        {!search && (
          <div className="py-6 text-center text-xs text-text-secondary/50">
            Search case numbers, phone numbers, or names...
          </div>
        )}

        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => runCommand(() => router.push(`/clients/${client.id}`))}
                className="flex items-center gap-2 cursor-pointer py-3 hover:bg-muted"
              >
                <User className="size-3.5 text-text-secondary" />
                <span className="font-semibold text-foreground/80">{client.name}</span>
                <span className="text-text-secondary font-mono ml-2 text-[10.5px] tracking-wide">{client.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {cases.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cases">
              {cases.map((cs) => (
                <CommandItem
                  key={cs.id}
                  onSelect={() => runCommand(() => router.push(`/cases/${cs.id}`))}
                  className="flex items-center gap-2 cursor-pointer py-3 hover:bg-muted"
                >
                  <Briefcase className="size-3.5 text-text-secondary" />
                  <span className="font-bold font-mono text-foreground/90">{cs.case_number}</span>
                  {cs.clients && (
                    <span className="text-text-secondary/70 text-[11px]">({cs.clients.name})</span>
                  )}
                  {cs.court_name && (
                    <span className="text-[10px] text-text-secondary/50 truncate max-w-40 flex items-center gap-0.5 ml-auto">
                      <MapPin className="size-2.5" />
                      {cs.court_name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
