import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Call, Conversation, Participant } from '../types';

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
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="text-md font-medium mb-4">Communication History</h4>
      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="conversations">
            Conversations ({conversations.length})
          </TabsTrigger>
          <TabsTrigger value="calls">
            Calls ({calls.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations" className="space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No conversations found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Message
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{conversation.title}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {conversation.platform_type || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {conversation.is_group ? 'Group' : 'Direct'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          <span className={
                            `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${conversation.status === 'active' ? 'bg-green-100 text-green-800' :
                              conversation.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'}`
                          }>
                            {conversation.status || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(conversation.last_message_at)}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
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
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No calls found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Time
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{call.name}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          <span className={
                            `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${call.status === 'completed' ? 'bg-green-100 text-green-800' :
                              call.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'}`
                          }>
                            {call.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDuration(call.duration)}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(call.actual_start_time || call.scheduled_start_time)}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(call.end_time)}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm text-gray-500">
                          {participants[call.id] ? (
                            <div className="flex flex-wrap gap-1">
                              {participants[call.id].map((participant, idx) => (
                                <span 
                                  key={participant.id} 
                                  className={
                                    `px-2 py-1 text-xs rounded-full 
                                    ${participant.role === 'host' ? 'bg-purple-100 text-purple-800' : 
                                     participant.role === 'presenter' ? 'bg-blue-100 text-blue-800' : 
                                     'bg-gray-100 text-gray-800'}`
                                  }
                                >
                                  {participant.name} ({participant.role})
                                  {idx < participants[call.id].length - 1 ? '' : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            'No participants'
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
    </div>
  );
};
