"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recordPayment, updateInvoiceStatus } from "./actions";

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateInvoiceStatus(invoiceId, e.target.value as InvoiceStatus))}
    >
      {INVOICE_STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

export function RecordPaymentDialog({ invoiceId, invoiceNumber, outstanding }: { invoiceId: string; invoiceNumber: string; outstanding: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost">Record payment</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment for {invoiceNumber}</DialogTitle>
          <DialogDescription>
            The invoice flips to paid automatically once recorded payments cover the total.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await recordPayment(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount (CAD)</Label>
              <Input id="payment-amount" name="amount" type="number" min="0" step="0.01" defaultValue={outstanding.toFixed(2)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Method</Label>
              <select id="payment-method" name="method" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="e_transfer">e-Transfer</option>
                <option value="stripe">Stripe</option>
                <option value="square">Square</option>
                <option value="cheque">Cheque</option>
                <option value="wire">Wire</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">Reference</Label>
            <Input id="payment-reference" name="reference" placeholder="Transaction or confirmation number" />
          </div>
          <Button type="submit" className="w-full">
            Record payment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
