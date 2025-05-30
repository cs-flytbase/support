import React from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Call, Conversation, Participant } from '../types';
import { Phone, MessageSquare, Clock, Calendar, User, Users } from 'lucide-react';

interface CommunicationTabsProps {
  conversations: Conversation[];
  calls: Call[];
  participants: Record<string, Participant[]>;
  formatDate: (date: string | null) => string;
  formatDuration: (seconds: number | null) => string;
}

export const CommunicationTabs: React.FC<CommunicationTabsProps> = ({
  conversations,
  calls,
  participants,
  formatDate,
  formatDuration
}) => {
  const router = useRouter();
  
  // Function to navigate to call details page
  const navigateToCallDetails = (callId: string) => {
    router.push(`/calls/${callId}`);
  };
  
  // Function to navigate to conversation details page
  const navigateToConversationDetails = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };
  return (
    <Card className="mt-8 shadow-md">
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          Communication History
        </h3>
      </div>
      
      <CardContent className="p-6">
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2 h-auto">
            <TabsTrigger value="conversations" className="py-2 data-[state=active]:shadow-md">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Conversations</span>
                <Badge variant="secondary" className="ml-2 bg-slate-100 hover:bg-slate-100">{conversations.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger value="calls" className="py-2 data-[state=active]:shadow-md">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>Calls</span>
                <Badge variant="secondary" className="ml-2 bg-slate-100 hover:bg-slate-100">{calls.length}</Badge>
              </div>
            </TabsTrigger>
          </TabsList>
        
        <TabsContent value="conversations" className="space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No conversations found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Last Message
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {conversations.map((conversation) => (
                    <tr 
                      key={conversation.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigateToConversationDetails(conversation.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:underline">{conversation.title}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">
                          {conversation.platform_type || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          {conversation.is_group ? (
                            <>
                              <Users className="h-3 w-3" />
                              <span>Group</span>
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3" />
                              <span>Direct</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={
                          conversation.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' :
                          conversation.status === 'archived' ? 'bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-100' :
                          'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-100'
                        }>
                          {conversation.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(conversation.last_message_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(conversation.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="calls" className="space-y-4">
          {calls.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
              <Phone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No calls found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {calls.map((call) => (
                    <tr 
                      key={call.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigateToCallDetails(call.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:underline">{call.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={
                          call.status === 'completed' ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' : 
                          call.status === 'scheduled' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100' : 
                          'bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-100'
                        }>
                          {call.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(call.actual_start_time || call.scheduled_start_time)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500">
                          {participants[call.id] ? (
                            <div className="flex flex-wrap gap-1">
                              {participants[call.id].map((participant, idx) => (
                                <Badge 
                                  key={participant.id} 
                                  variant="outline"
                                  className={
                                    participant.role === 'host' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                    participant.role === 'presenter' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                    'bg-slate-50 text-slate-700 border-slate-100'
                                  }
                                >
                                  {participant.name} ({participant.role})
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">No participants</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </CardContent>
    </Card>
  );
};

