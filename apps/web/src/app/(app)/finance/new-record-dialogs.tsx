"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { createContract, createExpense, createInvoice, createRetainer } from "./actions";
import { createProposal } from "./proposal-actions";

export interface ClientOption {
  id: string;
  name: string;
}

function FormDialog({
  triggerLabel,
  title,
  description,
  action,
  children,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="mr-1 size-3.5" /> {triggerLabel}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          {children}
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientSelect({ clients, required = true }: { clients: ClientOption[]; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="clientId">Client</Label>
      <select id="clientId" name="clientId" required={required} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
        <option value="">{required ? "Select a client" : "No client (agency overhead)"}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NewRetainerDialog({ clients }: { clients: ClientOption[] }) {
  return (
    <FormDialog
      triggerLabel="Add retainer"
      title="Add retainer"
      description="Recurring revenue agreement. Included hours drive the scope-creep alert."
      action={createRetainer}
    >
      <ClientSelect clients={clients} />
      <div className="space-y-1.5">
        <Label htmlFor="retainer-name">Name</Label>
        <Input id="retainer-name" name="name" placeholder="Monthly retainer" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="retainer-amount">Amount (CAD)</Label>
          <Input id="retainer-amount" name="amount" type="number" min="0" step="50" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billingCadence">Cadence</Label>
          <select id="billingCadence" name="billingCadence" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="includedHours">Included hours</Label>
          <Input id="includedHours" name="includedHours" type="number" min="0" step="1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retainer-start">Start</Label>
          <Input id="retainer-start" name="startDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retainer-end">End</Label>
          <Input id="retainer-end" name="endDate" type="date" />
        </div>
      </div>
    </FormDialog>
  );
}

export function NewInvoiceDialog({ clients }: { clients: ClientOption[] }) {
  return (
    <FormDialog
      triggerLabel="Create invoice"
      title="Create invoice"
      description="Starts as a draft. Clients only see invoices once they are marked sent."
      action={createInvoice}
    >
      <ClientSelect clients={clients} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="invoice-amount">Amount (CAD)</Label>
          <Input id="invoice-amount" name="amount" type="number" min="0" step="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invoice-tax">Tax</Label>
          <Input id="invoice-tax" name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invoice-due">Due date</Label>
        <Input id="invoice-due" name="dueDate" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invoice-notes">Notes</Label>
        <Input id="invoice-notes" name="notes" placeholder="e.g. July retainer" />
      </div>
    </FormDialog>
  );
}

export function NewContractDialog({ clients }: { clients: ClientOption[] }) {
  return (
    <FormDialog
      triggerLabel="Add contract"
      title="Add contract"
      description="End date and notice period drive the renewal alerts."
      action={createContract}
    >
      <ClientSelect clients={clients} />
      <div className="space-y-1.5">
        <Label htmlFor="contract-name">Name</Label>
        <Input id="contract-name" name="name" required placeholder="e.g. 12-month services agreement" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="contract-value">Value (CAD)</Label>
          <Input id="contract-value" name="value" type="number" min="0" step="100" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contract-status">Status</Label>
          <select id="contract-status" name="status" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="contract-start">Start</Label>
          <Input id="contract-start" name="startDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contract-end">End</Label>
          <Input id="contract-end" name="endDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="renewalNoticeDays">Notice days</Label>
          <Input id="renewalNoticeDays" name="renewalNoticeDays" type="number" min="0" defaultValue="30" />
        </div>
      </div>
    </FormDialog>
  );
}

export function NewExpenseDialog({ clients }: { clients: ClientOption[] }) {
  return (
    <FormDialog
      triggerLabel="Add expense"
      title="Add expense"
      description="Contractor costs attributed to a client feed that client's profitability."
      action={createExpense}
    >
      <ClientSelect clients={clients} required={false} />
      <div className="space-y-1.5">
        <Label htmlFor="expense-description">Description</Label>
        <Input id="expense-description" name="description" required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">Amount (CAD)</Label>
          <Input id="expense-amount" name="amount" type="number" min="0" step="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-category">Category</Label>
          <select id="expense-category" name="category" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="contractor">Contractor</option>
            <option value="software">Software</option>
            <option value="ad_spend">Ad spend</option>
            <option value="ai_spend">AI spend</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="incurredOn">Date</Label>
          <Input id="incurredOn" name="incurredOn" type="date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="expense-vendor">Vendor</Label>
        <Input id="expense-vendor" name="vendor" />
      </div>
    </FormDialog>
  );
}

export function NewProposalDialog({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New proposal</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New proposal</DialogTitle>
          <DialogDescription>
            Create the shell, then price it from the service catalogue so the quote and the delivery plan describe the
            same work.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await createProposal(formData);
            if (result.error) toast.error(result.error);
            else if (result.id) {
              setOpen(false);
              router.push(`/finance/proposals/${result.id}`);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="np-title">Title</Label>
            <Input id="np-title" name="title" required placeholder="e.g. Social and paid retainer, Q4" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-client">Client</Label>
            <select id="np-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-valid">Valid until</Label>
            <Input id="np-valid" name="validUntil" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-notes">Notes</Label>
            <Input id="np-notes" name="notes" />
          </div>
          <Button type="submit" className="w-full">
            Create and price it
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
