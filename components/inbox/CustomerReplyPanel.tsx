"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type CustomerReplyPanelProps = {
  isSubmitting: boolean;
  /**
   * Disables the textarea and submit action without claiming a reply is
   * being evaluated (unlike isSubmitting, this never changes the submit
   * button's label). Used when an unrelated workflow-mutating action is in
   * progress elsewhere and this panel must stay non-interactive, without
   * discarding whatever the user has already typed here.
   */
  disabled?: boolean;
  submitError: string;
  onCancel: () => void;
  onSubmit: (customerReply: string) => void;
};

export function CustomerReplyPanel({
  isSubmitting,
  disabled = false,
  submitError,
  onCancel,
  onSubmit,
}: CustomerReplyPanelProps) {
  const [reply, setReply] = useState("");
  const [validationError, setValidationError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInteractionDisabled = isSubmitting || disabled;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reply.trim()) {
      setValidationError("Bitte die Antwort des Kunden eingeben.");
      textareaRef.current?.focus();
      return;
    }

    setValidationError("");
    onSubmit(reply);
  }

  return (
    <section
      aria-label="Kundenantwort ergänzen"
      className="mt-4 rounded-xl border bg-white p-5"
    >
      <form noValidate onSubmit={handleSubmit}>
        <label
          htmlFor="customer-reply-message"
          className="text-sm font-medium text-neutral-700"
        >
          Antwort des Kunden
        </label>
        <textarea
          ref={textareaRef}
          id="customer-reply-message"
          rows={6}
          value={reply}
          onChange={(event) => {
            setReply(event.target.value);
            if (validationError) setValidationError("");
          }}
          disabled={isInteractionDisabled}
          aria-describedby={
            validationError ? "customer-reply-error" : undefined
          }
          aria-invalid={Boolean(validationError)}
          className="mt-2 w-full resize-y rounded-xl border bg-neutral-50 px-4 py-3 leading-7 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-wait disabled:opacity-60"
        />
        {validationError ? (
          <p
            id="customer-reply-error"
            role="alert"
            className="mt-2 text-sm text-red-700"
          >
            {validationError}
          </p>
        ) : null}

        {submitError ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isInteractionDisabled}
            className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Antwort wird ausgewertet …" : "Antwort auswerten"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border bg-white px-6 py-3 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  );
}
