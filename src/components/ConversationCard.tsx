'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

interface ConversationCardProps {
  id: string;
  name: string;
  avatarUrl?: string | null;
  platform: string;
  type: string;
  memberCount?: number;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  metadata?: any;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  id,
  name,
  avatarUrl,
  platform,
  type,
  memberCount,
  lastMessage,
  lastMessageTimestamp,
  metadata,
}) => {
  const router = useRouter();
  
  const handleClick = () => {
    router.push(`/conversations/${id}`);
  };
  
  const platformIcons = {
    whatsapp: '💬',
    telegram: '📱',
    slack: '🔷',
    email: '📧',
  };

  const platformIcon = platformIcons[platform as keyof typeof platformIcons] || '💬';
  
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get the latest message content from metadata if available and not explicitly provided
  const messageContent = lastMessage || 
    (metadata?.latest_message?.body ? metadata.latest_message.body : 'No messages yet');
    
  // Extract sender name for the message if available
  let senderName = '';
  if (metadata?.latest_message?.sender_phone && metadata?.members && 
      metadata.members[metadata.latest_message.sender_phone]) {
    senderName = metadata.members[metadata.latest_message.sender_phone].contact_name || 'Unknown';
  }
  
  // Format message preview with sender name for groups
  const messagePreview = type === 'group' && senderName && !metadata?.latest_message?.from_me ? 
    `${senderName.split(' ')[0]}: ${messageContent}` : 
    messageContent;
  
  // Get actual timestamp from metadata if available
  const timestamp = lastMessageTimestamp || 
    (metadata?.latest_message?.timestamp ? metadata.latest_message.timestamp : null);
  
  return (
    <Card 
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl overflow-hidden mr-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              platformIcon
            )}
            {/* Show online/status indicator for WhatsApp */}
            {platform === 'whatsapp' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900 truncate pr-2">{name}</h3>
              {timestamp && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimestamp(timestamp)}
                </span>
              )}
            </div>
            
            <div className="flex justify-between mt-1">
              <p className="text-sm text-gray-600 truncate max-w-[200px]">
                {messagePreview}
              </p>
              <div className="ml-2 flex items-center">
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded bg-blue-100 text-blue-800">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {type === 'group' && memberCount && (
          <div className="mt-2 text-xs text-gray-500">
            {memberCount} members
            {metadata?.info_admins_only && <span className="ml-2 text-amber-600">• Admin messages only</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationCard;
