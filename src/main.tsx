import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { logAuthDiagnostics } from '@/lib/authDiagnostics';
import './index.css'

// Run auth diagnostics on app start
logAuthDiagnostics();

createRoot(document.getElementById("root")!).render(<App />);
