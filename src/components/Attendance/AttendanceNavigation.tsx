import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, FileText, CalendarDays, ClipboardList, Calendar } from 'lucide-react';

export default function AttendanceNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationTabs = [
    { id: 'tracker', label: 'Check In/Out', icon: Clock, path: '/attendance' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/attendance' },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/attendance/calendar' },
    { id: 'details', label: 'History', icon: ClipboardList, path: '/attendance/details' },
    { id: 'leave', label: 'Leave', icon: Calendar, path: '/attendance/leave' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-2">
      <div className="flex flex-wrap gap-2">
        {navigationTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
