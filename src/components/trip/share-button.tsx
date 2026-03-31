"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEnableShareLink, useDisableShareLink } from "@/hooks/use-trip";
import { Share2, Copy, Check, Link2Off } from "lucide-react";

interface ShareButtonProps {
  tripId: string;
  shareToken?: string | null;
}

export function ShareButton({ tripId, shareToken: initialToken }: ShareButtonProps) {
  const [token, setToken] = useState(initialToken ?? null);
  const [copied, setCopied] = useState(false);

  const enable = useEnableShareLink();
  const disable = useDisableShareLink();

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}`
    : null;

  async function handleEnable() {
    enable.mutate(tripId, {
      onSuccess: (data) => setToken(data.token),
    });
  }

  async function handleDisable() {
    disable.mutate(tripId, {
      onSuccess: () => setToken(null),
    });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger className="flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent" aria-label="Share trip">
        <Share2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this trip (read-only).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={handleDisable}
                disabled={disable.isPending}
              >
                <Link2Off className="h-4 w-4" />
                Revoke link
              </Button>
            </>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={handleEnable}
              disabled={enable.isPending}
            >
              <Share2 className="h-4 w-4" />
              Generate share link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
