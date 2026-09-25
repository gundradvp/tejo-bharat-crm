export type StickyNoteColor = 'yellow' | 'green' | 'blue' | 'purple' | 'rose' | 'amber';

export interface StickyNote {
  id: string;
  userId: string; // strictly user-specific
  userName?: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  isPinned: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const STICKY_COLOR_SCHEMES: Record<
  StickyNoteColor,
  {
    bg: string;
    border: string;
    header: string;
    badge: string;
    itemBg: string;
    btnHover: string;
  }
> = {
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    header: 'bg-amber-100/70 text-amber-900 border-amber-200',
    badge: 'bg-amber-200 text-amber-900',
    itemBg: 'bg-amber-100/50 hover:bg-amber-100 text-amber-950',
    btnHover: 'hover:bg-amber-200 text-amber-900',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    header: 'bg-emerald-100/70 text-emerald-900 border-emerald-200',
    badge: 'bg-emerald-200 text-emerald-900',
    itemBg: 'bg-emerald-100/50 hover:bg-emerald-100 text-emerald-950',
    btnHover: 'hover:bg-emerald-200 text-emerald-900',
  },
  blue: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    header: 'bg-sky-100/70 text-sky-900 border-sky-200',
    badge: 'bg-sky-200 text-sky-900',
    itemBg: 'bg-sky-100/50 hover:bg-sky-100 text-sky-950',
    btnHover: 'hover:bg-sky-200 text-sky-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    header: 'bg-purple-100/70 text-purple-900 border-purple-200',
    badge: 'bg-purple-200 text-purple-900',
    itemBg: 'bg-purple-100/50 hover:bg-purple-100 text-purple-950',
    btnHover: 'hover:bg-purple-200 text-purple-900',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    header: 'bg-rose-100/70 text-rose-900 border-rose-200',
    badge: 'bg-rose-200 text-rose-900',
    itemBg: 'bg-rose-100/50 hover:bg-rose-100 text-rose-950',
    btnHover: 'hover:bg-rose-200 text-rose-900',
  },
  amber: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    header: 'bg-orange-100/70 text-orange-900 border-orange-200',
    badge: 'bg-orange-200 text-orange-900',
    itemBg: 'bg-orange-100/50 hover:bg-orange-100 text-orange-950',
    btnHover: 'hover:bg-orange-200 text-orange-900',
  },
};
