"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { localTimeZone } from "@/lib/dates";

/**
 * Tells the backend which time zone this browser is in, so the times written in notifications and emails read the way
 * this person reads them. Sent once per person per browser session, and again if the zone changes.
 */
export function TimeZoneSync({ userKey }: { userKey: string }) {
  useEffect(() => {
    const zone = localTimeZone();
    // Remembered per person, so a second person signing in on the same browser still gets their own zone saved.
    const key = `tz_synced:${userKey}`;
    try {
      if (sessionStorage.getItem(key) === zone) return;
    } catch {
      /* storage can be blocked; just send it */
    }
    api("/me/time-zone", { method: "PUT", body: { timeZone: zone } })
      .then(() => {
        try {
          sessionStorage.setItem(key, zone);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, [userKey]);
  return null;
}
