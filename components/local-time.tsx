"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function LocalTime({ date, options }: { date: string; options?: Intl.DateTimeFormatOptions }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(undefined, options).format(new Date(date)),
    () => "",
  );
  return <time dateTime={date}>{text}</time>;
}
