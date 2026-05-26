import { BookOpen, Brain, Layers, MapPin } from "lucide-react";
import type { GameMode } from "../types";

const MODES: { id: GameMode; label: string; icon: typeof BookOpen }[] = [
  { id: "edit", label: "Edit", icon: MapPin },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Quiz", icon: Brain },
];

export interface NavbarProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export default function Navbar({ mode, onModeChange }: NavbarProps) {
  return (
    <nav
      className="sticky top-0 z-20 border-b border-stone-800 bg-stone-950/90 backdrop-blur-md"
      aria-label="Game modes"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-50">
            Kyusho Memory
          </h1>
          <p className="text-xs text-stone-500">Shito-Ryu · 34 vital points</p>
        </div>

        <div className="flex max-w-[min(100%,20rem)] overflow-x-auto rounded-lg border border-stone-700 bg-stone-900 p-1 sm:max-w-none">
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onModeChange(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? id === "edit"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-red-700 text-white shadow-sm"
                    : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
