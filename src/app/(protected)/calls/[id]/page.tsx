"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Call {
  id: string;
  name: string;
  customer_id: string;
  duration: number;
  status: string;
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  end_time: string | null;
  created_at: string;
  recording_url: string | null;
  meeting_url: string | null;
  transcript: any | null;
  notes: string | null;
  action_items: any[] | null;
  customers?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Participant {
  id: string;
  call_id: string;
  participant_type: string;
  agent_id: string | null;
  contact_id: string | null;
  role: string | null;
  joined_at: string | null;
  left_at: string | null;
  name: string;
}

interface CallAnalysis {
  id: string;
  call_id: string;
  overall_sentiment: number;
  customer_sentiment: number;
  agent_sentiment: number;
  call_quality_score: number;
  compliance_score: number;
  empathy_score: number;
  resolution_status: string;
  resolution_time_seconds: number;
  talk_ratio: number;
  interruption_count: number;
  question_count: number;
  call_summary: string;
  key_insights: string[];
  context_notes: string;
  sentiment_narrative: string;
  sentiment_drivers: string[];
  expansion_opportunities: any;
  buying_signals: string[];
  competitor_mentions: any;
  success_blockers: string[];
  training_needs: string[];
  stakeholder_insights: any;
  product_feedback: any;
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const callId = params.id as string;
  
  const [call, setCall] = useState<Call | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch call data, participants, and analysis
  useEffect(() => {
    async function fetchCallData() {
      try {
        setLoading(true);
        
        // Get call data with customer details
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select(`
            *,
            customers (name, email, phone)
          `)
          .eq('id', callId)
          .single();
        
        if (callError) throw callError;
        if (!callData) throw new Error('Call not found');
        
        setCall(callData);
        
        // Get call participants
        const { data: participantData, error: participantError } = await supabase
          .from('call_participants')
          .select('*')
          .eq('call_id', callId)
          .order('joined_at', { ascending: true });
        
        if (participantError) throw participantError;
        setParticipants(participantData || []);
        
        // Get call analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from('call_analysis')
          .select('*')
          .eq('call_id', callId)
          .maybeSingle();
        
        if (analysisError) throw analysisError;
        setAnalysis(analysisData);
        
      } catch (err: any) {
        console.error('Error loading call data:', err);
        setError(err.message || 'Failed to load call details');
      } finally {
        setLoading(false);
      }
    }
    
    if (callId) {
      fetchCallData();
    }
  }, [callId, supabase]);
  
  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Determine if a participant is an agent or customer contact
  const getParticipantType = (participant: Participant) => {
    return participant.participant_type === 'agent' ? 'Agent' : 'Customer';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error || 'Call not found'}</p>
        </div>
        <div className="mt-4">
          <Link href="/calls" className="text-blue-600 hover:underline">
            &larr; Back to Calls
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/calls" className="text-blue-600 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Calls
        </Link>
      </div>

      {/* Call Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <h1 className="text-2xl font-bold">{call.name || 'Untitled Call'}</h1>
            <p className="text-gray-600 mt-1">
              Customer: <Link href={`/customers/${call.customer_id}`} className="text-blue-600 hover:underline">
                {call.customers?.name || 'Unknown Customer'}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <div>
                <span className="text-gray-500 text-sm">Status:</span>
                <span className={`ml-2 px-2 py-1 text-xs leading-5 font-semibold rounded-full ${call.status === 'completed' ? 'bg-green-100 text-green-800' : call.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {call.status || 'unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Duration:</span>
                <span className="ml-2 text-sm">{call.duration ? formatDuration(call.duration) : 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Call Time:</span>
                <span className="ml-2 text-sm">{formatDate(call.actual_start_time || call.scheduled_start_time)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col gap-2">
            {call.recording_url && (
              <a 
                href={call.recording_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                View Recording
              </a>
            )}
            {call.meeting_url && (
              <a 
                href={call.meeting_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Meeting Link
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Call Content - Tabs for Participants and Analysis */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button className="w-1/2 py-4 px-1 text-center border-b-2 border-blue-500 font-medium text-sm text-blue-600">
              Participants ({participants.length})
            </button>
            <button className="w-1/2 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Call Analysis {analysis ? '✓' : ''}
            </button>
          </nav>
        </div>
        
        {/* Participants Section */}
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Call Participants</h2>
          
          {participants.length === 0 ? (
            <p className="text-gray-500">No participants found for this call.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className={`border rounded-lg p-4 ${participant.participant_type === 'agent' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${participant.participant_type === 'agent' ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium">{participant.name || 'Unknown Participant'}</h3>
                      <p className="text-sm text-gray-500">{getParticipantType(participant)}</p>
                      <div className="mt-2 text-sm">
                        {participant.role && (
                          <div className="text-gray-600">Role: {participant.role}</div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:gap-4 mt-1">
                          {participant.joined_at && (
                            <div className="text-gray-600">Joined: {formatDate(participant.joined_at)}</div>
                          )}
                          {participant.left_at && (
                            <div className="text-gray-600">Left: {formatDate(participant.left_at)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Call Analysis Section */}
          {analysis && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Call Analysis</h2>
              
              {/* Summary and Main Metrics */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-lg mb-2">Call Summary</h3>
                <p className="text-gray-700">{analysis.call_summary || 'No summary available'}</p>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Overall Sentiment</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold">{analysis.overall_sentiment?.toFixed(1) || 'N/A'}</span>
                    <span className="text-sm text-gray-500 ml-1">/10</span>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Customer Sentiment</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold">{analysis.customer_sentiment?.toFixed(1) || 'N/A'}</span>
                    <span className="text-sm text-gray-500 ml-1">/10</span>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Call Quality</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold">{analysis.call_quality_score || 'N/A'}</span>
                    <span className="text-sm text-gray-500 ml-1">/100</span>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Empathy Score</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold">{analysis.empathy_score || 'N/A'}</span>
                    <span className="text-sm text-gray-500 ml-1">/100</span>
                  </div>
                </div>
              </div>
              
              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <h3 className="font-medium mb-3">Conversation Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Talk Ratio (Agent:Customer)</span>
                        <span className="font-medium">{analysis.talk_ratio ? `${(analysis.talk_ratio * 100).toFixed(0)}:${(100 - analysis.talk_ratio * 100).toFixed(0)}` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interruptions</span>
                        <span className="font-medium">{analysis.interruption_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions Asked</span>
                        <span className="font-medium">{analysis.question_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resolution Status</span>
                        <span className="font-medium">{analysis.resolution_status || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resolution Time</span>
                        <span className="font-medium">{analysis.resolution_time_seconds ? formatDuration(analysis.resolution_time_seconds) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {analysis.key_insights && analysis.key_insights.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                      <h3 className="font-medium mb-3">Key Insights</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.key_insights.map((insight, index) => (
                          <li key={index} className="text-gray-700">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.buying_signals && analysis.buying_signals.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h3 className="font-medium mb-3">Buying Signals</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.buying_signals.map((signal, index) => (
                          <li key={index} className="text-gray-700">{signal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div>
                  {analysis.sentiment_narrative && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                      <h3 className="font-medium mb-3">Sentiment Analysis</h3>
                      <p className="text-gray-700 mb-3">{analysis.sentiment_narrative}</p>
                      
                      {analysis.sentiment_drivers && analysis.sentiment_drivers.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Sentiment Drivers</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysis.sentiment_drivers.map((driver, index) => (
                              <li key={index} className="text-gray-700">{driver}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {analysis.success_blockers && analysis.success_blockers.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                      <h3 className="font-medium mb-3">Success Blockers</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.success_blockers.map((blocker, index) => (
                          <li key={index} className="text-gray-700">{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.training_needs && analysis.training_needs.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h3 className="font-medium mb-3">Training Needs</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.training_needs.map((need, index) => (
                          <li key={index} className="text-gray-700">{need}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
