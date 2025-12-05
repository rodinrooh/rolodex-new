import { supabase } from "./supabase";

export interface Person {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  company: string | null;
  introducer_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  person_id: string;
  description: string;
  sentiment: "good" | "bad" | "neutral";
  created_at: string;
}

export async function getPeople(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching people:", error);
    return [];
  }

  return data || [];
}

export async function getEvents(personId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data || [];
}

export async function getEventsForPerson(personId: string): Promise<Event[]> {
  return getEvents(personId);
}

export async function getEventsForPeople(personIds: string[]): Promise<Event[]> {
  if (personIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("person_id", personIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching events for people:", error);
    return [];
  }

  return data || [];
}

// Calculate line color based on events for a person
export function calculateLineColor(events: Event[]): string {
  if (events.length === 0) {
    return "#000000"; // Black (default)
  }

  const goodCount = events.filter((e) => e.sentiment === "good").length;
  const badCount = events.filter((e) => e.sentiment === "bad").length;
  const neutralCount = events.filter((e) => e.sentiment === "neutral").length;

  // If all events are the same sentiment, use that color
  if (goodCount === events.length) {
    return "#22c55e"; // Green
  }
  if (badCount === events.length) {
    return "#ef4444"; // Red
  }
  if (neutralCount === events.length) {
    return "#6b7280"; // Gray
  }

  // Mixed events - calculate average color
  // Weight: good = green, bad = red, neutral = gray
  const total = events.length;
  const goodWeight = goodCount / total;
  const badWeight = badCount / total;
  const neutralWeight = neutralCount / total;

  // Mix colors: green (34, 197, 94), red (239, 68, 68), gray (107, 114, 128)
  const r = Math.round(34 * goodWeight + 239 * badWeight + 107 * neutralWeight);
  const g = Math.round(197 * goodWeight + 68 * badWeight + 114 * neutralWeight);
  const b = Math.round(94 * goodWeight + 68 * badWeight + 128 * neutralWeight);

  return `rgb(${r}, ${g}, ${b})`;
}

