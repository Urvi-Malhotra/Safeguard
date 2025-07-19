import React, { useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const { notifications, removeNotification } = useAppStore();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'info':
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-gray-400" size={20} />
          <h3 className="font-semibold text-gray-800">Notifications</h3>
        </div>
        <div className="text-center py-8">
          <Bell className="mx-auto text-gray-300 mb-2" size={48} />
          <p className="text-gray-500">No notifications</p>
          <p className="text-sm text-gray-400 mt-1">
            You'll see emergency alerts and app updates here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="text-gray-600" size={20} />
          <h3 className="font-semibold text-gray-800">Notifications</h3>
          {notifications.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border ${getNotificationBg(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Emergency notification details */}
                {notification.type === 'emergency' && notification.data && (
                  <div className="mt-2 p-2 bg-white rounded border text-xs">
                    <p><strong>Location:</strong> 
                      {notification.data.location ? 
                        ` ${notification.data.location.latitude.toFixed(4)}, ${notification.data.location.longitude.toFixed(4)}` : 
                        ' Not available'
                      }
                    </p>
                    <p><strong>Trigger:</strong> {notification.data.trigger_type}</p>
                    {notification.data.user.phone && (
                      <p><strong>Contact:</strong> {notification.data.user.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;