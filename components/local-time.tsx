"use client";

import { useSyncExternalStore } from "react";
import { formatDuration } from "@/lib/game";

const subscribe = () => () => {};

export function LocalTime({ date, options }: { date: string; options?: Intl.DateTimeFormatOptions }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(undefined, options).format(new Date(date)),
    () => "",
  );
  return <time dateTime={date}>{text}</time>;
}

function subscribeElapsed(onChange: () => void) {
  const interval = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(interval);
}

export function ElapsedTime({ since }: { since: string }) {
  const text = useSyncExternalStore(
    subscribeElapsed,
    () => formatDuration(Date.now() - new Date(since).getTime()),
    () => "",
  );
  return <span>{text}</span>;
}
