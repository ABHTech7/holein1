import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, X } from "lucide-react";
import { ResendMagicLink } from "@/components/auth/ResendMagicLink";
import { getLastAuthEmail } from "@/lib/entryContextPersistence";

interface EntryResendBannerProps {
  onDismiss?: () => void;
}

export const EntryResendBanner = ({ onDismiss }: EntryResendBannerProps) => {
  const [email, setEmail] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const lastEmail = getLastAuthEmail();
    if (lastEmail) {
      setEmail(lastEmail);
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible || !email) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Check your email for the secure link
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Sent to {email} • Didn't receive it?
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <ResendMagicLink
                email={email}
                redirectUrl={`${window.location.origin}/auth/callback`}
                showAsCard={false}
                size="sm"
                variant="outline"
                onResendSuccess={() => {
                  // Keep banner visible after successful resend
                }}
              />
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
