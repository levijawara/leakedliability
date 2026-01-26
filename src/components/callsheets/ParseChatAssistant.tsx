import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ExistingContact {
  id: string;
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParseChatAssistantProps {
  callSheetId: string;
  fileName: string;
  parsedContacts: ParsedContact[];
  excludedIndices: Set<number>;
  existingContacts: ExistingContact[];
  onExclude: (indices: number[]) => void;
  onInclude: (indices: number[]) => void;
  onSaveAll: () => void;
}

export function ParseChatAssistant({
  callSheetId,
  fileName,
  parsedContacts,
  excludedIndices,
  existingContacts,
  onExclude,
  onInclude,
  onSaveAll,
}: ParseChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-chat-assistant', {
        body: {
          call_sheet_id: callSheetId,
          original_file_name: fileName,
          parsed_contacts: parsedContacts,
          excluded_indices: Array.from(excludedIndices),
          existing_contacts: existingContacts.map(c => ({
            name: c.name,
            emails: c.emails,
            phones: c.phones,
          })),
          user_message: userMessage,
        },
      });

      if (error) throw error;

      // Handle AI response
      const response = data?.response || "I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);

      // Handle tool calls (exclusions/inclusions)
      if (data?.actions) {
        for (const action of data.actions) {
          if (action.type === 'exclude' && action.indices) {
            onExclude(action.indices);
          } else if (action.type === 'include' && action.indices) {
            onInclude(action.indices);
          } else if (action.type === 'save_all') {
            onSaveAll();
          }
        }
      }
    } catch (error: any) {
      console.error('[ParseChatAssistant] Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Something went wrong. Try again.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Check duplicates', message: 'Who matches my existing contacts?' },
    { label: 'Missing emails?', message: 'Which contacts are missing email addresses?' },
    { label: 'Save all', message: 'Save everyone' },
  ];

  const handleQuickAction = (message: string) => {
    setInput(message);
    inputRef.current?.focus();
  };

  const includedCount = parsedContacts.length - excludedIndices.size;

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Need help?</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-card border rounded-lg shadow-xl flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">LL Chat</span>
              <span className="text-xs text-muted-foreground">
                • {includedCount} included
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Tell me who to exclude, or ask about the parsed contacts.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickAction(action.message)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-3 py-2 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Exclude Blake... or ask anything"
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
