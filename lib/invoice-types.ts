export type PaymentStatus = "Paid" | "Partial Paid" | "Unpaid";
export type Currency = "USD" | "GBP";
export type ServiceType = string;

export type InvoiceActivityType = "created" | "edited" | "sent" | "opened" | "paid";

export interface InvoiceActivity {
  type: InvoiceActivityType;
  at: string;
}

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
  activity?: InvoiceActivity[];
}

export const COMPANY_INFO = {
  name: "BUZZ FILING",
  website: "www.buzzfiling.com",
  email: "hello@buzzfiling.com",
  filingEmail: "filings@buzzfiling.com",
  phones: ["+92 3394882800", "+44 (774) 058-3294", "+1 (786) 574-9305"],
  address:
    "Office No. 503, Plot 67/3, Zulekha Trade Centre, Alamgir Rd, CP & Berar Society CP & Berar CHS, Karachi, Pakistan",
  bankAccountTitle: "BUZZ FILING",
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
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "US Dollar",
  GBP: "British Pound",
};
