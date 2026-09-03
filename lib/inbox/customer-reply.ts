const CUSTOMER_REPLY_HEADING = "Neu eingegangene Kundenantwort:";

export function validateCustomerReply(customerReply: string): string | undefined {
  if (!customerReply.trim()) {
    return "Bitte die Antwort des Kunden eingeben.";
  }

  return undefined;
}

/**
 * Appends a new customer reply to the existing inquiry context with a clear,
 * repeatable section marker. Performs no interpretation of either text: the
 * previous context is kept exactly as-is, and the reply is only trimmed and
 * attached below it. Calling this again with the result as the next
 * `previousContext` accumulates further replies in order.
 */
export function composeInquiryWithCustomerReply(
  previousContext: string,
  customerReply: string,
): string {
  return [
    previousContext.trim(),
    "",
    "---",
    "",
    CUSTOMER_REPLY_HEADING,
    customerReply.trim(),
  ].join("\n");
}
