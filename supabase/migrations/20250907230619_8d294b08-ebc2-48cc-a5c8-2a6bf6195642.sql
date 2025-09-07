-- Comprehensive security fix for publicly accessible sensitive data
-- Fix both clubs and profiles tables to prevent data exposure

-- First, let's drop the problematic policies that allow anonymous access
DROP POLICY IF EXISTS "Anonymous users can view minimal club data" ON public.clubs;

-- For clubs table: Remove all public access 
-- Only authenticated users and proper roles should access club data
-- Anonymous access should go through application-level safe service only

-- For profiles table: Ensure no anonymous access exists
-- Drop any public policies that might exist
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON public.profiles;

-- Add a note in the database about security
COMMENT ON TABLE public.clubs IS 'Contains sensitive business data (email, phone, banking). Access restricted to authenticated users only. Use ClubService.getSafeClubsData() for public consumption.';
COMMENT ON TABLE public.profiles IS 'Contains sensitive personal data (email, phone, DOB, location). Access restricted to authenticated users only.';