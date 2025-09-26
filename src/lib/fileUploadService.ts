import { supabase } from "@/integrations/supabase/client";

export interface UploadedFile {
  id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  upload_purpose: 'selfie' | 'id_document' | 'handicap_proof' | 'shot_video';
  expires_at?: string;
  uploaded_at: string;
  public_url?: string;
}

export interface UploadOptions {
  purpose: UploadedFile['upload_purpose'];
  expiresInHours?: number;
  maxSizeBytes?: number;
}

const BUCKET_MAPPING = {
  selfie: 'player-selfies',
  id_document: 'id-documents', 
  handicap_proof: 'handicap-proofs',
  shot_video: 'shot-videos',
} as const;

const DEFAULT_MAX_SIZES = {
  selfie: 5 * 1024 * 1024, // 5MB
  id_document: 10 * 1024 * 1024, // 10MB
  handicap_proof: 10 * 1024 * 1024, // 10MB
  shot_video: 20 * 1024 * 1024, // 20MB
} as const;

export const uploadFile = async (
  file: File,
  userId: string,
  options: UploadOptions
): Promise<UploadedFile> => {
  console.log('Starting file upload:', { 
    filename: file.name, 
    size: file.size, 
    purpose: options.purpose 
  });

  // Basic validation - no security monitoring
  // Basic file validation
  if (!file.name || file.name.length === 0) {
    throw new Error('Filename cannot be empty');
  }
  
  if (file.name.match(/\.(exe|bat|cmd|scr|pif|com|jar|js|vbs|ps1|sh)$/i)) {
    throw new Error('File type not allowed for security reasons');
  }
  
  if (file.size > 20 * 1024 * 1024) { // 20MB limit
    throw new Error('File size exceeds maximum limit of 20MB');
  }

  // Validate file size
  const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZES[options.purpose];
  if (file.size > maxSize) {
    throw new Error(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Validate file type based on purpose
  validateFileType(file, options.purpose);

  const bucket = BUCKET_MAPPING[options.purpose];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const storageFileName = `${timestamp}_${randomString}.${fileExtension}`;
  const storagePath = `${userId}/${storageFileName}`;

  try {
    // Upload file to Supabase Storage with enhanced options
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        duplex: 'half' // Security enhancement for upload streams
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded to storage:', uploadData);

    // Calculate expiry date if specified
    const expiresAt = options.expiresInHours 
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    // Record file in uploaded_files table (store full path for RLS compatibility)
    const { data: fileRecord, error: dbError } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: userId,
        storage_bucket: bucket,
        storage_path: storagePath, // Store full path including userId
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        upload_purpose: options.purpose,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert failed:', dbError);
      // Clean up uploaded file
      await supabase.storage.from(bucket).remove([storagePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    const uploadedFile: UploadedFile = {
      ...fileRecord,
      upload_purpose: fileRecord.upload_purpose as UploadedFile['upload_purpose'],
    };

    console.log('File upload completed:', uploadedFile);
    return uploadedFile;

  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

const validateFileType = (file: File, purpose: UploadOptions['purpose']) => {
  const allowedTypes: Record<string, string[]> = {
    selfie: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    id_document: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    handicap_proof: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    shot_video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
  };

  const allowed = allowedTypes[purpose];
  if (!allowed.includes(file.type.toLowerCase())) {
    throw new Error(`File type ${file.type} not allowed for ${purpose}. Allowed: ${allowed.join(', ')}`);
  }
};

export const deleteFile = async (fileId: string): Promise<void> => {
  console.log('Deleting file:', fileId);

  // Get file record first
  const { data: fileRecord, error: fetchError } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch file record:', fetchError);
    throw new Error(`Cannot find file: ${fetchError.message}`);
  }

  // Delete from storage using the full storage_path
  const { error: storageError } = await supabase.storage
    .from(fileRecord.storage_bucket)
    .remove([fileRecord.storage_path]);

  if (storageError) {
    console.error('Failed to delete from storage:', storageError);
    // Continue with database deletion even if storage deletion fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('uploaded_files')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    console.error('Failed to delete file record:', dbError);
    throw new Error(`Database deletion failed: ${dbError.message}`);
  }

  console.log('File deleted successfully:', fileId);
};

/**
 * Gets a signed URL for an uploaded file (always uses signed URLs, no public URLs)
 * @param file - The uploaded file metadata  
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Promise<string> - The signed URL
 */
export const getFileUrl = async (file: UploadedFile, expiresIn = 3600): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      throw error;
    }

    if (!data.signedUrl) {
      throw new Error('No signed URL returned');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
};

/**
 * Helper function to get signed URL from stored reference (bucket/path format)  
 * Used for verifications and other stored file references
 * @param storedRef - Format: "${bucket}/${path}"
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Promise<string> - The signed URL
 */
export const getSignedUrlFromStoredRef = async (storedRef: string, expiresIn = 3600): Promise<string> => {
  if (!storedRef || !storedRef.includes('/')) {
    throw new Error('Invalid stored file reference format');
  }

  const firstSlashIndex = storedRef.indexOf('/');
  const bucket = storedRef.substring(0, firstSlashIndex);
  const path = storedRef.substring(firstSlashIndex + 1);

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      throw error;
    }

    if (!data.signedUrl) {
      throw new Error('No signed URL returned');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL from stored ref:', error);
    throw error;
  }
};