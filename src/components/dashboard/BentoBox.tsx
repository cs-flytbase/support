import { Card } from "@/components/ui/card";
import { 
  Calendar,
  Mail,
  Phone,
  Users,
  MessageSquare,
  Activity,
  Clock
} from "lucide-react";

export function BentoBox() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Calls Stats */}
      <Card className="bg-black text-white p-4 hover:bg-neutral-900 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Recent Calls</p>
            <h3 className="text-xl font-bold">24</h3>
          </div>
        </div>
      </Card>

      {/* Calendar Stats */}
      <Card className="bg-white text-black p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/10 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Meetings Today</p>
            <h3 className="text-xl font-bold">5</h3>
          </div>
        </div>
      </Card>

      {/* Email Stats */}
      <Card className="bg-black text-white p-4 hover:bg-neutral-900 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Unread Emails</p>
            <h3 className="text-xl font-bold">12</h3>
          </div>
        </div>
      </Card>

      {/* Messages Stats */}
      <Card className="bg-white text-black p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/10 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">New Messages</p>
            <h3 className="text-xl font-bold">8</h3>
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

      {/* Team Members */}
      <Card className="bg-white text-black p-4 md:col-span-2 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-black/10 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Team Activity</p>
            <h3 className="text-xl font-bold">Online Members</h3>
          </div>
        </div>
        <div className="flex -space-x-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-black/10 border-2 border-white flex items-center justify-center text-xs font-medium"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-black/5 border-2 border-white flex items-center justify-center text-xs font-medium">
            +3
          </div>
        </div>
      </Card>
    </div>
  );
} 