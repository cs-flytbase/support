"use client"
import { Card } from "@/components/ui/card";
import { 
  Calendar,
  Mail,
  Phone,
  Users,
  MessageSquare,
  Activity,
  Clock,
  X,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { showRealtimeToast } from '@/components/ui/realtime-toast';
import { useUser } from '@clerk/nextjs';
import { TextShimmer } from '@/components/ui/text-shimmer';

interface EmailData {
  id: number;
  subject: string;
  sender_email: string;
  sender_name?: string;
  received_at: string;
  html_content?: string;
  content?: string;
  is_read: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  organizer_name?: string;
  organizer_email?: string;
}

export function BentoBox() {
  const [unreadEmails, setUnreadEmails] = useState<EmailData[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemType, setItemType] = useState<'email' | 'event'>('email');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('CLOSED');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // Subscription refs to manage cleanup
  const subscriptionsRef = useRef<any[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { user } = useUser();

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

  // Fetch unread emails
  const fetchEmails = useCallback(async () => {
    if (!dbUserId) return [];
    
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('id, sender_email, subject, received_at, sender_name, html_content, content, is_read')
        .eq('user_id', dbUserId)
        .eq('is_read', false)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('Error fetching emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }, [dbUserId, supabase]);

  // Fetch today's calendar events
  const fetchCalendarEvents = useCallback(async () => {
    if (!dbUserId) return [];
    
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, summary, description, start_time, end_time, location, attendees, organizer_name, organizer_email')
        .eq('user_id', dbUserId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
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
  }, [dbUserId, supabase]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (!dbUserId) return;
    
    console.log('🔄 BentoBox: Manual refresh triggered');
    setLoading(true);
    
    try {
      const [eventsData, emailsData] = await Promise.all([
        fetchCalendarEvents(),
        fetchEmails()
      ]);
      
      setTodayEvents(eventsData);
      setUnreadEmails(emailsData);
      setLastSync(new Date());
      
      console.log('✅ BentoBox: Manual refresh completed');
    } catch (error) {
      console.error('❌ BentoBox: Manual refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [dbUserId, fetchCalendarEvents, fetchEmails]);

  // Get database user ID when Clerk user is available
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (user?.id) {
        console.log('🔍 BentoBox: Fetching database user ID for Clerk user:', user.id);
        const dbId = await getDbUserId(user.id);
        console.log('📊 BentoBox: Database user ID:', dbId);
        setDbUserId(dbId);
      } else {
        console.log('⚠️ BentoBox: No Clerk user available');
        setDbUserId(null);
      }
    };

    fetchDbUserId();
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!dbUserId) return;

    console.log('🔄 BentoBox: Setting up real-time subscriptions');

    // Cleanup any existing subscriptions first
    subscriptionsRef.current.forEach(subscription => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    subscriptionsRef.current = [];

    // Subscribe to emails changes
    const emailsChannel = supabase
      .channel(`emails_${dbUserId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emails',
          filter: `user_id=eq.${dbUserId} AND is_read=eq.false`
        },
        async (payload) => {
          console.log('📧 BentoBox: Real-time email update:', payload);
          await refreshData();
          
          if (payload.eventType === 'INSERT') {
            showRealtimeToast.emailAdded(payload.new.subject || 'New Email');
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 BentoBox: Email subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('CONNECTED');
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('DISCONNECTED');
          setIsConnected(false);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            emailsChannel.subscribe();
          }, 5000);
        }
      });

    // Subscribe to calendar events changes
    const eventsChannel = supabase
      .channel(`events_${dbUserId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${dbUserId}`
        },
        async (payload) => {
          console.log('🔄 BentoBox: Received calendar update:', payload);
          await refreshData();
          
          toast(
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Calendar Updated</p>
                <p className="text-sm text-muted-foreground">
                  A meeting has been {payload.eventType.toLowerCase()}d
                </p>
              </div>
            </div>,
            {
              duration: 3000,
              position: "bottom-right",
            }
          );
        }
      )
      .subscribe();

    // Store subscriptions for cleanup
    subscriptionsRef.current = [emailsChannel, eventsChannel];

    // Initial data fetch
    refreshData();

    // Cleanup function
    return () => {
      console.log('🧹 BentoBox: Cleaning up subscriptions');
      subscriptionsRef.current.forEach(subscription => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [dbUserId, supabase, refreshData]);

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      toast(
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div>
            <p className="font-medium text-green-700">Real-time Connected</p>
            <p className="text-sm text-muted-foreground">
              Updates will appear instantly
            </p>
          </div>
        </div>,
        {
          duration: 3000,
          position: "bottom-right",
        }
      );
    } else if (connectionStatus === 'DISCONNECTED') {
      toast(
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div>
            <p className="font-medium text-red-700">Real-time Disconnected</p>
            <p className="text-sm text-muted-foreground">
              Trying to reconnect...
            </p>
          </div>
        </div>,
        {
          duration: 5000,
          position: "bottom-right",
        }
      );
    }
  }, [connectionStatus]);

  const handleItemClick = (item: any, type: 'email' | 'event') => {
    setSelectedItem(item);
    setItemType(type);
    setSheetOpen(true);
  };

  // Show loading state
  if (!user || loading || !dbUserId) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/5 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <div className="w-5 h-5" />
              </div>
              <div>
                <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                <div className="h-6 w-12 bg-white/20 rounded" />
              </div>
            </div>
          </Card>
        ))}
        <div className="col-span-full text-center mt-4">
          <TextShimmer className="font-mono text-lg text-zinc-300" duration={1}>
            loading data...
          </TextShimmer>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Calendar Stats */}
      <Card 
        className="bg-white text-black p-4 hover:bg-gray-50 transition-colors cursor-pointer relative"
        onClick={() => handleItemClick(todayEvents[0], 'event')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/10 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Meetings Today</p>
            <h3 className="text-xl font-bold">{todayEvents.length}</h3>
          </div>
        </div>
        {todayEvents.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Next: {todayEvents[0].summary}
          </div>
        )}
      </Card>

      {/* Email Stats */}
      <Card 
        className="bg-black text-white p-4 hover:bg-neutral-900 transition-colors cursor-pointer relative"
        onClick={() => handleItemClick(unreadEmails[0], 'email')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Unread Emails</p>
            <h3 className="text-xl font-bold">{unreadEmails.length}</h3>
          </div>
        </div>
        {unreadEmails.length > 0 && (
          <div className="mt-3 text-sm text-gray-400 truncate">
            Latest: {unreadEmails[0].subject}
          </div>
        )}
      </Card>

      {/* Activity Graph - Span 2 columns */}
      <Card className="bg-black text-white p-4 md:col-span-2 hover:bg-neutral-900 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Activity Overview</p>
              <h3 className="text-xl font-bold">Daily Stats</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshData();
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="h-32 flex items-end justify-between gap-2">
          {[40, 70, 30, 85, 50, 60, 45].map((height, i) => (
            <div key={i} className="w-full bg-white/10 rounded-t" style={{ height: `${height}%` }} />
          ))}
        </div>
      </Card>

      {/* Sliding Panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {itemType === 'email' ? 'Email Details' : 'Event Details'}
            </SheetTitle>
            <button onClick={() => setSheetOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)] mt-4">
            {selectedItem && itemType === 'email' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedItem.subject}</h3>
                  <p className="text-sm text-gray-500">
                    From: {selectedItem.sender_name} ({selectedItem.sender_email})
                  </p>
                  <p className="text-sm text-gray-500">
                    Received: {formatDistanceToNow(new Date(selectedItem.received_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedItem.html_content || selectedItem.content }} />
              </div>
            )}
            {selectedItem && itemType === 'event' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedItem.summary}</h3>
                  <p className="text-sm text-gray-500">
                    Time: {new Date(selectedItem.start_time).toLocaleTimeString()} - {new Date(selectedItem.end_time).toLocaleTimeString()}
                  </p>
                  {selectedItem.location && (
                    <p className="text-sm text-gray-500">Location: {selectedItem.location}</p>
                  )}
                </div>
                {selectedItem.description && (
                  <div className="prose prose-sm max-w-none">
                    <p>{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.attendees && (
                  <div>
                    <h4 className="font-medium mb-2">Attendees:</h4>
                    <ul className="space-y-1">
                      {selectedItem.attendees.map((attendee: string, index: number) => (
                        <li key={index} className="text-sm">{attendee}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
} 