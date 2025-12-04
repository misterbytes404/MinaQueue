import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: StrictMode removed to prevent double-mounting issues with WebSocket connections
createRoot(document.getElementById('root')!).render(<App />)
