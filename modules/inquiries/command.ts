export interface InquiryCommand {
  idempotencyKey: string;
  name: string;
  email: string;
  phoneOrWhatsApp?: string;
  country: string;
  message: string;
  productId?: string;
  variantId?: string;
  privacyConsent: true;
  turnstileToken: string;
  honeypot?: string;
}
