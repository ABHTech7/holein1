import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Building, Mail, Phone, MapPin, Trophy, FileText, PoundSterling, Plus, Save, Calendar, ArrowLeft, Edit2, Check, X, Upload, Shield, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency } from "@/lib/formatters";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import ClubCommissionSection from "@/components/admin/ClubCommissionSection";
import ClubBankDetailsSection from "@/components/admin/ClubBankDetailsSection";
import NewClubUserModal from "@/components/admin/NewClubUserModal";
import { useAuth } from "@/hooks/useAuth";
import { trackClubChanges } from "@/lib/auditTracker";

interface Club {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  archived: boolean;
  created_at: string;
  logo_url: string | null;
  contract_signed: boolean;
  contract_url: string | null;
  contract_signed_date: string | null;
  contract_signed_by_name: string | null;
  contract_signed_by_email: string | null;
}

interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  entry_fee: number;
  commission_amount: number;
  status: string;
  total_entries: number;
  total_revenue: number;
  total_commission: number;
  archived: boolean;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  immutable?: boolean;
}

const ClubDetailPage = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<Club | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [tempCommissionRate, setTempCommissionRate] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [clubUsers, setClubUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    active: true
  });

  // Calculate activation status based on contract state
  const getActivationStatus = () => {
    if (!club) return "Pending";
    
    // Club is active if:
    // 1. Contract is signed, OR
    // 2. Contract file is uploaded, OR  
    // 3. Admin has manually set active=true AND contract is signed
    const hasContract = club.contract_url || club.contract_signed;
    const isManuallyActive = club.active && club.contract_signed;
    
    if (hasContract || isManuallyActive) {
      return "Active";
    }
    
    return "Pending";
  };

  useEffect(() => {
    if (clubId) {
      fetchClubDetails();
    }
  }, [clubId]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;

      setClub(clubData);
      setFormData({
        name: clubData.name || "",
        address: clubData.address || "",
        email: clubData.email || "",
        phone: clubData.phone || "",
        website: clubData.website || "",
        active: clubData.active
      });

      // Fetch competitions with commission rates
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (competitionsError) throw competitionsError;

      // Get entries for each competition and calculate commission
      const competitionsWithStats = await Promise.all(
        (competitionsData || []).map(async (competition) => {
          const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('id, paid')
            .eq('competition_id', competition.id);

          if (entriesError) {
            console.error('Error fetching entries:', entriesError);
          }

          const totalEntries = entries?.length || 0;
          const paidEntries = entries?.filter(entry => entry.paid).length || 0;
          const totalRevenue = paidEntries * (parseFloat(competition.entry_fee?.toString() || '0'));
          const commissionAmount = parseFloat(competition.commission_amount?.toString() || '0');
          const totalCommission = paidEntries * commissionAmount;

          return {
            ...competition,
            total_entries: totalEntries,
            total_revenue: totalRevenue,
            total_commission: totalCommission
          };
        })
      );

      setCompetitions(competitionsWithStats);

      // Fetch notes from database
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', 'club')
        .eq('entity_id', clubId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Error fetching notes:', notesError);
      }

      const formattedNotes = notesData?.map(note => ({
        id: note.id,
        content: note.content,
        created_at: note.created_at,
        created_by: note.created_by_name || 'Unknown User',
        immutable: note.immutable
      })) || [];
      
      setNotes(formattedNotes);

      // Fetch club users
      await fetchClubUsers();

    } catch (error) {
      console.error('Error fetching club details:', error);
      toast({
        title: "Error",
        description: "Failed to load club details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClubUsers = async () => {
    if (!clubId) return;
    
    try {
      setLoadingUsers(true);
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('club_id', clubId)
        .eq('role', 'CLUB');

      if (error) throw error;
      setClubUsers(users || []);
    } catch (error) {
      console.error('Error fetching club users:', error);
      toast({
        title: "Error",
        description: "Failed to load club users.",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const addAuditNote = async (auditNote: any) => {
    if (auditNote) {
      setNotes(prev => [auditNote, ...prev]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const oldData = club;
      const newData = formData;

      const { error } = await supabase
        .from('clubs')
        .update({
          name: formData.name,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          active: formData.active
        })
        .eq('id', clubId);

      if (error) throw error;

      // Track changes with audit system
      if (oldData && clubId) {
        const auditNote = await trackClubChanges(clubId, oldData, newData, user?.id);
        if (auditNote) {
          await addAuditNote(auditNote);
        }
      }

      setClub(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);

      toast({
        title: "Success",
        description: "Club details updated successfully.",
      });
    } catch (error) {
      console.error('Error saving club:', error);
      toast({
        title: "Error",
        description: "Failed to save club details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCommissionEdit = (competitionId: string, currentRate: number) => {
    setEditingCommission(competitionId);
    // Convert from pence to pounds for display
    setTempCommissionRate((currentRate / 100).toFixed(2));
  };

  const handleCommissionSave = async (competitionId: string) => {
    try {
      const newRateInPounds = parseFloat(tempCommissionRate);
      if (isNaN(newRateInPounds) || newRateInPounds < 0) {
        toast({
          title: "Error",
          description: "Please enter a valid commission rate",
          variant: "destructive"
        });
        return;
      }

      // Convert to pence for storage
      const newRateInPence = Math.round(newRateInPounds * 100);
      const competition = competitions.find(c => c.id === competitionId);
      if (!competition) return;

      const { error } = await supabase
        .from('competitions')
        .update({ commission_amount: newRateInPence })
        .eq('id', competitionId);

      if (error) throw error;

      // Update local state
      setCompetitions(prev => prev.map(comp => {
        if (comp.id === competitionId) {
          const updatedComp = { ...comp, commission_amount: newRateInPence };
          // Recalculate commission with new amount in pence
          const paidEntries = Math.round(comp.total_revenue / comp.entry_fee) || 0;
          updatedComp.total_commission = paidEntries * newRateInPence;
          return updatedComp;
        }
        return comp;
      }));

      setEditingCommission(null);
      setTempCommissionRate("");

      // Add audit note for commission change
      const oldRateInPounds = (competition.commission_amount / 100).toFixed(2);
      const auditNote = await trackClubChanges(
        clubId!,
        { ...club, commission_change: `${competition.name}: £${oldRateInPounds}` },
        { ...club, commission_change: `${competition.name}: £${newRateInPounds.toFixed(2)}` },
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      toast({
        title: "Success",
        description: "Commission rate updated successfully",
      });
    } catch (error) {
      console.error('Error updating commission rate:', error);
      toast({
        title: "Error",
        description: "Failed to update commission rate",
        variant: "destructive"
      });
    }
  };

  const handleCommissionCancel = () => {
    setEditingCommission(null);
    setTempCommissionRate("");
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clubId) return;

    setUploadingLogo(true);

    try {
      // Debug auth state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth debug - upload session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userRole: profile?.role,
        sessionError 
      });

      if (!session) {
        throw new Error('Authentication session expired. Please log in again.');
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${clubId}-${Date.now()}.${fileExt}`;

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('club-logos')
        .getPublicUrl(fileName);

      // Force a token refresh before the update operation
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh failed:', refreshError);
      }

      // Update the club record with the logo URL
      const { error: updateError } = await supabase
        .from('clubs')
        .update({ logo_url: publicUrl })
        .eq('id', clubId);

      if (updateError) {
        console.error('Error updating club logo URL:', updateError);
        if (updateError.code === '42501') {
          throw new Error('Permission denied. Your session may have expired. Please refresh the page and try again.');
        }
        throw new Error(`Failed to update club record: ${updateError.message}`);
      }

      // Update local state
      setClub(prev => prev ? { ...prev, logo_url: publicUrl } : null);

      // Track logo upload
      const auditNote = await trackClubChanges(
        clubId, 
        { ...club, logo_url: club?.logo_url || null }, 
        { ...club, logo_url: publicUrl }, 
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      toast({
        title: "Success",
        description: "Club logo uploaded successfully.",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Permission Error", 
        description: `Failed to upload logo: ${errorMessage}. Please check your permissions.`,
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!clubId || !club?.logo_url) return;

    setUploadingLogo(true);

    try {
      // Debug auth state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth debug - session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userRole: profile?.role,
        sessionError 
      });

      if (!session) {
        throw new Error('Authentication session expired. Please log in again.');
      }

      // Extract filename from URL
      const url = new URL(club.logo_url);
      const fileName = url.pathname.split('/').pop();

      if (fileName) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('club-logos')
          .remove([fileName]);

        if (deleteError) {
          console.warn('Failed to delete file from storage:', deleteError);
        }
      }

      // Force a token refresh before the update operation
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Token refresh failed:', refreshError);
      } else {
        console.log('Token refreshed successfully');
      }

      // Update the club record to remove logo URL with proper error handling
      const { error: updateError } = await supabase
        .from('clubs')
        .update({ logo_url: null })
        .eq('id', clubId);

      if (updateError) {
        console.error('Error deleting logo:', updateError);
        if (updateError.code === '42501') {
          throw new Error('Permission denied. Your session may have expired. Please refresh the page and try again.');
        }
        throw new Error(`Failed to update club record: ${updateError.message}`);
      }

      // Update local state
      setClub(prev => prev ? { ...prev, logo_url: null } : null);

      // Track logo deletion
      const auditNote = await trackClubChanges(
        clubId, 
        { ...club, logo_url: club.logo_url }, 
        { ...club, logo_url: null }, 
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      toast({
        title: "Success",
        description: "Club logo removed successfully.",
      });

    } catch (error) {
      console.error('Error deleting logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Permission Error",
        description: `Failed to remove logo: ${errorMessage}. Please check your permissions.`,
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clubId) return;

    setUploadingContract(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${clubId}-contract-${Date.now()}.${fileExt}`;

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-contracts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL (even though bucket is private, we still get the URL for authorized access)
      const { data: { publicUrl } } = supabase.storage
        .from('club-contracts')
        .getPublicUrl(fileName);

      // Update contract URL first
      const { error: urlError } = await supabase
        .from('clubs')
        .update({ contract_url: publicUrl })
        .eq('id', clubId);

      if (urlError) throw urlError;

      // Mark contract as signed using secure RPC
      const { error: statusError } = await supabase
        .rpc('update_club_contract_status', {
          p_club_id: clubId,
          p_signed: true,
          p_signed_by_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Unknown',
          p_signed_by_email: user?.email || null
        });

      if (statusError) throw statusError;

      // Update local state
      setClub(prev => prev ? { 
        ...prev, 
        contract_url: publicUrl,
        contract_signed: true,
        contract_signed_date: new Date().toISOString(),
        contract_signed_by_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Unknown',
        contract_signed_by_email: user?.email || null
      } : null);

      // Track contract upload
      const auditNote = await trackClubChanges(
        clubId, 
        { ...club, contract_signed: club?.contract_signed || false }, 
        { ...club, contract_signed: true }, 
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      toast({
        title: "Success",
        description: "Contract uploaded and marked as signed successfully.",
      });

    } catch (error) {
      console.error('Error uploading contract:', error);
      toast({
        title: "Error",
        description: "Failed to upload contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const handleContractDelete = async () => {
    if (!clubId || !club?.contract_url) return;

    setUploadingContract(true);

    try {
      // Extract filename from URL
      const url = new URL(club.contract_url);
      const fileName = url.pathname.split('/').pop();

      if (fileName) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('club-contracts')
          .remove([fileName]);

        if (deleteError) {
          console.warn('Failed to delete file from storage:', deleteError);
        }
      }

      // Update the club record to remove contract URL and reset signed status
      const { error: updateError } = await supabase
        .from('clubs')
        .update({ 
          contract_url: null,
          contract_signed: false,
          contract_signed_date: null,
          contract_signed_by_name: null,
          contract_signed_by_email: null
        })
        .eq('id', clubId);

      if (updateError) throw updateError;

      // Update local state
      setClub(prev => prev ? { 
        ...prev, 
        contract_url: null,
        contract_signed: false,
        contract_signed_date: null,
        contract_signed_by_name: null,
        contract_signed_by_email: null
      } : null);

      // Track contract deletion
      const auditNote = await trackClubChanges(
        clubId, 
        { ...club, contract_signed: true }, 
        { ...club, contract_signed: false }, 
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      toast({
        title: "Success",
        description: "Contract removed successfully.",
      });

    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: "Failed to remove contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const handleContractSignedToggle = async (checked: boolean) => {
    if (!clubId) {
      console.error('🚨 [CONTRACT_TOGGLE] No clubId available');
      return;
    }

    console.log('🔄 [CONTRACT_TOGGLE] Starting toggle:', {
      clubId,
      newStatus: checked,
      currentStatus: club?.contract_signed,
      userId: user?.id,
      userRole: profile?.role,
      clubData: {
        id: club?.id,
        name: club?.name,
        active: club?.active,
        contract_url: club?.contract_url
      }
    });

    setUploadingContract(true);

    const doUpdate = async () => {
      console.log('📊 [CONTRACT_TOGGLE] Using secure RPC function');

      // Use secure RPC function to update contract status
      const { error: updateError } = await supabase
        .rpc('update_club_contract_status', {
          p_club_id: clubId,
          p_signed: checked,
          p_signed_by_name: checked ? (`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Unknown') : null,
          p_signed_by_email: checked ? (user?.email || null) : null
        });

      if (updateError) {
        console.error('🚨 [CONTRACT_TOGGLE] RPC update failed:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log('✅ [CONTRACT_TOGGLE] RPC update successful');

      // Update local state
      setClub(prev => prev ? { 
        ...prev, 
        contract_signed: checked,
        contract_signed_date: checked ? new Date().toISOString() : null,
        contract_signed_by_name: checked ? (`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Unknown') : null,
        contract_signed_by_email: checked ? (user?.email || null) : null
      } : null);

      // Track contract status change
      const auditNote = await trackClubChanges(
        clubId, 
        { ...club, contract_signed: !checked }, 
        { ...club, contract_signed: checked }, 
        user?.id
      );
      if (auditNote) {
        await addAuditNote(auditNote);
      }

      console.log('🎉 [CONTRACT_TOGGLE] Complete success');

      toast({
        title: "Success",
        description: `Contract marked as ${checked ? 'signed' : 'not signed'} successfully.`,
      });
    };

    try {
      // Ensure we have a valid authenticated session before proceeding
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.warn('⚠️ [CONTRACT_TOGGLE] getSession error:', sessionErr);
      }
      if (!sessionData?.session) {
        console.warn('🚫 [CONTRACT_TOGGLE] No active session found');
        toast({
          title: 'Session expired',
          description: 'Please sign in again to update the contract status.',
          variant: 'destructive'
        });
        return;
      }

      // Probe current DB role for diagnostics
      try {
        const { data: currentRole, error: roleErr } = await supabase.rpc('get_current_user_role');
        if (roleErr) console.warn('⚠️ [CONTRACT_TOGGLE] Role probe error:', roleErr);
        console.log('🪪 [CONTRACT_TOGGLE] Current DB role:', currentRole);
      } catch (e) {
        console.warn('⚠️ [CONTRACT_TOGGLE] Role probe failed:', e);
      }

      // First attempt
      await doUpdate();

    } catch (error: any) {
      // If permission issue, try a one-time refresh + retry
      const msg: string = error?.message?.toLowerCase?.() || '';
      const isPermissionDenied = msg.includes('permission denied') || error?.code === '42501';

      if (isPermissionDenied) {
        console.warn('🔁 [CONTRACT_TOGGLE] Permission denied, attempting session refresh and retry...');
        try {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr) {
            console.error('🚨 [CONTRACT_TOGGLE] refreshSession error:', refreshErr);
            throw error; // keep original
          }

          // Re-probe role after refresh
          try {
            const { data: currentRole2 } = await supabase.rpc('get_current_user_role');
            console.log('🪪 [CONTRACT_TOGGLE] Role after refresh:', currentRole2);
          } catch {}

          await doUpdate();
          return; // success after retry
        } catch (retryErr: any) {
          console.error('🚨 [CONTRACT_TOGGLE] Retry failed:', retryErr);
          // Attempt RLS probe in dev to surface details
          try {
            const mod = await import('@/lib/rlsProbe');
            await mod.probeRLS('ContractToggleRetry');
          } catch {}
          // Fall through to show error toast
          error = retryErr;
        }
      }

      console.error('🚨 [CONTRACT_TOGGLE] Full error details:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });

      let errorMessage = 'Failed to update contract status. Please try again.';
      if (error?.message) {
        errorMessage = `Database error: ${error.message}`;
        if (error.details) errorMessage += ` Details: ${error.details}`;
        if (error.hint) errorMessage += ` Hint: ${error.hint}`;
      }
      if (isPermissionDenied) {
        errorMessage += ' Your account may not have the required permissions, or your profile record is missing. Try reloading and ensure your profile has ADMIN role.';
      }

      toast({
        title: 'Contract Update Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !user || !clubId) return;

    try {
      // Get user's full name
      const userFullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email : user.email;

      const { data: noteData, error } = await supabase
        .from('notes')
        .insert({
          entity_type: 'club',
          entity_id: clubId,
          content: newNote,
          created_by: user.id,
          created_by_name: userFullName,
          immutable: false,
          note_type: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      const note: Note = {
        id: noteData.id,
        content: noteData.content,
        created_at: noteData.created_at,
        created_by: noteData.created_by_name,
        immutable: false
      };

      setNotes(prev => [note, ...prev]);
      setNewNote("");
      
      toast({
        title: "Note Added",
        description: "Note has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading || !club) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Section>
      </div>
    );
  }

  const totalRevenue = competitions.reduce((sum, comp) => sum + comp.total_revenue, 0);
  const totalCommission = competitions.reduce((sum, comp) => sum + comp.total_commission, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/admin/clubs')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Clubs
              </Button>
              <div className="flex items-center gap-4">
                {club.logo_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-background flex items-center justify-center border border-border/20">
                    <img 
                      src={club.logo_url} 
                      alt={`${club.name} logo`} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('Logo failed to load:', club.logo_url);
                        console.error('Image error event:', e);
                        // Hide the broken image
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Logo loaded successfully:', club.logo_url);
                      }}
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{club.name}</h1>
                  <p className="text-muted-foreground">Club Details & Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={getActivationStatus() === "Active" ? "default" : "outline"}>
                {getActivationStatus()}
              </Badge>
              {editMode ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => setEditMode(true)}>
                    Edit Club
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const isCurrentlyArchived = club.archived;
                        const newArchivedStatus = !isCurrentlyArchived;
                        const newActiveStatus = !newArchivedStatus; // Active when not archived
                        
                        const { error } = await supabase
                          .from('clubs')
                          .update({ 
                            archived: newArchivedStatus,
                            active: newActiveStatus
                          })
                          .eq('id', clubId);
                        
                        if (error) throw error;
                        
                        setClub(prev => prev ? { 
                          ...prev, 
                          archived: newArchivedStatus,
                          active: newActiveStatus
                        } : null);
                        
                        toast({
                          title: "Success",
                          description: `Club ${isCurrentlyArchived ? 'unarchived and activated' : 'archived and deactivated'} successfully`,
                        });
                      } catch (error) {
                        console.error('Error archiving club:', error);
                        toast({
                          title: "Error",
                          description: "Failed to archive club",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    {club.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
                <div className="text-sm text-muted-foreground">Total Commission Generated</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{competitions.length}</div>
                <div className="text-sm text-muted-foreground">Total Competitions</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Club Details</TabsTrigger>
              <TabsTrigger value="contract">Contract & Activation</TabsTrigger>
              <TabsTrigger value="competitions">Competitions</TabsTrigger>
              <TabsTrigger value="commission">Commission & Payments</TabsTrigger>
              <TabsTrigger value="banking">Bank Details</TabsTrigger>
              <TabsTrigger value="users">Club Users</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Club Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Upload Section */}
                  <div className="space-y-2">
                    <Label>Club Logo</Label>
                    <div className="flex items-center gap-4">
                      {club.logo_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-background flex items-center justify-center border border-border/20">
                          <img 
                            src={club.logo_url} 
                            alt={`${club.name} logo`} 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              console.error('Logo failed to load in upload section:', club.logo_url);
                              console.error('Image error event:', e);
                              // Hide the broken image
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('Logo loaded successfully in upload section:', club.logo_url);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Building className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                            disabled={uploadingLogo}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={uploadingLogo}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingLogo ? "Uploading..." : club.logo_url ? "Change Logo" : "Upload Logo"}
                          </Button>
                          {club.logo_url && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleLogoDelete}
                              disabled={uploadingLogo}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recommended: Square image, max 2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Club Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => {
                        if (checked && !club.contract_signed) {
                          toast({
                            title: "Contract Required",
                            description: "Club must have a signed contract before it can be activated.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setFormData(prev => ({ ...prev, active: checked }));
                      }}
                      disabled={!editMode}
                    />
                    <Label htmlFor="active">Active Club</Label>
                    {!club.contract_signed && (
                      <span className="text-sm text-muted-foreground">
                        (Requires signed contract)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contract">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Contract & Activation Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contract Status Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">Contract Status:</Label>
                        <Badge variant={club.contract_signed ? "default" : "outline"}>
                          {club.contract_signed ? "Signed" : "Not Signed"}
                        </Badge>
                      </div>
                      
                      {club.contract_signed && club.contract_signed_date && (
                        <div className="text-sm text-muted-foreground">
                          <div>Signed on: {formatDate(club.contract_signed_date, 'long')}</div>
                          {club.contract_signed_by_name && (
                            <div>Signed by: {club.contract_signed_by_name}</div>
                          )}
                          {club.contract_signed_by_email && (
                            <div>Email: {club.contract_signed_by_email}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">Activation Status:</Label>
                        <Badge variant={getActivationStatus() === "Active" ? "default" : "outline"}>
                          {getActivationStatus()}
                        </Badge>
                      </div>
                      
                      {!club.contract_signed && (
                        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                          <strong>Activation Blocked:</strong> Club requires a signed contract before it can be activated.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contract Upload Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Contract Document</h3>
                      {club.contract_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(club.contract_url!, '_blank')}
                        >
                          View Contract
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleContractUpload}
                          className="hidden"
                          id="contract-upload"
                          disabled={uploadingContract}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => document.getElementById('contract-upload')?.click()}
                          disabled={uploadingContract}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingContract ? "Uploading..." : club.contract_url ? "Replace Contract" : "Upload Contract"}
                        </Button>
                        
                        {club.contract_url && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={handleContractDelete}
                            disabled={uploadingContract}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Contract
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Accepted formats: PDF, DOC, DOCX. Max file size: 10MB
                      </p>
                    </div>
                  </div>

                  {/* Manual Contract Confirmation */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Manual Contract Confirmation</h3>
                    <p className="text-sm text-muted-foreground">
                      If you have received a signed contract but prefer not to upload it digitally, you can manually mark it as signed.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="contract-signed"
                        checked={club.contract_signed}
                        onCheckedChange={handleContractSignedToggle}
                        disabled={uploadingContract}
                      />
                      <Label htmlFor="contract-signed">
                        Mark contract as signed (without uploading document)
                      </Label>
                    </div>
                    
                    {club.contract_signed && !club.contract_url && (
                      <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <strong>Note:</strong> Contract marked as signed without uploaded document. Consider uploading the signed contract for record keeping.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competitions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Competitions ({competitions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competition</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Entry Fee</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Entries</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No competitions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          competitions.map((competition) => (
                            <TableRow key={competition.id}>
                              <TableCell className="font-medium">{competition.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{formatDate(competition.start_date, 'short')}</div>
                                  <div className="text-muted-foreground">to {formatDate(competition.end_date, 'short')}</div>
                                </div>
                              </TableCell>
                              <TableCell>{formatCurrency(competition.entry_fee)}</TableCell>
                              <TableCell>
                                {editingCommission === competition.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={tempCommissionRate}
                                      onChange={(e) => setTempCommissionRate(e.target.value)}
                                      className="w-20 h-8"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCommissionSave(competition.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCommissionCancel}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{formatCurrency(competition.commission_amount)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCommissionEdit(competition.id, competition.commission_amount)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {competition.total_entries}
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(competition.total_revenue)}</TableCell>
                              <TableCell className="font-medium text-green-600">{formatCurrency(competition.total_commission)}</TableCell>
                              <TableCell>
                                <Badge variant={competition.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {competition.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commission">
              <ClubCommissionSection clubId={clubId!} />
            </TabsContent>

            <TabsContent value="banking">
              <ClubBankDetailsSection clubId={clubId!} />
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Club Users & Management
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowNewUserModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Club User
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingUsers ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Users with club management access for {club?.name}
                      </div>
                      
                      {clubUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <div className="text-lg font-medium">No club users found</div>
                          <div className="text-sm">No users are currently assigned to manage this club</div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Member Since</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clubUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.first_name || user.last_name 
                                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                    : 'No name provided'
                                  }
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.phone || 'Not provided'}</TableCell>
                                <TableCell>{formatDate(user.created_at, 'short')}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/dashboard/admin/players/${user.id}?from=club&clubId=${clubId}&clubName=${encodeURIComponent(club?.name || '')}`)}
                                    >
                                      View Profile
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        // Remove user from club
                                        const removeUser = async () => {
                                          try {
                                            const { error } = await supabase
                                              .from('profiles')
                                              .update({ club_id: null, role: 'PLAYER' })
                                              .eq('id', user.id);
                                            
                                            if (error) throw error;
                                            
                                            await fetchClubUsers();
                                            toast({
                                              title: "Success",
                                              description: "User removed from club management.",
                                            });
                                          } catch (error) {
                                            console.error('Error removing user:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to remove user from club.",
                                              variant: "destructive"
                                            });
                                          }
                                        };
                                        removeUser();
                                      }}
                                    >
                                      Remove Access
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes & Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    />
                    <Button onClick={addNote}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {profile?.role === 'ADMIN' && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                      <Shield className="w-3 h-3 inline mr-1" />
                      <strong>Admin View:</strong> Blue highlighted notes are immutable system audit records tracking all changes made to this club.
                    </div>
                  )}

                  <div className="space-y-3">
                    {notes.filter(note => !note.immutable || profile?.role === 'ADMIN').map((note) => (
                      <div key={note.id} className={`p-3 border rounded-lg ${note.immutable ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {note.immutable && <Shield className="w-4 h-4 text-blue-600" />}
                            <span className={`text-sm font-medium ${note.immutable ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                              {note.created_by}
                            </span>
                            {note.immutable && (
                              <Badge variant="secondary" className="text-xs">
                                System Audit
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(note.created_at, 'short')}
                          </span>
                        </div>
                        <p className={`text-sm ${note.immutable ? 'text-blue-800 dark:text-blue-200' : ''}`}>
                          {note.content}
                        </p>
                        {note.immutable && profile?.role === 'ADMIN' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                            This audit record cannot be modified or deleted
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Section>

      <NewClubUserModal
        isOpen={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        clubId={clubId!}
        clubName={club?.name || ''}
        onSuccess={() => {
          fetchClubUsers();
          setShowNewUserModal(false);
        }}
      />
    </div>
  );
};

export default ClubDetailPage;