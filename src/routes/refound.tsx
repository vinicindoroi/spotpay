import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Check,
  CreditCard,
  Info,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refound")({
  head: () => ({
    meta: [
      { title: "Request a Refund — Spotify Rewards" },
      {
        name: "description",
        content: "Submit a secure refund request for your Spotify Rewards purchase.",
      },
      { property: "og:title", content: "Request a Refund — Spotify Rewards" },
      {
        property: "og:description",
        content: "Submit a secure refund request for your Spotify Rewards purchase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-refund-subtle px-5 py-12 font-sans text-foreground sm:py-16">
      <div className="w-full max-w-[410px]">
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <AudioLines className="size-4" aria-hidden="true" />
            </span>
            Spotify <span className="font-medium text-muted-foreground">Rewards</span>
          </div>
        </div>

        <ol className="mx-auto mb-4 flex max-w-[230px] items-center text-[11px] font-semibold">
          <li className={`flex items-center gap-1.5 ${submitted ? "text-brand" : "text-brand-soft-foreground"}`}>
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] text-brand-foreground">
              {submitted ? <Check className="size-3" aria-hidden="true" /> : "1"}
            </span>
            Request
          </li>
          <span className="mx-3 h-px flex-1 bg-border" aria-hidden="true" />
          <li className={`flex items-center gap-1.5 ${submitted ? "text-brand-soft-foreground" : "text-muted-foreground"}`}>
            <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${submitted ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>
              2
            </span>
            Confirmation
          </li>
        </ol>

        <header className="mb-6 text-center">
          <h1 className="text-[28px] font-extrabold leading-tight text-foreground">
            {submitted ? "Request received" : "Request a refund"}
          </h1>
          <p className="mx-auto mt-2 max-w-[350px] text-sm leading-5 text-muted-foreground">
            {submitted
              ? "We received your request and will send updates to your purchase email."
              : "Use the same name and email from your purchase. We start processing as soon as you submit."}
          </p>
        </header>

        <section className="rounded-xl border border-border bg-refund-surface p-5 shadow-refund sm:p-6">
          {submitted ? (
            <div className="py-4 text-center" aria-live="polite">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
                <ShieldCheck className="size-8" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-bold">Refund review started</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Your request is now in review. Keep an eye on your inbox for confirmation.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6 h-11 w-full"
                onClick={() => setSubmitted(false)}
              >
                Submit another request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5 flex gap-3 rounded-lg border border-brand/20 bg-brand-soft p-3 text-brand-soft-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                  <Info className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold">Important</p>
                  <p className="mt-0.5 text-[11px] leading-4">
                    We locate your purchase with the email used at checkout. Fill both fields carefully so we can process this quickly.
                  </p>
                </div>
              </div>

              <label className="block text-xs font-bold" htmlFor="refund-name">
                Full name <span className="text-destructive">*</span>
              </label>
              <input
                id="refund-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Name on the purchase"
                className="mt-2 h-11 w-full rounded-lg border border-transparent bg-refund-field px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              <label className="mt-4 block text-xs font-bold" htmlFor="refund-email">
                Purchase email <span className="text-destructive">*</span>
              </label>
              <input
                id="refund-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="email@used-to-buy.com"
                className="mt-2 h-11 w-full rounded-lg border border-transparent bg-refund-field px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground">Use the same email registered for the purchase</p>

              <Button
                type="submit"
                className="mt-4 h-12 w-full bg-brand font-bold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand/90"
              >
                Request refund
                <ArrowRight aria-hidden="true" />
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <LockKeyhole className="size-3 text-brand" aria-hidden="true" />
                Your information is used only to process the refund
              </p>
            </form>
          )}
        </section>

        <div className="mt-4 flex items-center justify-center gap-5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
            Secure request
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-brand" aria-hidden="true" />
            Same card / method
          </span>
        </div>
      </div>
    </main>
  );
}