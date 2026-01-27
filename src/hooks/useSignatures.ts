// useSignatures.ts - Supabase hooks for e-signature workflows
// Provides CRUD operations for signature requests, signers, and fields

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Guard to throw if supabase is not configured
function getSupabase() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// ============================================
// TYPES
// ============================================

export type SignatureRequestStatus = 
  | 'draft' 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'declined' 
  | 'expired' 
  | 'voided';

export type SignerStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';

export type SignatureFieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox';

export interface SignatureRequest {
  id: string;
  document_id: string;
  client_id?: string;
  created_by: string;
  title: string;
  message?: string;
  status: SignatureRequestStatus;
  expires_at?: string;
  completed_at?: string;
  completed_file_url?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  document?: {
    id: string;
    name: string;
    file_url: string;
    page_count?: number;
  };
  signers?: Signer[];
}

export interface Signer {
  id: string;
  signature_request_id: string;
  name: string;
  email: string;
  order: number;
  status: SignerStatus;
  access_token: string;
  signed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  last_viewed_at?: string;
  last_reminder_at?: string;
  // Joined data
  fields?: SignatureField[];
}

export interface SignatureField {
  id: string;
  signer_id: string;
  page_number: number;
  type: SignatureFieldType;
  x: number; // 0-1 relative position
  y: number;
  width: number;
  height: number;
  required: boolean;
  placeholder?: string;
  value?: string;
  signed_at?: string;
}

export interface SignatureAuditLog {
  id: string;
  signature_request_id: string;
  action: string;
  actor?: string;
  actor_name?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SavedSignature {
  id: string;
  user_id: string;
  type: 'signature' | 'initials';
  name: string;
  image_data: string;
  created_at: string;
}

// ============================================
// useSignatureRequests Hook
// ============================================

export function useSignatureRequests(options: {
  organizationId?: string;
  clientId?: string;
  status?: SignatureRequestStatus;
} = {}) {
  const { clientId, status } = options;
  
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch signature requests
  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = getSupabase()
        .from('signature_requests')
        .select(`
          *,
          document:client_documents(id, name, file_url, page_count),
          signers(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching signature requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch signature requests');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription
  useEffect(() => {
    const channel = getSupabase()
      .channel('signature-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [fetchRequests]);

  // Create signature request
  const createRequest = useCallback(
    async (request: {
      document_id: string;
      title: string;
      message?: string;
      client_id?: string;
      expires_at?: Date;
      signers: Array<{
        name: string;
        email: string;
        order: number;
        fields: Array<{
          page_number: number;
          type: SignatureFieldType;
          x: number;
          y: number;
          width: number;
          height: number;
          required?: boolean;
          placeholder?: string;
        }>;
      }>;
    }): Promise<SignatureRequest | null> => {
      try {
        // Create the signature request
        const { data: requestData, error: requestError } = await getSupabase()
          .from('signature_requests')
          .insert([
            {
              document_id: request.document_id,
              title: request.title,
              message: request.message,
              client_id: request.client_id,
              expires_at: request.expires_at?.toISOString(),
              status: 'draft',
              created_by: (await getSupabase().auth.getUser()).data.user?.id,
            },
          ])
          .select()
          .single();

        if (requestError) throw requestError;

        // Create signers
        for (const signer of request.signers) {
          const { data: signerData, error: signerError } = await getSupabase()
            .from('signers')
            .insert([
              {
                signature_request_id: requestData.id,
                name: signer.name,
                email: signer.email,
                order: signer.order,
                status: 'pending',
              },
            ])
            .select()
            .single();

          if (signerError) throw signerError;

          // Create signature fields for this signer
          if (signer.fields.length > 0) {
            const { error: fieldsError } = await getSupabase()
              .from('signature_fields')
              .insert(
                signer.fields.map((field) => ({
                  signer_id: signerData.id,
                  page_number: field.page_number,
                  type: field.type,
                  x: field.x,
                  y: field.y,
                  width: field.width,
                  height: field.height,
                  required: field.required ?? true,
                  placeholder: field.placeholder,
                }))
              );

            if (fieldsError) throw fieldsError;
          }
        }

        // Log the creation
        await logAuditEvent(requestData.id, 'request_created', {
          title: request.title,
          signer_count: request.signers.length,
        });

        return requestData;
      } catch (err) {
        console.error('Error creating signature request:', err);
        throw err;
      }
    },
    []
  );

  // Send signature request (change status to pending and send emails)
  const sendRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      try {
        // Update status to pending
        const { error: updateError } = await getSupabase()
          .from('signature_requests')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Update signers to 'sent'
        const { error: signersError } = await getSupabase()
          .from('signers')
          .update({ status: 'sent' })
          .eq('signature_request_id', requestId);

        if (signersError) throw signersError;

        // Log the send event
        await logAuditEvent(requestId, 'request_sent');

        // TODO: Trigger email sending via edge function or external service
        
        return true;
      } catch (err) {
        console.error('Error sending signature request:', err);
        throw err;
      }
    },
    []
  );

  // Void signature request
  const voidRequest = useCallback(
    async (requestId: string, reason?: string): Promise<boolean> => {
      try {
        const { error: updateError } = await getSupabase()
          .from('signature_requests')
          .update({
            status: 'voided',
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (updateError) throw updateError;

        await logAuditEvent(requestId, 'request_voided', { reason });

        return true;
      } catch (err) {
        console.error('Error voiding signature request:', err);
        throw err;
      }
    },
    []
  );

  // Delete signature request (only drafts)
  const deleteRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await getSupabase()
        .from('signature_requests')
        .delete()
        .eq('id', requestId)
        .eq('status', 'draft');

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting signature request:', err);
      throw err;
    }
  }, []);

  return {
    requests,
    isLoading,
    error,
    refetch: fetchRequests,
    createRequest,
    sendRequest,
    voidRequest,
    deleteRequest,
  };
}

// ============================================
// useSignatureRequest Hook (single request)
// ============================================

export function useSignatureRequest(requestId: string | null) {
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [auditLog, setAuditLog] = useState<SignatureAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full request with signers and fields
  const fetchRequest = useCallback(async () => {
    if (!requestId) {
      setRequest(null);
      setSigners([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch request with document
      const { data: requestData, error: requestError } = await getSupabase()
        .from('signature_requests')
        .select(`
          *,
          document:client_documents(id, name, file_url, page_count, thumbnail_url)
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch signers with fields
      const { data: signersData, error: signersError } = await getSupabase()
        .from('signers')
        .select(`
          *,
          fields:signature_fields(*)
        `)
        .eq('signature_request_id', requestId)
        .order('order');

      if (signersError) throw signersError;
      setSigners(signersData || []);

      // Fetch audit log
      const { data: logData, error: logError } = await getSupabase()
        .from('signature_audit_log')
        .select('*')
        .eq('signature_request_id', requestId)
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      setAuditLog(logData || []);
    } catch (err) {
      console.error('Error fetching signature request:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch signature request');
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Real-time subscription
  useEffect(() => {
    if (!requestId) return;

    const channel = getSupabase()
      .channel(`signature-request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_requests',
          filter: `id=eq.${requestId}`,
        },
        () => fetchRequest()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signers',
          filter: `signature_request_id=eq.${requestId}`,
        },
        () => fetchRequest()
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [requestId, fetchRequest]);

  // Send reminder to signer
  const sendReminder = useCallback(
    async (signerId: string): Promise<boolean> => {
      try {
        const { error: updateError } = await getSupabase()
          .from('signers')
          .update({ last_reminder_at: new Date().toISOString() })
          .eq('id', signerId);

        if (updateError) throw updateError;

        await logAuditEvent(requestId!, 'reminder_sent', { signer_id: signerId });

        // TODO: Trigger reminder email
        
        return true;
      } catch (err) {
        console.error('Error sending reminder:', err);
        throw err;
      }
    },
    [requestId]
  );

  return {
    request,
    signers,
    auditLog,
    isLoading,
    error,
    refetch: fetchRequest,
    sendReminder,
  };
}

// ============================================
// useSignerView Hook (for public signer access)
// ============================================

export function useSignerView(accessToken: string | null) {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch signer data by access token
  useEffect(() => {
    if (!accessToken) {
      setSigner(null);
      setRequest(null);
      setFields([]);
      setIsLoading(false);
      return;
    }

    const fetchSignerData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch signer
        const { data: signerData, error: signerError } = await getSupabase()
          .from('signers')
          .select(`
            *,
            fields:signature_fields(*)
          `)
          .eq('access_token', accessToken)
          .single();

        if (signerError) throw signerError;
        
        // Check if already completed
        if (signerData.status === 'signed') {
          setError('You have already signed this document');
          return;
        }

        if (signerData.status === 'declined') {
          setError('You have declined this signature request');
          return;
        }

        setSigner(signerData);
        setFields(signerData.fields || []);

        // Fetch the signature request and document
        const { data: requestData, error: requestError } = await getSupabase()
          .from('signature_requests')
          .select(`
            *,
            document:client_documents(id, name, file_url, page_count)
          `)
          .eq('id', signerData.signature_request_id)
          .single();

        if (requestError) throw requestError;

        // Check if request is still valid
        if (requestData.status === 'voided') {
          setError('This signature request has been cancelled');
          return;
        }

        if (requestData.status === 'expired' || 
            (requestData.expires_at && new Date(requestData.expires_at) < new Date())) {
          setError('This signature request has expired');
          return;
        }

        setRequest(requestData);

        // Mark as viewed if first view
        if (signerData.status === 'sent' || signerData.status === 'pending') {
          await getSupabase()
            .from('signers')
            .update({ 
              status: 'viewed',
              last_viewed_at: new Date().toISOString() 
            })
            .eq('id', signerData.id);

          await logAuditEvent(
            signerData.signature_request_id,
            'document_viewed',
            { signer_id: signerData.id, signer_name: signerData.name }
          );
        }
      } catch (err) {
        console.error('Error fetching signer data:', err);
        setError(err instanceof Error ? err.message : 'Invalid or expired signing link');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignerData();
  }, [accessToken]);

  // Sign a field
  const signField = useCallback(
    async (fieldId: string, value: string): Promise<boolean> => {
      if (!signer) return false;

      try {
        const { error: updateError } = await getSupabase()
          .from('signature_fields')
          .update({
            value,
            signed_at: new Date().toISOString(),
          })
          .eq('id', fieldId);

        if (updateError) throw updateError;

        // Update local state
        setFields((prev) =>
          prev.map((f) =>
            f.id === fieldId ? { ...f, value, signed_at: new Date().toISOString() } : f
          )
        );

        return true;
      } catch (err) {
        console.error('Error signing field:', err);
        throw err;
      }
    },
    [signer]
  );

  // Complete signing
  const completeSignature = useCallback(async (): Promise<boolean> => {
    if (!signer || !request) return false;

    try {
      // Check all required fields are signed
      const requiredFields = fields.filter((f) => f.required);
      const signedFields = requiredFields.filter((f) => f.value);

      if (signedFields.length < requiredFields.length) {
        throw new Error('Please complete all required fields');
      }

      // Update signer status
      const { error: signerError } = await getSupabase()
        .from('signers')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', signer.id);

      if (signerError) throw signerError;

      // Log the signing
      await logAuditEvent(request.id, 'document_signed', {
        signer_id: signer.id,
        signer_name: signer.name,
        signer_email: signer.email,
      });

      // Check if all signers have completed
      const { data: allSigners, error: checkError } = await getSupabase()
        .from('signers')
        .select('status')
        .eq('signature_request_id', request.id);

      if (checkError) throw checkError;

      const allSigned = allSigners?.every((s) => s.status === 'signed');

      if (allSigned) {
        // Update request status to completed
        await getSupabase()
          .from('signature_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        await logAuditEvent(request.id, 'request_completed');

        // TODO: Generate final PDF with all signatures embedded
      } else {
        // Update to in_progress if not all signed
        await getSupabase()
          .from('signature_requests')
          .update({ status: 'in_progress' })
          .eq('id', request.id);
      }

      return true;
    } catch (err) {
      console.error('Error completing signature:', err);
      throw err;
    }
  }, [signer, request, fields]);

  // Decline to sign
  const declineSignature = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!signer || !request) return false;

      try {
        const { error: signerError } = await getSupabase()
          .from('signers')
          .update({
            status: 'declined',
            declined_at: new Date().toISOString(),
            decline_reason: reason,
          })
          .eq('id', signer.id);

        if (signerError) throw signerError;

        // Update request status
        await getSupabase()
          .from('signature_requests')
          .update({ status: 'declined' })
          .eq('id', request.id);

        // Log the decline
        await logAuditEvent(request.id, 'signature_declined', {
          signer_id: signer.id,
          signer_name: signer.name,
          reason,
        });

        return true;
      } catch (err) {
        console.error('Error declining signature:', err);
        throw err;
      }
    },
    [signer, request]
  );

  return {
    signer,
    request,
    fields,
    isLoading,
    error,
    signField,
    completeSignature,
    declineSignature,
  };
}

// ============================================
// useSavedSignatures Hook
// ============================================

export function useSavedSignatures() {
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const { data: userData } = await getSupabase().auth.getUser();
        if (!userData.user) return;

        const { data, error } = await getSupabase()
          .from('saved_signatures')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSignatures(data || []);
      } catch (err) {
        console.error('Error fetching saved signatures:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignatures();
  }, []);

  const saveSignature = useCallback(
    async (type: 'signature' | 'initials', name: string, imageData: string): Promise<SavedSignature | null> => {
      try {
        const { data: userData } = await getSupabase().auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const { data, error } = await getSupabase()
          .from('saved_signatures')
          .insert([
            {
              user_id: userData.user.id,
              type,
              name,
              image_data: imageData,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        setSignatures((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        console.error('Error saving signature:', err);
        throw err;
      }
    },
    []
  );

  const deleteSignature = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await getSupabase().from('saved_signatures').delete().eq('id', id);

      if (error) throw error;
      setSignatures((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting signature:', err);
      throw err;
    }
  }, []);

  return {
    signatures,
    isLoading,
    saveSignature,
    deleteSignature,
  };
}

// ============================================
// Helper Functions
// ============================================

async function logAuditEvent(
  requestId: string,
  action: string,
  metadata?: Record<string, any>
) {
  try {
    const { data: userData } = await getSupabase().auth.getUser();
    
    await getSupabase().from('signature_audit_log').insert([
      {
        signature_request_id: requestId,
        action,
        actor: userData.user?.id,
        actor_name: userData.user?.email,
        metadata,
        // IP and user agent would be captured server-side via edge function
      },
    ]);
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}

export default useSignatureRequests;
