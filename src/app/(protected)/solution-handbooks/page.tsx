"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PromptBox } from '@/components/ui/chatgpt-prompt-input'
import { useAuth } from "@clerk/nextjs"

export default function SolutionHandbooks() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();
  const [prompt, setPrompt] = useState('');
  
  const handleSendMessage = async (files: File[]) => {
    if (isSubmitting) return;
    if (!userId) {
      setError("You must be logged in to create a handbook");
      return;
    }
    
    if (!prompt) {
      setError("Please enter a prompt");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log('Files being uploaded:', files.map(f => ({
        name: f.name,
        type: f.type,
        size: `${(f.size / 1024).toFixed(2)} KB`
      })));
      
      // Create form data to send to n8n
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      // Add all files to form data
      if (files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      // Send the request to n8n
      const response = await fetch('https://srv-roxra.app.n8n.cloud/webhook/5bf5071c-57f4-4219-b7ad-414d516be1de', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process handbook');
      }

      // Get the handbook ID from response
      const data = await response.json();
      console.log(data);
      const id = data.id;

      // Redirect to the handbook detail page
      router.push(`/solution-handbooks/${id}`);
    } catch (error: any) {
      console.error('Error submitting handbook:', error);
      setError(error.message || 'Failed to process your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      <div className="w-full max-w-2xl px-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <h1 className="text-2xl font-bold mb-6 text-center">Create Solution Handbook</h1>
        
        <div className="w-full">
          <PromptBox 
            name="message" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onSend={handleSendMessage}
            className="w-full shadow-sm" 
            // disabled={isSubmitting}
            disabled={false}
            placeholder={isSubmitting ? "Processing..." : "Enter your prompt here..."}
          />
        </div>
        
        {isSubmitting && (
          <div className="mt-4 text-center text-gray-600">
            <p>Creating your solution handbook...</p>
            <p className="text-sm mt-2">You will be redirected when ready</p>
          </div>
        )}
      </div>
    </div>
  );
}
