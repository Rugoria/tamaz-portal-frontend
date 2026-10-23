"use client";
import {useLocalizedFormats} from "@/i18n/formats";

import {useT} from "@/i18n/client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

import { useApi } from "@/lib/hooks";
import type { ClearMovesConfigDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { RequiredRecords } from "@/components/admin/RequiredRecords";

export default function IntegrationSettingsPage() {
  const translate = useT();
  const { data, error, loading, reload } = useApi<ClearMovesConfigDto>("/admin/clearmoves-config");
  if (loading) return <SkeletonBlock height={420} />;
  if (error || !data) return <ErrorState title={translate("We couldn't load the settings.")} onRetry={reload} />;
  return <SettingsForm data={data} reload={reload} />;
}

function SettingsForm({ data, reload }: { data: ClearMovesConfigDto; reload: () => Promise<unknown> }) {
  const {dateTime} = useLocalizedFormats();
  const translate = useT();
  const toast = useToast();
  const [apiBaseUrl, setApiBaseUrl] = useState(data.apiBaseUrl ?? "");
  const [credentialReference, setCredentialReference] = useState(data.credentialReference ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [shippingAddress, setShippingAddress] = useState(data.shippingAddress ?? "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      await api("/admin/clearmoves-config", {
        method: "PUT",
        // Fields left out are left unchanged, so the secret is only sent when a new one is typed.
        body: { apiBaseUrl, credentialReference, shippingAddress, ...(webhookSecret ? { webhookSecret } : {}) },
      });
      setWebhookSecret("");
      await reload();
      toast(translate("Settings saved."));
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const noAddress = !data.shippingAddress?.trim();

  return (
    <div className="relative flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold md:text-[28px]">{translate("Integration settings")}</h1>
        {data.updatedAt && <span className="text-sm text-muted">{translate("Last updated ")}{dateTime(data.updatedAt)}</span>}
      </div>
      <div className="rounded-xl border border-[#A9DCE9] bg-aqua-soft px-5 py-3.5 text-sm">{translate("These fields may change when the manufacturer&apos;s API details arrive.")}</div>
      {noAddress && (
        <div role="alert" className="rounded-xl border border-amber-line bg-amber-soft px-5 py-3.5 font-medium text-[#5C4200]">
          {translate("Cases can&apos;t be sent until the company shipping address is set.")}</div>
      )}
      {formError && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">
          {translate(formError)}
        </div>
      )}

      <div className="flex max-w-[760px] flex-col gap-5 rounded-xl border border-line bg-surface p-6">
        <Field label={translate("API address")}>
          <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder={translate("https://api.example.com/v1")} />
        </Field>
        <Field label={translate("Credential reference")} hint={translate("Where the API key is stored. Never type the key here.")}>
          <Input value={credentialReference} onChange={(e) => setCredentialReference(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <div className="flex items-center gap-2.5">
            {translate("Webhook secret")}{data.webhookSecretSet && <Chip label={translate("Set")} tone="aqua" />}
          </div>
          <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={translate("Enter a new secret to replace it")} autoComplete="new-password" aria-label={translate("Webhook secret")} />
          <span className="text-[13px] font-normal text-muted">{translate("The secret is never shown. Leave this empty to keep the current one.")}</span>
        </div>
        <Field label={translate("Company shipping address")}>
          <Textarea
            rows={4}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder={translate("Address line, city, postcode, country")}
            className={noAddress && !shippingAddress.trim() ? "!border-[#B3730E]" : ""}
          />
        </Field>
        <div>
          <Button variant="primary" onClick={save} loading={busy} className="px-[22px]">
            {translate("Save settings")}</Button>
        </div>
      </div>
      <RequiredRecords />
    </div>
  );
}
