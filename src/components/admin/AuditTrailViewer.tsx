import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/lib/formatters';
import { FileText, History } from 'lucide-react';

interface AuditEvent {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
  user_id?: string;
  user_name?: string;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  created_by_name?: string;
}

interface AuditTrailViewerProps {
  entityType: string;
  entityId: string;
}

export const AuditTrailViewer = ({ entityType, entityId }: AuditTrailViewerProps) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditTrail();
  }, [entityType, entityId]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);

      // Fetch audit events
      const { data: auditData, error: auditError } = await supabase
        .from('audit_events')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditError) throw auditError;

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notesError) throw notesError;

      setEvents(auditData || []);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allItems = [
    ...events.map(e => ({ ...e, type: 'event' as const })),
    ...notes.map(n => ({ ...n, type: 'note' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Audit Trail & Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No audit trail or notes available</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {allItems.map((item) => (
                <div 
                  key={`${item.type}-${item.id}`} 
                  className="border-l-2 border-primary/20 pl-4 pb-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'event' ? (
                        <Badge variant="outline" className="text-xs">
                          {(item as AuditEvent).action}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {(item as Note).note_type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  
                  {item.type === 'note' ? (
                    <div>
                      <p className="text-sm">{(item as Note).content}</p>
                      {(item as Note).created_by_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {(item as Note).created_by_name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <p className="font-medium">{(item as AuditEvent).entity_type}</p>
                      {(item as AuditEvent).new_values && (
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify((item as AuditEvent).new_values, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
