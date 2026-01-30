
import React, { useEffect } from 'react';
import type { AppNotification } from '../types';
import { CheckIcon, XIcon, InfoIcon, XMarkIcon } from './icons';

const notificationConfig = {
  success: {
    icon: <CheckIcon className="w-6 h-6 text-green-400" />,
    style: 'border-green-500/50',
  },
  error: {
    icon: <XIcon className="w-6 h-6 text-red-400" />,
    style: 'border-red-500/50',
  },
  info: {
    icon: <InfoIcon className="w-6 h-6 text-blue-400" />,
    style: 'border-blue-500/50',
  },
};

interface NotificationProps {
  notification: AppNotification;
  onRemove: (id: number) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [notification.id, onRemove]);

  const config = notificationConfig[notification.type];

  return (
    <div
      className={`relative w-full max-w-sm p-4 rounded-2xl border bg-[#1c1c1c]/90 backdrop-blur-xl shadow-2xl flex items-start gap-4 animate-fadeIn pointer-events-auto ${config.style}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0">
        {config.icon}
      </div>
      <p className="flex-grow text-sm font-medium text-white/90">{notification.message}</p>
      <button 
        onClick={() => onRemove(notification.id)} 
        className="flex-shrink-0 text-white/50 hover:text-white transition-colors p-1"
        aria-label="Benachrichtigung schließen"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

interface NotificationCenterProps {
  notifications: AppNotification[];
  onRemove: (id: number) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-28 right-4 z-[100] space-y-3 w-full max-w-sm pointer-events-none flex flex-col items-end">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default NotificationCenter;
