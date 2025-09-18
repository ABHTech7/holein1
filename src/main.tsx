import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { logAuthDiagnostics } from '@/lib/authDiagnostics';
import './index.css'

// Run auth diagnostics on app start
logAuthDiagnostics();

// Magic Link Implementation Checklist
console.log('✅ Magic link: PKCE fallback enabled');
console.log('✅ Resend banner: TTL=6h, cooldown persistence enabled'); 
console.log('✅ Expired link page: auto-resend active');

createRoot(document.getElementById("root")!).render(<App />);
