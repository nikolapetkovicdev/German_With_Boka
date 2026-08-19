import {Currency} from '@prisma/client';

export type PaymentInstruction = {
  recipientName: string;
  recipientAddress: string;
  amount: string;
  currency: Currency;
  account?: string | null;
  foreignInstructions?: string | null;
  model?: string | null;
  reference: string;
  purpose: string;
  ipsQrPayload?: string;
};

export interface PaymentProvider {
  buildInstruction(input: PaymentInstruction): PaymentInstruction;
}

export class DirectBankPaymentProvider implements PaymentProvider {
  buildInstruction(input: PaymentInstruction) {
    return {
      ...input,
      ipsQrPayload:
        input.currency === Currency.RSD
          ? `K:PR|V:01|C:1|R:${input.account ?? ''}|N:${input.recipientName}|I:RSD${input.amount.replace('.', ',')}|P:${input.purpose}|SF:289|S:${input.reference}`
          : undefined
    };
  }
}

export const paymentProvider = new DirectBankPaymentProvider();
