export type PaymentStatus = "Paid" | "Partial Paid" | "Unpaid";
export type Currency = "USD" | "GBP" | "PKR";
export type ServiceType = string;

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export interface InvoiceData {
  billTo: string;
  clientEmail?: string;
  invoiceNumber: number;
  invoiceDate: string;
  serviceType: ServiceType;
  invoiceBy: string;
  paymentStatus: PaymentStatus;
  currency: Currency;
  lineItems: LineItem[];
  discount: number;
  paymentReceived: number;
  paymentTerms: string;
  teamMember?: string;
  invoiceDescription?: string;
}

export const COMPANY_INFO = {
  name: "INCORZ",
  website: "www.incorz.com",
  email: "hello@incorz.com",
  phone: "(302) 209-8440",
  address:
    "25 SE 2nd Ave Ste 550 Miami, FL 33131",
  bankAccountTitle: "INCORZ",
  bankAccountNumber: "1176314943776",
  iban: "PK22UNIL0109000314943776",
  bankName: "United Bank Limited (UBL)",
};

export const DEFAULT_INVOICE: Omit<InvoiceData, "invoiceNumber"> = {
  billTo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  serviceType: "LLC Formation",
  invoiceBy: "",
  paymentStatus: "Unpaid",
  currency: "USD",
  lineItems: [
    {
      id: crypto.randomUUID(),
      description: "",
      qty: 1,
      rate: 0,
    },
  ],
  discount: 0,
  paymentReceived: 0,
  paymentTerms: "",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  PKR: "Rs",
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "US Dollar",
  GBP: "British Pound",
  PKR: "Pakistani Rupee",
};
