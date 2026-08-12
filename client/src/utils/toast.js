import toast from 'react-hot-toast';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const showToast = {
  success: (message) => 
    toast.success(message, {
      icon: <CheckCircle className="text-emerald-400" size={20} />,
      style: {
        background: '#384959',
        color: '#fff',
        border: '1px solid #6A89A7',
      },
    }),
  error: (message) => 
    toast.error(message, {
      icon: <AlertCircle className="text-red-400" size={20} />,
      style: {
        background: '#384959',
        color: '#fff',
        border: '1px solid #ef4444',
      },
    }),
  info: (message) => 
    toast(message, {
      icon: <Info className="text-blue-400" size={20} />,
      style: {
        background: '#384959',
        color: '#fff',
        border: '1px solid #88BDF2',
      },
    }),
  warning: (message) => 
    toast(message, {
      icon: <AlertTriangle className="text-amber-400" size={20} />,
      style: {
        background: '#384959',
        color: '#fff',
        border: '1px solid #fbbf24',
      },
    }),
};
