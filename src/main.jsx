import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initNativeShell } from 'capacitor-native-shell'
import './index.css'
import App from './App.jsx'

initNativeShell()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
