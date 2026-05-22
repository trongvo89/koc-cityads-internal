"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

export type ClientOption = {
  client_id: string;
  company_name: string;
};

export type ClientPickerValue =
  | { type: "existing"; client_id: string; company_name: string }
  | { type: "new"; company_name: string }
  | null;

interface ClientPickerProps {
  clients: ClientOption[];
  value: ClientPickerValue;
  onChange: (value: ClientPickerValue) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ClientPicker({
  clients,
  value,
  onChange,
  placeholder = "Tìm hoặc tạo client...",
  disabled,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? clients.filter((c) => c.company_name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  // Show "create new" option when query doesn't exactly match any client
  const exactMatch = clients.some(
    (c) => c.company_name.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreateNew = query.trim().length > 0 && !exactMatch;

  function handleSelect(client: ClientOption) {
    onChange({ type: "existing", client_id: client.client_id, company_name: client.company_name });
    setOpen(false);
    setQuery("");
  }

  function handleCreateNew() {
    onChange({ type: "new", company_name: query.trim() });
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (showCreateNew) {
        handleCreateNew();
      }
    }
  }

  // Display the selected value
  if (value && !open) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full flex items-center justify-between gap-2 h-9 px-3 border border-zinc-200 rounded-md text-sm bg-white hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {value.type === "new" && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                <Plus className="h-2.5 w-2.5" />
                Mới
              </span>
            )}
            <span className="truncate font-medium text-zinc-900">{value.company_name}</span>
          </div>
          <X
            className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-700 flex-shrink-0"
            onClick={handleClear}
          />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full h-9 px-3 pr-8 border border-zinc-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !showCreateNew && (
              <p className="text-xs text-zinc-400 text-center py-4">Không tìm thấy client</p>
            )}

            {filtered.map((c) => (
              <button
                key={c.client_id}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors ${
                  value?.type === "existing" && value.client_id === c.client_id
                    ? "bg-blue-50 text-blue-700"
                    : "text-zinc-800"
                }`}
              >
                {value?.type === "existing" && value.client_id === c.client_id && (
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                {!(value?.type === "existing" && value.client_id === c.client_id) && (
                  <span className="w-3.5 flex-shrink-0" />
                )}
                {c.company_name}
              </button>
            ))}

            {showCreateNew && (
              <>
                {filtered.length > 0 && <div className="border-t border-zinc-100 my-1" />}
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Tạo client mới: <strong>{query.trim()}</strong></span>
                </button>
              </>
            )}
          </div>

          {filtered.length === 0 && !showCreateNew && clients.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-2 text-[10px] text-zinc-400">
              {clients.length} client trong hệ thống
            </div>
          )}
        </div>
      )}
    </div>
  );
}
