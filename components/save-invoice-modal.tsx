"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceData } from "@/lib/invoice-types";

interface SaveInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { teamMember: string; description: string }) => Promise<void>;
  isSaving?: boolean;
}

export function SaveInvoiceModal({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: SaveInvoiceModalProps) {
  const [teamMember, setTeamMember] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!teamMember.trim()) {
      alert("Please enter the team member name");
      return;
    }

    await onSave({
      teamMember: teamMember.trim(),
      description: description.trim(),
    });

    // Reset form
    setTeamMember("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Invoice</DialogTitle>
          <DialogDescription>
            Add optional details to save with this invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teamMember" className="text-xs font-medium">
              Team Member Name *
            </Label>
            <Input
              id="teamMember"
              placeholder="Enter team member name"
              value={teamMember}
              onChange={(e) => setTeamMember(e.target.value)}
              className="h-9 text-sm"
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Add any notes or description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 resize-none text-sm"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !teamMember.trim()}
            >
              {isSaving ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
