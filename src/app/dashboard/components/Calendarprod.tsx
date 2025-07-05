"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays, getDaysInMonth, getDate } from 'date-fns';
import { useUser } from '@clerk/nextjs';
import { TextShimmer } from '@/components/ui/text-shimmer';

export type DayType = {
  day: string;
  classNames: string;
  meetingInfo?: {
    date: string;
    time: string;
    title: string;
    participants: string[];
    location: string;
    timestamp: string;
  }[];
};

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string;
  organizer_name?: string;
  organizer_email?: string;
}

interface EmailData {
  id: number;
  sender_email: string;
  subject?: string;
  received_at: string;
  sender_name?: string;
}

interface DayProps {
  classNames: string;
  day: DayType;
  onHover: (day: string | null) => void;
  onClick: (day: string) => void;
  isSelected: boolean;
}

const Day: React.FC<DayProps> = ({ classNames, day, onHover, onClick, isSelected }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <>
      <motion.div
        className={`relative flex items-center justify-center py-1 ${classNames} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${day.meetingInfo ? 'cursor-pointer' : ''}`}
        style={{ height: '4rem', borderRadius: 16 }}
        onMouseEnter={() => {
          setIsHovered(true);
          onHover(day.day);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onHover(null);
        }}
        onClick={() => {
          if (day.meetingInfo && !(day.day[0] === '+' || day.day[0] === '-')) {
            onClick(day.day);
          }
        }}
        id={`day-${day.day}`}
      >
        <motion.div className="flex flex-col items-center justify-center">
          {!(day.day[0] === '+' || day.day[0] === '-') && (
            <span className="text-sm text-white">{day.day}</span>
          )}
        </motion.div>
        {day.meetingInfo && (
          <motion.div
            className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-zinc-700 p-1 text-[10px] font-bold text-white"
            layoutId={`day-${day.day}-meeting-count`}
            style={{
              borderRadius: 999,
            }}
          >
            {day.meetingInfo.length}
          </motion.div>
        )}

        <AnimatePresence>
          {day.meetingInfo && isHovered && (
            <div className="absolute inset-0 flex size-full items-center justify-center">
              <motion.div
                className="flex size-10 items-center justify-center bg-zinc-700 p-1 text-xs font-bold text-white"
                layoutId={`day-${day.day}-meeting-count`}
                style={{
                  borderRadius: 999,
                }}
              >
                {day.meetingInfo.length}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

const CalendarGrid: React.FC<{ 
  onHover: (day: string | null) => void;
  onClick: (day: string) => void;
  selectedDay: string | null;
  days: DayType[];
}> = ({
  onHover,
  onClick,
  selectedDay,
  days,
}) => {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day: DayType, index: number) => (
        <Day
          key={`${day.day}-${index}`}
          classNames={day.classNames}
          day={day}
          onHover={onHover}
          onClick={onClick}
          isSelected={selectedDay === day.day}
        />
      ))}
    </div>
  );
};

const Calendarprod = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [moreView, setMoreView] = useState(true); // Always show right panel
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'calendar' | 'email' | null>(null); // New filter state (null = both)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  
  const supabase = createClient();
  const { user } = useUser();

  const handleDayHover = (day: string | null) => {
    setHoveredDay(day);
  };

  const handleDayClick = (day: string) => {
    if (selectedDay === day) {
      // If clicking on the same day, deselect it
      setSelectedDay(null);
    } else {
      // Select the new day
      setSelectedDay(day);
    }
  };

  // Get database user ID from Clerk user ID
  const getDbUserId = async (clerkUserId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) {
        console.error('Error fetching database user:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error fetching database user:', error);
      return null;
    }
  };

  // Fetch calendar events from Supabase (user-specific)
  const fetchCalendarEvents = useCallback(async () => {
    if (!dbUserId) return [];
    
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, summary, description, start_time, end_time, location, attendees, organizer_name, organizer_email')
        .eq('user_id', dbUserId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }, [dbUserId, currentDate, supabase]);

  // Fetch emails from Supabase (user-specific)
  const fetchEmails = useCallback(async () => {
    if (!dbUserId) return [];
    
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const { data, error } = await supabase
        .from('emails')
        .select('id, sender_email, subject, received_at, sender_name')
        .eq('user_id', dbUserId)
        .gte('received_at', startDate.toISOString())
        .lte('received_at', endDate.toISOString())
        .order('received_at', { ascending: true });

      if (error) {
        console.error('Error fetching emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }, [dbUserId, currentDate, supabase]);

  // Transform calendar events to meeting info format
  const transformCalendarEvent = (event: CalendarEvent): {
    date: string;
    time: string;
    title: string;
    participants: string[];
    location: string;
    timestamp: string; // Add timestamp for sorting
  } => {
    const startTime = parseISO(event.start_time);
    const endTime = parseISO(event.end_time);
    
    let participants = [];
    try {
      if (event.attendees) {
        const attendeeData = JSON.parse(event.attendees);
        participants = attendeeData.map((a: any) => a.name || a.displayName || a.email || '').filter(Boolean);
      }
    } catch {
      // If parsing fails, use organizer info
    }
    
    if (participants.length === 0 && event.organizer_name) {
      participants = [event.organizer_name];
    }

    return {
      date: format(startTime, 'EEE, d MMM'),
      time: `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`,
      title: event.summary || 'Untitled Event',
      participants,
      location: event.location || 'No location',
      timestamp: event.start_time // Keep original timestamp for sorting
    };
  };

  // Transform emails to meeting info format
  const transformEmail = (email: EmailData): {
    date: string;
    time: string;
    title: string;
    participants: string[];
    location: string;
    timestamp: string; // Add timestamp for sorting
  } => {
    const receivedTime = parseISO(email.received_at);
    
    return {
      date: format(receivedTime, 'EEE, d MMM'),
      time: format(receivedTime, 'h:mm a'),
      title: email.subject || 'Email',
      participants: [email.sender_name || email.sender_email || 'Unknown'],
      location: 'Email',
      timestamp: email.received_at // Keep original timestamp for sorting
    };
  };

  // Generate calendar days with real data
  const generateCalendarDays = (): DayType[] => {
    const firstDayOfMonth = startOfMonth(currentDate);
    const lastDayOfMonth = endOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    
    // Get the day of the week for the first day (0 = Sunday)
    const firstDayWeekday = getDay(firstDayOfMonth);
    
    const days: DayType[] = [];
    
    // Add previous month days to fill the grid
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const prevDate = subDays(firstDayOfMonth, i + 1);
      days.push({
        day: `-${getDate(prevDate)}`,
        classNames: 'bg-zinc-700/20'
      });
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayString = day.toString().padStart(2, '0');
      
      // Find events and emails for this day
      const dayEvents = calendarEvents.filter(event => {
        const eventDate = parseISO(event.start_time);
        return getDate(eventDate) === day;
      });
      
      const dayEmails = emails.filter(email => {
        const emailDate = parseISO(email.received_at);
        return getDate(emailDate) === day;
      });
      
      // Transform to meeting info and sort by timestamp (most recent first)
      const meetingInfo = [
        ...dayEvents.map(transformCalendarEvent),
        ...dayEmails.map(transformEmail)
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const hasEvents = meetingInfo.length > 0;
      
      days.push({
        day: dayString,
        classNames: `bg-[#1e1e1e] ${hasEvents ? 'cursor-pointer' : ''}`,
        meetingInfo: hasEvents ? meetingInfo : undefined
      });
    }
    
    // Add next month days to complete the grid (42 days total)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day: `+${day}`,
        classNames: 'bg-zinc-700/20'
      });
    }
    
    return days;
  };

  // Get database user ID when Clerk user is available
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (user?.id) {
        console.log('🔍 Calendarprod: Fetching database user ID for Clerk user:', user.id);
        const dbId = await getDbUserId(user.id);
        console.log('📊 Calendarprod: Database user ID:', dbId);
        setDbUserId(dbId);
      } else {
        console.log('⚠️ Calendarprod: No Clerk user available');
        setDbUserId(null);
      }
    };

    fetchDbUserId();
  }, [user]);

  // Fetch data when database user ID is available
  useEffect(() => {
    const fetchData = async () => {
      if (!dbUserId) {
        console.log('⚠️ Calendarprod: No database user ID, skipping data fetch');
        return;
      }
      
      console.log('📊 Calendarprod: Fetching calendar and email data for user:', dbUserId);
      setLoading(true);
      
      const [eventsData, emailsData] = await Promise.all([
        fetchCalendarEvents(),
        fetchEmails()
      ]);
      
      console.log('📅 Calendarprod: Calendar events fetched:', eventsData.length);
      console.log('📧 Calendarprod: Emails fetched:', emailsData.length);
      
      setCalendarEvents(eventsData);
      setEmails(emailsData);
      setLoading(false);
    };

    fetchData();
  }, [dbUserId, currentDate, fetchCalendarEvents, fetchEmails]);

  // Generate days with real data
  const DAYS = generateCalendarDays();

  // Filter days for calendar display (no sorting, maintain natural order)
  const filteredDays = React.useMemo(() => {
    return DAYS.map(day => {
      if (!day.meetingInfo) return day;
      
      let filteredMeetingInfo = day.meetingInfo;
      
      if (viewFilter === 'calendar') {
        // Only show calendar events (check if location is not 'Email')
        filteredMeetingInfo = day.meetingInfo.filter(meeting => meeting.location !== 'Email');
      } else if (viewFilter === 'email') {
        // Only show emails (check if location is 'Email')
        filteredMeetingInfo = day.meetingInfo.filter(meeting => meeting.location === 'Email');
      }
      // If viewFilter is null, show both (no filtering needed)
      
      return {
        ...day,
        meetingInfo: filteredMeetingInfo.length > 0 ? filteredMeetingInfo : undefined
      };
    });
  }, [viewFilter, DAYS]);

  // Sort days for right panel display only (prioritize selected/hovered day)
  const sortedDaysForPanel = React.useMemo(() => {
    // If a day is selected (pinned), only show that day's events
    if (selectedDay) {
      return filteredDays.filter(day => day.day === selectedDay);
    }
    
    // If only hovering (not pinned), show all days with hovered day first
    if (hoveredDay) {
      return [...filteredDays].sort((a, b) => {
        if (a.day === hoveredDay) return -1;
        if (b.day === hoveredDay) return 1;
        return 0;
      });
    }
    
    // No selection or hover, show all days
    return filteredDays;
  }, [selectedDay, hoveredDay, filteredDays]);

  // Show loading state
  if (!user || loading || !dbUserId) {
    return (
      <div className="relative mx-auto my-10 flex w-full flex-col items-center justify-center gap-8 lg:flex-row">
        <div className="w-full max-w-lg">
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center justify-between">
              <h2 className="mb-2 text-4xl font-bold tracking-wider text-zinc-300">
                {format(currentDate, 'MMM')} <span className="opacity-50">{format(currentDate, 'yyyy')}</span>
              </h2>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="px-0/5 rounded-xl bg-[#323232] py-1 text-center text-xs text-white"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }).map((_, index) => (
                <div
                  key={index}
                  className="relative flex items-center justify-center py-1 bg-zinc-700/20 animate-pulse"
                  style={{ height: '4rem', borderRadius: 16 }}
                />
              ))}
            </div>
            <div className="mt-8 text-center">
              <TextShimmer className="font-mono text-lg text-zinc-300" duration={1}>
                loading calendar...
              </TextShimmer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore */}
      <motion.div
        ref={ref}
        className="relative mx-auto my-10 flex w-full flex-col items-center justify-center gap-8 lg:flex-row"
        {...props}
      >
        <motion.div layout className="w-full max-w-lg">
          <motion.div
            key="calendar-view"
            className="flex w-full flex-col gap-4"
          >
            <div className="flex w-full items-center justify-between">
              <motion.h2 className="mb-2 text-4xl font-bold tracking-wider text-zinc-300">
                {format(currentDate, 'MMM')} <span className="opacity-50">{format(currentDate, 'yyyy')}</span>
              </motion.h2>
              <div className="flex items-center gap-2">
                <motion.button
                  className={`relative flex items-center gap-2 rounded-lg border border-[#323232] px-3 py-1.5 text-sm transition-colors ${
                    viewFilter === 'calendar' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                  }`}
                  onClick={() => setViewFilter(viewFilter === 'calendar' ? null : 'calendar')}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </motion.button>
                <motion.button
                  className={`relative flex items-center gap-2 rounded-lg border border-[#323232] px-3 py-1.5 text-sm transition-colors ${
                    viewFilter === 'email' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                  }`}
                  onClick={() => setViewFilter(viewFilter === 'email' ? null : 'email')}
                >
                  <Mail className="h-4 w-4" />
                  <span>Gmail</span>
                </motion.button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="px-0/5 rounded-xl bg-[#323232] py-1 text-center text-xs text-white"
                >
                  {day}
                </div>
              ))}
            </div>
            <CalendarGrid onHover={handleDayHover} onClick={handleDayClick} selectedDay={selectedDay} days={filteredDays} />
          </motion.div>
        </motion.div>
        {moreView && (
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              key="more-view"
              className="mt-4 flex w-full flex-col gap-4"
            >
              <div className="flex w-full flex-col items-start justify-between">
                <p className="font-medium text-zinc-300/50">
                  {viewFilter === 'calendar' 
                    ? 'Calendar events for this month.' 
                    : viewFilter === 'email' 
                    ? 'Gmail emails for this month.' 
                    : 'Calendar events and emails for this month.'}
                </p>
              </div>
              <motion.div
                className="flex h-[620px] flex-col items-start justify-start overflow-hidden overflow-y-scroll rounded-xl border-2 border-[#323232] shadow-md"
                layout
              >
                <AnimatePresence>
                  {sortedDaysForPanel
                    .filter((day) => day.meetingInfo)
                    .map((day) => (
                      <motion.div
                        key={day.day}
                        className={`w-full border-b-2 border-[#323232] py-0 last:border-b-0`}
                        layout
                      >
                        {day.meetingInfo &&
                          day.meetingInfo.map((meeting, mIndex) => (
                            <motion.div
                              key={mIndex}
                              className="border-b border-[#323232] p-3 last:border-b-0"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{
                                duration: 0.2,
                                delay: mIndex * 0.05,
                              }}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm text-white">
                                  {meeting.date}
                                </span>
                                <span className="text-sm text-white">
                                  {meeting.time}
                                </span>
                              </div>
                              <h3 className="mb-1 text-lg font-semibold text-white">
                                {meeting.title}
                              </h3>
                              <p className="mb-1 text-sm text-zinc-600">
                                {meeting.participants.join(', ')}
                              </p>
                              <div className="flex items-center text-blue-500">
                                <svg
                                  className="mr-1 h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                <span className="text-sm">
                                  {meeting.location}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
Calendarprod.displayName = 'Calendarprod';

export default Calendarprod;



const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];