import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster 
      position="top-right" 
      toastOptions={{
        style: {
          background: '#384959',
          color: '#fff',
        },
      }}
    />
    <App />
  </StrictMode>,
)
