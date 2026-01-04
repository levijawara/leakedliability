import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UserPaymentInfo {
  userId: string;
  name: string;
  email: string | null;
  status: string;
}

export interface PaymentStatusCounts {
  paid: { count: number; users: UserPaymentInfo[] };
  waiting: { count: number; users: UserPaymentInfo[] };
  unpaid: { count: number; users: UserPaymentInfo[] };
  unanswered: { count: number; users: UserPaymentInfo[] };
}

interface ReservoirPaymentButtonsProps {
  paymentCounts: PaymentStatusCounts;
}

type StatusKey = 'paid' | 'waiting' | 'unpaid' | 'unanswered';

const statusConfig: Record<StatusKey, { label: string; modalTitle: string; colorClasses: string }> = {
  paid: {
    label: "Yup!",
    modalTitle: "Users who answered 'Yup!'",
    colorClasses: "bg-green-500/20 border-green-500/40 hover:bg-green-500/30 text-green-700 dark:text-green-300"
  },
  waiting: {
    label: "Still waiting...",
    modalTitle: "Users who answered 'Still waiting...'",
    colorClasses: "bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300"
  },
  unpaid: {
    label: "Never.",
    modalTitle: "Users who answered 'Never.'",
    colorClasses: "bg-red-500/20 border-red-500/40 hover:bg-red-500/30 text-red-700 dark:text-red-300"
  },
  unanswered: {
    label: "No reply",
    modalTitle: "Users who haven't answered yet",
    colorClasses: "bg-gray-500/20 border-gray-500/40 hover:bg-gray-500/30 text-gray-700 dark:text-gray-300"
  }
};

export function ReservoirPaymentButtons({ paymentCounts }: ReservoirPaymentButtonsProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null);

  const handleButtonClick = (status: StatusKey) => {
    if (paymentCounts[status].count > 0) {
      setSelectedStatus(status);
    }
  };

  const selectedData = selectedStatus ? paymentCounts[selectedStatus] : null;
  const selectedConfig = selectedStatus ? statusConfig[selectedStatus] : null;

  return (
    <>
      <div className="flex gap-1">
        {(Object.keys(statusConfig) as StatusKey[]).map((status) => {
          const config = statusConfig[status];
          const data = paymentCounts[status];
          
          return (
            <button
              key={status}
              onClick={() => handleButtonClick(status)}
              disabled={data.count === 0}
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors border min-w-[28px]",
                config.colorClasses,
                data.count === 0 && "opacity-40 cursor-not-allowed"
              )}
              title={`${config.label}: ${data.count} user(s)`}
            >
              {data.count}
            </button>
          );
        })}
      </div>

      <Dialog open={!!selectedStatus} onOpenChange={() => setSelectedStatus(null)}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedConfig?.modalTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {selectedData?.users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users</p>
            ) : (
              <ul className="space-y-2">
                {selectedData?.users.map((user) => (
                  <li key={user.userId} className="text-sm">
                    <span className="font-medium">{user.name}</span>
                    {user.email && (
                      <span className="text-muted-foreground text-xs ml-2">({user.email})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
