"use client";

import {useT} from "@/i18n/client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, PendingTag, PreviewNote } from "@/components/ui/states";

/**
 * Preview only. The tracking number printed on the aligners is a client decision (format, one per case or one per
 * submission, length limits). Until then there is nothing to search, so this shows the screen with no numbers.
 */
export default function TrackingPage() {
  const translate = useT();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-5">
      <h1 className="m-0 text-2xl font-semibold md:text-[28px]">
        {translate("Tracking ")}<PendingTag />
      </h1>
      <PreviewNote>{translate("Tracking numbers aren&apos;t created yet. Their format is waiting on the client.")}</PreviewNote>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query.trim() || null);
        }}
        className="flex max-w-[560px] gap-3"
      >
        <Input placeholder={translate("Search by tracking number")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={translate("Tracking number")} />
        <Button type="submit">{translate("Search")}</Button>
      </form>
      {searched ? (
        <EmptyState title={translate("No case has that tracking number.")} text={translate("Check the number and try again.")} />
      ) : (
        <EmptyState title={translate("No tracking numbers yet.")} text={translate("Tracking numbers appear here once cases are numbered.")} />
      )}
    </div>
  );
}
