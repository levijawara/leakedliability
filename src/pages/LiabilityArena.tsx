import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Shield, Send, UserPlus, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createRealtimeChannel } from "@/lib/realtimeHelpers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArenaParticipant {
  id: string;
  participant_name: string;
  participant_email: string;
  is_admin: boolean;
  joined_at: string;
}

interface ArenaMessage {
  id: string;
  participant_name: string;
  participant_email: string;
  message_text: string;
  is_admin: boolean;
  created_at: string;
}

interface ReportData {
  id: string;
  report_id: string;
  current_liable_name: string | null;
  current_liable_email: string | null;
  arena_active: boolean;
  arena_locked: boolean;
}

export default function LiabilityArena() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [participant, setParticipant] = useState<ArenaParticipant | null>(null);
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [messages, setMessages] = useState<ArenaMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  // Name collection form state
  const [showNameForm, setShowNameForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submittingName, setSubmittingName] = useState(false);
  
  // INVITE modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check admin status
  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!reportId) {
      toast({
        title: "Error",
        description: "Report ID is required",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    const loadArena = async () => {
      try {
        setLoading(true);

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to access the liability arena.",
            variant: "destructive",
          });
          navigate(`/auth?liability=initial&report_id=${reportId}`);
          return;
        }

        setCurrentUser(user);
        await checkAdminStatus(user.id);

        // Check for liability entry context
        const liabilityContext = user.user_metadata?.liability_entry_context;
        if (!liabilityContext || (liabilityContext !== 'initial' && liabilityContext !== 'redirect')) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Load report data
        const { data: report, error: reportError } = await supabase
          .from('payment_reports')
          .select('id, report_id, current_liable_name, current_liable_email, arena_active, arena_locked')
          .eq('report_id', reportId)
          .single();

        if (reportError || !report) {
          toast({
            title: "Error",
            description: "Report not found",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setReportData(report as ReportData);

        // Check if user is already a participant
        const { data: existingParticipant } = await supabase
          .from('liability_arena_participants')
          .select('*')
          .eq('report_id', report.id)
          .or(`user_id.eq.${user.id},participant_email.eq.${user.email}`)
          .maybeSingle();

        if (existingParticipant) {
          setParticipant(existingParticipant as ArenaParticipant);
          setShowNameForm(false);
        } else {
          // New participant - show name form
          setShowNameForm(true);
        }

        // Load participants and messages
        await loadParticipants(report.id);
        await loadMessages(report.id);

        // Activate arena if not already active
        if (!report.arena_active) {
          await supabase
            .from('payment_reports')
            .update({ arena_active: true })
            .eq('id', report.id);
        }

        setHasAccess(true);
      } catch (error: any) {
        console.error("Error loading arena:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load arena",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadArena();
  }, [reportId, navigate, toast]);

  // Load participants
  const loadParticipants = async (reportDbId: string) => {
    const { data } = await supabase
      .from('liability_arena_participants')
      .select('*')
      .eq('report_id', reportDbId)
      .order('joined_at', { ascending: true });

    if (data) {
      setParticipants(data as ArenaParticipant[]);
    }
  };

  // Load messages
  const loadMessages = async (reportDbId: string) => {
    const { data } = await supabase
      .from('liability_arena_messages')
      .select('*')
      .eq('report_id', reportDbId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as ArenaMessage[]);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!reportId || !hasAccess || !reportData) return;

    const setupRealtime = async () => {
      // Load report DB ID
      const { data: report } = await supabase
        .from('payment_reports')
        .select('id')
        .eq('report_id', reportId)
        .single();

      if (!report) return;

      // Messages channel
      const messagesChannel = supabase
        .channel(`arena-messages-${report.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'liability_arena_messages',
            filter: `report_id=eq.${report.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as ArenaMessage]);
            setTimeout(() => scrollToBottom(), 100);
            
            // Notify all participants (handled by edge function)
            if (currentUser && payload.new.participant_email !== currentUser.email) {
              // Notification will be sent by backend
            }
          }
        )
        .subscribe();

      // Participants channel
      const participantsChannel = supabase
        .channel(`arena-participants-${report.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'liability_arena_participants',
            filter: `report_id=eq.${report.id}`,
          },
          () => {
            loadParticipants(report.id);
          }
        )
        .subscribe();

      // Report updates channel (for liable name changes)
      const reportChannel = supabase
        .channel(`arena-report-${report.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_reports',
            filter: `id=eq.${report.id}`,
          },
          (payload) => {
            if (payload.new.current_liable_name) {
              setReportData((prev) => ({
                ...prev!,
                current_liable_name: payload.new.current_liable_name,
                current_liable_email: payload.new.current_liable_email,
                arena_locked: payload.new.arena_locked || false,
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(participantsChannel);
        supabase.removeChannel(reportChannel);
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [reportId, hasAccess, reportData, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit name form
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Error",
        description: "Both first and last name are required",
        variant: "destructive",
      });
      return;
    }

    if (!reportId || !currentUser || !reportData) return;

    setSubmittingName(true);
    try {
      // Get report DB ID
      const { data: report } = await supabase
        .from('payment_reports')
        .select('id')
        .eq('report_id', reportId)
        .single();

      if (!report) throw new Error("Report not found");

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Create participant
      const { data: newParticipant, error } = await supabase
        .from('liability_arena_participants')
        .insert({
          report_id: report.id,
          user_id: currentUser.id,
          participant_name: fullName,
          participant_email: currentUser.email!,
          is_admin: isAdmin,
        })
        .select()
        .single();

      if (error) throw error;

      setParticipant(newParticipant as ArenaParticipant);
      setShowNameForm(false);
      await loadParticipants(report.id);
    } catch (error: any) {
      console.error("Error submitting name:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join arena",
        variant: "destructive",
      });
    } finally {
      setSubmittingName(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !participant || !reportId || !reportData) return;
    if (reportData.arena_locked) {
      toast({
        title: "Arena Locked",
        description: "This arena is read-only. The debt has been paid.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Get report DB ID
      const { data: report } = await supabase
        .from('payment_reports')
        .select('id')
        .eq('report_id', reportId)
        .single();

      if (!report) throw new Error("Report not found");

      const { error } = await supabase
        .from('liability_arena_messages')
        .insert({
          report_id: report.id,
          user_id: currentUser?.id || null,
          participant_name: participant.participant_name,
          participant_email: participant.participant_email,
          message_text: newMessage.trim(),
          is_admin: isAdmin,
        });

      if (error) throw error;

      setNewMessage("");
      
      // Trigger notification email to all participants (handled by edge function)
      await supabase.functions.invoke('send-arena-notification', {
        body: {
          report_id: report.id,
          event_type: 'message',
          message_text: newMessage.trim(),
          from_name: participant.participant_name,
        },
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Handle INVITE (redirect)
  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Both name and email are required",
        variant: "destructive",
      });
      return;
    }

    if (!reportId || !participant || !reportData) return;

    setSubmittingInvite(true);
    try {
      // Get report DB ID
      const { data: report } = await supabase
        .from('payment_reports')
        .select('id')
        .eq('report_id', reportId)
        .single();

      if (!report) throw new Error("Report not found");

      // Create redirect record
      const { error: redirectError } = await supabase
        .from('liability_arena_redirects')
        .insert({
          report_id: report.id,
          from_participant_id: participant.id,
          from_participant_name: participant.participant_name,
          from_participant_email: participant.participant_email,
          to_name: inviteName.trim(),
          to_email: inviteEmail.trim(),
        });

      if (redirectError) throw redirectError;

      // Update report with new liable party
      await supabase
        .from('payment_reports')
        .update({
          current_liable_name: inviteName.trim(),
          current_liable_email: inviteEmail.trim(),
        })
        .eq('id', report.id);

      // Send liability notification to new accused
      await supabase.functions.invoke('send-liability-notification', {
        body: {
          report_id: report.id,
          accused_name: inviteName.trim(),
          accused_email: inviteEmail.trim(),
          accused_role: 'producer',
          accuser_id: currentUser?.id || null,
        },
      });

      // Notify all participants
      await supabase.functions.invoke('send-arena-notification', {
        body: {
          report_id: report.id,
          event_type: 'redirect',
          from_name: participant.participant_name,
          to_name: inviteName.trim(),
          to_email: inviteEmail.trim(),
        },
      });

      toast({
        title: "Redirect Sent",
        description: `Liability redirected to ${inviteName.trim()}. They will receive a notification email.`,
      });

      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to redirect liability",
        variant: "destructive",
      });
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Handle RESOLVE (escrow)
  const handleResolve = () => {
    if (!reportId) return;
    navigate(`/escrow/initiate?report_id=${reportId}&from_arena=true`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center pt-24 md:pt-28">
          <Card className="w-full max-w-2xl">
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-center text-muted-foreground">Loading liability arena...</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center pt-24 md:pt-28 px-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-6 w-6" />
                403: Liability Arena Not Accessible
              </CardTitle>
              <CardDescription>
                You don't have permission to access the liability arena.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This page is only accessible to users who entered the platform through 
                  liability notification emails and have completed email verification.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate("/")} className="mt-4">
                Return to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Name collection form
  if (showNameForm) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background pt-20 md:pt-24">
          <div className="container max-w-2xl mx-auto px-4 py-12">
            <Card>
              <CardHeader>
                <CardTitle>Join Liability Arena</CardTitle>
                <CardDescription>
                  Please provide your name to join this liability resolution chat.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={submittingName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={submittingName}
                    />
                  </div>
                  <Button type="submit" disabled={submittingName} className="w-full">
                    {submittingName ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-20 md:pt-24">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              So, who's ACTUALLY liable?
            </h1>
            {reportData && (
              <>
                <p className="text-xl font-semibold mb-2">
                  Report ID: {reportData.report_id}
                </p>
                <p className="text-lg text-muted-foreground">
                  Currently liable (as stated by crew, vendor, or redirecting producer/company):{' '}
                  <span className="font-semibold text-foreground">
                    {reportData.current_liable_name || 'Not specified'}
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {reportData && !reportData.arena_locked && (
            <div className="flex gap-4 mb-6">
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <UserPlus className="mr-2 h-4 w-4" />
                    INVITE
                    <span className="ml-2 text-xs text-muted-foreground">(REDIRECT LIABILITY)</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Redirect Liability</DialogTitle>
                    <DialogDescription>
                      Invite someone else who is actually responsible for this debt.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="inviteName">Name of the newly accused *</Label>
                      <Input
                        id="inviteName"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Full name"
                        required
                        disabled={submittingInvite}
                      />
                    </div>
                    <div>
                      <Label htmlFor="inviteEmail">Email *</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        disabled={submittingInvite}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleInvite}
                      disabled={submittingInvite || !inviteName.trim() || !inviteEmail.trim()}
                    >
                      {submittingInvite ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Submit Redirect"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button onClick={handleResolve} className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" />
                RESOLVE
                <span className="ml-2 text-xs opacity-80">(PAY REPORTED DEBT)</span>
              </Button>
            </div>
          )}

          {reportData?.arena_locked && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This arena is read-only. The debt has been paid and resolved.
              </AlertDescription>
            </Alert>
          )}

          {/* Chat Area */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                {participants.length} participant{participants.length !== 1 ? 's' : ''} in this arena
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isCurrentUser = message.participant_email === currentUser?.email;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-4 py-2 ${
                              message.is_admin
                                ? 'bg-red-500 text-white'
                                : isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm font-medium mb-1">
                              {message.is_admin ? 'LL™ Admin' : message.participant_name}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.message_text}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatTime(message.created_at)} • {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Input */}
          {reportData && !reportData.arena_locked && participant && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="lg"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
