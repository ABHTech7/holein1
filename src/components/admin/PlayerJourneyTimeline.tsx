import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, CreditCard, Clock, CheckCircle, AlertTriangle, Eye, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  type: 'signup' | 'entry' | 'payment' | 'claim' | 'outcome' | 'note';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: any;
}

interface PlayerJourneyTimelineProps {
  playerId: string;
  playerData?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  };
}

const PlayerJourneyTimeline = ({ playerId, playerData }: PlayerJourneyTimelineProps) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    fetchPlayerJourney();
  }, [playerId]);

  const fetchPlayerJourney = async () => {
    try {
      setLoading(true);
      const timelineEvents: TimelineEvent[] = [];

      // Add signup event
      if (playerData) {
        timelineEvents.push({
          id: 'signup',
          type: 'signup',
          title: 'Player Signed Up',
          description: `Registered with email: ${playerData.email}`,
          timestamp: playerData.created_at,
          status: 'success'
        });
      }

      // Fetch entries
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          *,
          competitions!inner(name, entry_fee, clubs!inner(name))
        `)
        .eq('player_id', playerId)
        .order('entry_date', { ascending: false });

      if (!entriesError && entries) {
        entries.forEach(entry => {
          // Entry event
          timelineEvents.push({
            id: `entry-${entry.id}`,
            type: 'entry',
            title: 'Competition Entry',
            description: `Entered ${(entry.competitions as any).name} at ${(entry.competitions as any).clubs.name}`,
            timestamp: entry.entry_date,
            status: entry.paid ? 'success' : 'warning',
            metadata: { entryId: entry.id, paid: entry.paid, fee: (entry.competitions as any).entry_fee }
          });

          // Payment event (if paid)
          if (entry.paid && entry.payment_date) {
            timelineEvents.push({
              id: `payment-${entry.id}`,
              type: 'payment',
              title: 'Payment Received',
              description: `Payment of £${((entry.competitions as any).entry_fee / 100).toFixed(2)} processed`,
              timestamp: entry.payment_date,
              status: 'success',
              metadata: { entryId: entry.id, amount: (entry.competitions as any).entry_fee }
            });
          }

          // Outcome events
          if (entry.outcome_self) {
            timelineEvents.push({
              id: `outcome-self-${entry.id}`,
              type: 'outcome',
              title: 'Self-Reported Outcome',
              description: `Player reported: ${entry.outcome_self}`,
              timestamp: entry.outcome_reported_at || entry.entry_date,
              status: entry.outcome_self.toLowerCase().includes('hole') ? 'success' : 'info',
              metadata: { entryId: entry.id, outcome: entry.outcome_self }
            });
          }

          if (entry.outcome_official && entry.outcome_official !== entry.outcome_self) {
            timelineEvents.push({
              id: `outcome-official-${entry.id}`,
              type: 'outcome',
              title: 'Official Outcome',
              description: `Official result: ${entry.outcome_official}`,
              timestamp: entry.completed_at || entry.entry_date,
              status: entry.outcome_official.toLowerCase().includes('hole') ? 'success' : 'info',
              metadata: { entryId: entry.id, outcome: entry.outcome_official }
            });
          }
        });
      }

      // Fetch claims
      const { data: claims, error: claimsError } = await supabase
        .from('claims')
        .select(`
          *,
          entries!inner(
            competitions!inner(name, clubs!inner(name))
          )
        `)
        .eq('entries.player_id', playerId)
        .order('claim_date', { ascending: false });

      if (!claimsError && claims) {
        claims.forEach(claim => {
          let status: 'success' | 'warning' | 'error' | 'info' = 'warning';
          let title = 'Hole-in-One Claim';
          
          if (claim.status === 'VERIFIED') {
            status = 'success';
            title = 'Claim Verified ✓';
          } else if (claim.status === 'REJECTED') {
            status = 'error';
            title = 'Claim Rejected';
          }

          timelineEvents.push({
            id: `claim-${claim.id}`,
            type: 'claim',
            title,
            description: `Hole ${claim.hole_number} at ${(claim.entries as any).competitions.clubs.name}`,
            timestamp: claim.claim_date,
            status,
            metadata: { 
              claimId: claim.id, 
              hole: claim.hole_number, 
              status: claim.status,
              hasPhotos: claim.photo_urls && claim.photo_urls.length > 0
            }
          });
        });
      }

      // Fetch notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', 'player')
        .eq('entity_id', playerId)
        .order('created_at', { ascending: false });

      if (!notesError && notes) {
        notes.forEach(note => {
          timelineEvents.push({
            id: `note-${note.id}`,
            type: 'note',
            title: note.note_type === 'audit' ? 'System Update' : 'Admin Note',
            description: note.content,
            timestamp: note.created_at,
            status: 'info',
            metadata: { noteType: note.note_type, createdBy: note.created_by_name }
          });
        });
      }

      // Sort events by timestamp (newest first)
      timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(timelineEvents);

    } catch (error) {
      console.error('Error fetching player journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case 'signup': return User;
      case 'entry': return Trophy;
      case 'payment': return CreditCard;
      case 'claim': return status === 'success' ? CheckCircle : AlertTriangle;
      case 'outcome': return status === 'success' ? CheckCircle : Eye;
      case 'note': return Mail;
      default: return Clock;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Player Journey Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Player Journey Timeline ({events.length} events)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No journey events found for this player.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = getEventIcon(event.type, event.status);
              const isLast = index === events.length - 1;
              
              return (
                <div key={event.id} className="relative flex gap-4 items-start">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 top-8 w-0.5 h-12 bg-border" />
                  )}
                  
                  {/* Event icon */}
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 relative z-10",
                    getStatusColor(event.status)
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Event content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        
                        {/* Event metadata */}
                        {event.metadata && (
                          <div className="flex gap-2 mt-2">
                            {event.type === 'entry' && !event.metadata.paid && (
                              <Badge variant="destructive" className="text-xs">
                                Unpaid
                              </Badge>
                            )}
                            {event.type === 'claim' && event.metadata.hasPhotos && (
                              <Badge variant="secondary" className="text-xs">
                                Photos Available
                              </Badge>
                            )}
                            {event.type === 'note' && event.metadata.noteType === 'audit' && (
                              <Badge variant="outline" className="text-xs">
                                System Generated
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerJourneyTimeline;