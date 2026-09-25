import { StickyNote } from '../types/stickyNotes';

const getStorageKey = (userId: string) => `tejo_user_sticky_notes_${userId || 'default'}`;

export const DEFAULT_USER_STICKY_NOTES: (userId: string, userName?: string) => StickyNote[] = (
  userId,
  userName = 'Staff Member'
) => [
  {
    id: `note_pmsurya_${Date.now()}_1`,
    userId,
    userName,
    title: '☀️ PM Surya Ghar Quick Reference',
    content: `Govt Subsidy: 1kW=₹30,000, 2kW=₹60,000, 3kW=₹78,000\nAvg Monthly Gen: 1kW = 120-150 units\nNet Metering: APEPDCL eligible\nHelpline: +91 94797 97947 / +91 81211 04043\nTejo Bharat Empanelled Vendor Code: TB-APEPDCL-2024`,
    color: 'yellow',
    isPinned: true,
    tags: ['Subsidy', 'Quick Info'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `note_calls_${Date.now()}_2`,
    userId,
    userName,
    title: '📞 Today Follow-Up Leads',
    content: `EE PURI TIRUPATHI RAJU: 8374214215 (2kW proposal sent)\nSOMAROUTHU BULLEBAI: 9290441935 (Area 0711, high bill)\nEcowatts solar solutions: 9866574033 (Asked for details)\nShaik Basheer: 9010835232 (Free site survey booked)`,
    color: 'green',
    isPinned: false,
    tags: ['Follow Up', 'Leads'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `note_script_${Date.now()}_3`,
    userId,
    userName,
    title: '💬 WhatsApp Message Quick Snippet',
    content: `నమస్కారం! తేజో భారత్ సోలార్ ద్వారా మీ ఇంటికి నెలకు ₹4,000 కరెంట్ బిల్లు ఆదా చేసుకోవచ్చు. 0% డౌన్‌పేమెంట్ మరియు ₹78,000 కేంద్ర ప్రభుత్వ సబ్సిడీతో ఉచిత సైట్ విజిట్ కొరకు ఇప్పుడే సంప్రదించండి: 9479797947.`,
    color: 'blue',
    isPinned: false,
    tags: ['Telugu Script', 'WhatsApp'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getUserStickyNotes(userId: string, userName?: string): StickyNote[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a: StickyNote, b: StickyNote) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }
    }
  } catch (err) {
    console.error('Failed to load user sticky notes:', err);
  }

  // Provide initial starter notes for this user
  const defaults = DEFAULT_USER_STICKY_NOTES(userId, userName);
  saveAllUserStickyNotes(userId, defaults);
  return defaults;
}

export function saveAllUserStickyNotes(userId: string, notes: StickyNote[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save sticky notes:', err);
  }
}

export function upsertUserStickyNote(userId: string, note: StickyNote): StickyNote[] {
  const current = getUserStickyNotes(userId);
  const exists = current.some((n) => n.id === note.id);
  const now = new Date().toISOString();
  const updatedNote = { ...note, userId, updatedAt: now };

  let updatedList: StickyNote[];
  if (exists) {
    updatedList = current.map((n) => (n.id === note.id ? updatedNote : n));
  } else {
    updatedList = [updatedNote, ...current];
  }

  saveAllUserStickyNotes(userId, updatedList);
  return updatedList;
}

export function deleteUserStickyNote(userId: string, noteId: string): StickyNote[] {
  const current = getUserStickyNotes(userId);
  const filtered = current.filter((n) => n.id !== noteId);
  saveAllUserStickyNotes(userId, filtered);
  return filtered;
}

export function togglePinUserStickyNote(userId: string, noteId: string): StickyNote[] {
  const current = getUserStickyNotes(userId);
  const updated = current.map((n) =>
    n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
  );
  saveAllUserStickyNotes(userId, updated);
  return updated;
}
