import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QueuedNotification {
  id: string;
  producer_email: string;
  report_id: string;
  project_name: string;
  amount_owed: number;
  days_overdue: number;
  producer_name?: string;
  company_name?: string;
}

interface ProducerNotificationSelectorProps {
  queuedNotifications: any[];
  onEmailsSent: () => void;
}

export function ProducerNotificationSelector({ 
  queuedNotifications, 
  onEmailsSent 
}: ProducerNotificationSelectorProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<QueuedNotification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [queuedNotifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch detailed notification data with producer info
      const { data, error } = await supabase
        .from('queued_producer_notifications')
        .select(`
          id,
          producer_email,
          report_id,
          project_name,
          amount_owed,
          days_overdue,
          payment_report_id,
          payment_reports!inner(
            producer_id,
            producers!inner(
              name,
              company
            )
          )
        `)
        .is('sent_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to flatten the structure
      const transformedData = data?.map((n: any) => ({
        id: n.id,
        producer_email: n.producer_email,
        report_id: n.report_id,
        project_name: n.project_name,
        amount_owed: n.amount_owed,
        days_overdue: n.days_overdue,
        producer_name: n.payment_reports?.producers?.name || 'Unknown',
        company_name: n.payment_reports?.producers?.company || 'N/A'
      })) || [];

      setNotifications(transformedData);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error loading notifications",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === notifications.length && notifications.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
      setSelectAll(true);
    }
  };

  const handleSendSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-producer-notifications', {
        body: { notification_ids: Array.from(selectedIds) }
      });

      if (error) throw error;

      toast({
        title: "Emails sent successfully",
        description: `Sent ${data.sent} email${data.sent !== 1 ? 's' : ''}${data.skipped > 0 ? `, skipped ${data.skipped}` : ''}${data.failed > 0 ? `, failed ${data.failed}` : ''}`,
      });

      // Clear selections and refresh
      setSelectedIds(new Set());
      setSelectAll(false);
      onEmailsSent();
      
    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast({
        title: "Error sending emails",
        description: error.message || "Failed to send notification emails",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No pending notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectAll}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label 
            htmlFor="select-all" 
            className="text-sm font-medium cursor-pointer select-none"
          >
            Select All
          </label>
        </div>
        <Button
          onClick={handleSendSelected}
          disabled={selectedIds.size === 0 || sending}
          className="gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send Emails to Selected ({selectedIds.size})
            </>
          )}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount Owed</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(notification.id)}
                    onCheckedChange={() => toggleSelection(notification.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{notification.producer_name}</TableCell>
                <TableCell>{notification.company_name}</TableCell>
                <TableCell className="text-muted-foreground">{notification.producer_email}</TableCell>
                <TableCell>{notification.project_name}</TableCell>
                <TableCell className="text-right">${notification.amount_owed.toLocaleString()}</TableCell>
                <TableCell className="text-right">{notification.days_overdue} days</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
