import { Card } from "@/components/ui/card";
import { 
  Calendar,
  Mail,
  Phone,
  Users,
  MessageSquare,
  Activity,
  Clock,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export function BentoBox() {
  const [unreadEmails, setUnreadEmails] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemType, setItemType] = useState<'email' | 'event'>('email');
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchData = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch unread emails
      const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('is_read', false)
        .order('date_received', { ascending: false });

      // Fetch today's calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      setUnreadEmails(emails || []);
      setTodayEvents(events || []);
    };

    fetchData();

    // Set up real-time subscriptions
    const emailsSubscription = supabase
      .channel('emails_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'emails',
        filter: 'is_read=false'
      }, () => fetchData())
      .subscribe();

    const eventsSubscription = supabase
      .channel('events_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calendar_events'
      }, () => fetchData())
      .subscribe();

    return () => {
      emailsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, []);

  const handleItemClick = (item: any, type: 'email' | 'event') => {
    setSelectedItem(item);
    setItemType(type);
    setSheetOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Calendar Stats */}
      <Card 
        className="bg-white text-black p-4 hover:bg-gray-50 transition-colors cursor-pointer"
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
      </Card>

      {/* Email Stats */}
      <Card 
        className="bg-black text-white p-4 hover:bg-neutral-900 transition-colors cursor-pointer"
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
          <Clock className="w-5 h-5 text-gray-400" />
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
            <SheetTitle className="flex justify-between items-center">
              {itemType === 'email' ? 'Email Details' : 'Event Details'}
              <button onClick={() => setSheetOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </SheetTitle>
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
                    Received: {formatDistanceToNow(new Date(selectedItem.date_received), { addSuffix: true })}
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