import { useState, useEffect } from 'react';
import { supabase, AttendanceRecord, LeaveApplication, Holiday } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import AttendanceNavigation from './AttendanceNavigation';

export default function AttendanceCalendar() {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthData();
  }, [selectedMonth]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [attendanceData, leavesData, holidaysData] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', profile?.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('leave_applications')
          .select('*')
          .eq('user_id', profile?.id)
          .eq('status', 'approved')
          .lte('start_date', endDate)
          .gte('end_date', startDate),
        supabase
          .from('holidays')
          .select('*')
          .eq('tenant_id', profile?.tenant_id)
          .gte('holiday_date', startDate)
          .lte('holiday_date', endDate),
      ]);

      setAttendanceRecords(attendanceData.data || []);
      setLeaveApplications(leavesData.data || []);
      setHolidays(holidaysData.data || []);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getAttendanceForDate = (date: Date) => {
    const dateKey = getDateKey(date);
    return attendanceRecords.find((record) => record.date === dateKey);
  };

  const isOnLeave = (date: Date) => {
    const dateKey = getDateKey(date);
    return leaveApplications.some((leave) => {
      return dateKey >= leave.start_date && dateKey <= leave.end_date;
    });
  };

  const isHoliday = (date: Date) => {
    const dateKey = getDateKey(date);
    return holidays.find((holiday) => holiday.holiday_date === dateKey);
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const getDayColor = (date: Date) => {
    if (isWeekend(date)) {
      return 'bg-gray-100';
    }

    const holiday = isHoliday(date);
    if (holiday) {
      return holiday.is_optional ? 'bg-yellow-50' : 'bg-red-50';
    }

    if (isOnLeave(date)) {
      return 'bg-blue-100';
    }

    const attendance = getAttendanceForDate(date);
    if (!attendance) {
      if (date > new Date()) {
        return 'bg-white';
      }
      return 'bg-red-50';
    }

    switch (attendance.status) {
      case 'present':
        return 'bg-green-50';
      case 'late':
        return 'bg-orange-50';
      case 'half_day':
        return 'bg-yellow-50';
      case 'absent':
        return 'bg-red-100';
      case 'on_leave':
        return 'bg-blue-100';
      default:
        return 'bg-white';
    }
  };

  const getBorderColor = (date: Date) => {
    if (isWeekend(date)) {
      return 'border-gray-300';
    }

    const holiday = isHoliday(date);
    if (holiday) {
      return holiday.is_optional ? 'border-yellow-300' : 'border-red-300';
    }

    if (isOnLeave(date)) {
      return 'border-blue-300';
    }

    const attendance = getAttendanceForDate(date);
    if (!attendance) {
      if (date > new Date()) {
        return 'border-gray-200';
      }
      return 'border-red-300';
    }

    switch (attendance.status) {
      case 'present':
        return 'border-green-300';
      case 'late':
        return 'border-orange-300';
      case 'half_day':
        return 'border-yellow-300';
      case 'absent':
        return 'border-red-300';
      case 'on_leave':
        return 'border-blue-300';
      default:
        return 'border-gray-200';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
        <AttendanceNavigation />
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Attendance Calendar</h3>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h3 className="text-xl font-bold text-gray-900">{monthName}</h3>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const attendance = getAttendanceForDate(date);
            const holiday = isHoliday(date);
            const onLeave = isOnLeave(date);
            const weekend = isWeekend(date);

            return (
              <div
                key={index}
                className={`
                  aspect-square border-2 rounded-lg p-2 transition-all
                  ${getDayColor(date)} ${getBorderColor(date)}
                  ${isToday(date) ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  hover:shadow-md cursor-pointer
                `}
                title={
                  holiday
                    ? holiday.holiday_name
                    : onLeave
                    ? 'On Leave'
                    : attendance
                    ? `${attendance.status} - ${attendance.total_hours?.toFixed(1) || 0}h`
                    : weekend
                    ? 'Weekend'
                    : 'No record'
                }
              >
                <div className="text-sm font-semibold text-gray-900">{date.getDate()}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {holiday ? (
                    <div className="truncate text-red-700">{holiday.holiday_name}</div>
                  ) : onLeave ? (
                    <div className="text-blue-700">Leave</div>
                  ) : attendance ? (
                    <>
                      <div className="truncate capitalize">{attendance.status.replace('_', ' ')}</div>
                      {attendance.total_hours && (
                        <div className="font-medium">{attendance.total_hours.toFixed(1)}h</div>
                      )}
                    </>
                  ) : weekend ? (
                    <div className="text-gray-500">Weekend</div>
                  ) : date <= new Date() ? (
                    <div className="text-red-600">Absent</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded" />
              <span className="text-sm text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border-2 border-orange-300 rounded" />
              <span className="text-sm text-gray-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded" />
              <span className="text-sm text-gray-600">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded" />
              <span className="text-sm text-gray-600">On Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-300 rounded" />
              <span className="text-sm text-gray-600">Holiday/Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded" />
              <span className="text-sm text-gray-600">Weekend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
