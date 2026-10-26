"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import type { CaseCardDto, ConversationDto, Role } from "@/lib/types";
import { Thread } from "@/components/features/MessagesView";

/**
 * The side panel on a case page: the clinic's or doctor's one chat with Tamaz, right where they are working. It is the same chat as the
 * Messages screen. Nothing is attached unless they choose to: the case they are looking at is only offered ("Attach this case").
 */
export function CaseChatPanel({ role, thisCase, onClose }: { role: Role; thisCase: CaseCardDto; onClose: () => void }) {
  const translate = useT();
  const [conversation, setConversation] = useState<ConversationDto | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<ConversationDto>("/chat/conversations", { method: "POST", body: { participantId: null } })
      .then(setConversation)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(11,31,58,.45)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={translate("Message Tamaz")} className="flex h-full w-full max-w-[460px] flex-col bg-surface shadow-[0_8px_24px_rgba(11,31,58,.18)]">
        {conversation ? (
          <Thread conversation={conversation} role={role} suggestCase={thisCase} onClose={onClose} />
        ) : (
          <div className="m-auto px-6 text-center text-muted">
            {failed ? translate("We couldn't open the chat. Try again.") : <span className="tz-pulse">{translate("Loading")}</span>}
            {failed && (
              <div className="mt-3">
                <button onClick={onClose} className="h-11 px-3 text-sm underline">
                  {translate("Close")}</button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
