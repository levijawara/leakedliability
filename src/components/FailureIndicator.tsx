/**
 * Failure Indicator Component
 * 
 * Displays a subtle indicator when background systems are failing.
 * Only visible in development or for admin users.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFailureTracking } from "@/lib/failureTracking";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getRLSViolationsSummary, validateRLSAssumptions, type RLSValidationResult } from "@/lib/rlsValidation";

export function FailureIndicator() {
  const { failures, failuresByType, hasRecentFailures, clear } = useFailureTracking();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Check if user is admin (only show to admins or in dev)
  useEffect(() => {
    if (!import.meta.env.DEV) {
      const checkAdmin = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.rpc('has_role', { 
              _user_id: user.id, 
              _role: 'admin' 
            });
            setIsAdmin(!!data);
          }
        } catch {
          // Ignore errors
        }
      };
      checkAdmin();
    } else {
      setIsAdmin(true); // Always show in dev
    }
  }, []);

  // Listen for new failures
  useEffect(() => {
    const handleFailure = () => {
      // Show indicator when new failure occurs
      if (!showDetails) {
        setShowDetails(true);
      }
    };

    window.addEventListener('system-failure', handleFailure);
    return () => window.removeEventListener('system-failure', handleFailure);
  }, [showDetails]);

  // Check for RLS violations on mount and periodically
  useEffect(() => {
    const checkRLS = async () => {
      const results = await validateRLSAssumptions();
      const summary = getRLSViolationsSummary(results);
      if (summary.hasViolations) {
        setRlsViolations(summary.violations);
        if (!showDetails) {
          setShowDetails(true);
        }
      }
    };

    checkRLS();
    // Re-check every 5 minutes
    const interval = setInterval(checkRLS, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showDetails]);

  // Don't show if not admin and not in dev
  if (!isAdmin && !import.meta.env.DEV) {
    return null;
  }

  const recentAnalyticsFailures = hasRecentFailures('analytics', 300000); // 5 minutes
  const recentRealtimeFailures = hasRecentFailures('realtime', 300000);
  const recentRoleFailures = hasRecentFailures('role_check', 300000);

  const hasAnyRecentFailures = recentAnalyticsFailures || recentRealtimeFailures || recentRoleFailures;
  const hasRlsViolations = rlsViolations.length > 0;

  if (!hasAnyRecentFailures && failures.length === 0 && !hasRlsViolations) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {!expanded ? (
        // Collapsed indicator
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(true)}
          className="bg-status-warning/10 border-status-warning/50 text-status-warning hover:bg-status-warning/20"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          System Issues
          <div className="flex gap-1 ml-2">
            {failures.length > 0 && (
              <Badge variant="destructive">
                {failures.length}
              </Badge>
            )}
            {hasRlsViolations && (
              <Badge variant="outline" className="border-status-warning text-status-warning">
                RLS: {rlsViolations.length}
              </Badge>
            )}
          </div>
        </Button>
      ) : (
        // Expanded details
        <Card className="border-status-warning/50 bg-card shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                System Failures
              </CardTitle>
              <div className="flex gap-2">
                {failures.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(false)}
                  className="h-6 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {failures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent failures</p>
            ) : (
              <>
                <div className="space-y-2">
                  {hasRlsViolations && (
                    <div className="border border-status-warning/50 rounded p-2 bg-status-warning/10">
                      <Badge variant="outline" className="mb-2 border-status-warning text-status-warning">
                        RLS Violations ({rlsViolations.length})
                      </Badge>
                      <p className="text-xs text-muted-foreground mb-2">
                        Tables/views have unexpected access permissions. Pages may appear empty.
                      </p>
                      <div className="space-y-1">
                        {rlsViolations.map((v, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{v.assumption.tableOrView}:</span>{' '}
                            <span className="text-muted-foreground">
                              {v.assumption.shouldBeAccessible 
                                ? 'Expected public access but blocked'
                                : 'Should be blocked but is accessible'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {failuresByType('analytics').length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Analytics ({failuresByType('analytics').length})
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Visit tracking may be failing
                      </p>
                    </div>
                  )}
                  {failuresByType('realtime').length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Realtime ({failuresByType('realtime').length})
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Live updates may not be working
                      </p>
                    </div>
                  )}
                  {failuresByType('role_check').length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Role Checks ({failuresByType('role_check').length})
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Admin role verification may be failing
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-2">
                  <p className="text-xs font-semibold mb-2">Recent Failures:</p>
                  <div className="space-y-1 text-xs">
                    {failures.slice(0, 5).map((failure, idx) => (
                      <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                        <div className="font-medium">{failure.component}</div>
                        <div className="text-muted-foreground truncate">
                          {failure.error}
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-1">
                          {new Date(failure.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

