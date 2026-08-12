export type InquiryIntake = {
  customer: string;
  location: string;
  message: string;
};

export type InquiryIntakeField = keyof InquiryIntake;

export type InquiryIntakeErrors = Partial<Record<InquiryIntakeField, string>>;

export function validateInquiryIntake(
  intake: InquiryIntake,
): InquiryIntakeErrors {
  const errors: InquiryIntakeErrors = {};

  if (!intake.customer.trim()) {
    errors.customer = "Bitte einen Kunden oder Kontakt angeben.";
  }

  if (!intake.message.trim()) {
    errors.message = "Bitte die Kundenanfrage eingeben.";
  }

  return errors;
}

export function composeInquiry(intake: InquiryIntake): string {
  const lines = [
    `Kunde/Kontakt: ${intake.customer.trim()}`,
    intake.location.trim() ? `Ort: ${intake.location.trim()}` : null,
    "Kundenanfrage:",
    intake.message.trim(),
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
