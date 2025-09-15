import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, CheckCircle, XCircle, Camera, ArrowUpCircle } from "lucide-react";
import { ClaimRow } from "@/types/claims";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/lib/formatters";

interface ClaimsTableProps {
  rows: ClaimRow[];
  isLoading: boolean;
  onView: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onMoveToReview?: (id: string) => void;
  showClubColumn?: boolean;
}

const getPlayerName = (claim: ClaimRow) => {
  if (claim.player_first_name || claim.player_last_name) {
    return `${claim.player_first_name || ''} ${claim.player_last_name || ''}`.trim();
  }
  return claim.player_email;
};

export function ClaimsTable({ 
  rows, 
  isLoading, 
  onView,
  onApprove,
  onReject,
  onMoveToReview,
  showClubColumn = true
}: ClaimsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border rounded animate-pulse">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="hidden md:table-cell">Competition</TableHead>
            {showClubColumn && <TableHead className="hidden lg:table-cell">Club</TableHead>}
            <TableHead>Hole</TableHead>
            <TableHead>Claim Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Photos</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showClubColumn ? 8 : 7} className="text-center py-8 text-muted-foreground">
                No claims found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{getPlayerName(claim)}</div>
                    <div className="text-xs text-muted-foreground">{claim.player_email}</div>
                    <div className="text-xs text-muted-foreground md:hidden">
                      {claim.competition_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{claim.competition_name}</TableCell>
                {showClubColumn && (
                  <TableCell className="hidden lg:table-cell">{claim.club_name}</TableCell>
                )}
                <TableCell>
                  <Badge variant="outline">
                    Hole {claim.hole_number || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDate(claim.created_at, 'short')}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={claim.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{claim.photos_count || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(claim.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    
                    {/* Admin actions */}
                    {onApprove && onReject && claim.status !== 'verified' && claim.status !== 'rejected' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onApprove(claim.id)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReject(claim.id)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                      </>
                    )}
                    
                    {/* Club action */}
                    {onMoveToReview && claim.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMoveToReview(claim.id)}
                        className="flex items-center gap-1 text-sky-600 hover:text-sky-700"
                      >
                        <ArrowUpCircle className="w-3 h-3" />
                        <span className="hidden sm:inline">Review</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}