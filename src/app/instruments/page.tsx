import { createClientWithAuth } from '@/utils/supabase/clerk-integration';
import { auth } from '@clerk/nextjs/server';

export default async function InstrumentsPage() {
  // Get the Clerk session
  const { userId } = await auth();
  
  // Create Supabase client with Clerk authentication
  const supabase = await createClientWithAuth();
  
  // Fetch instruments data from Supabase
  const { data: instruments, error } = await supabase.from("instruments").select();
  
  if (error) {
    console.error('Error fetching instruments:', error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Instruments</h1>
        <div className="bg-red-100 p-4 rounded-md text-red-700">
          Error loading instruments: {error.message}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Integration Example</h1>
      <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Authentication Status</h2>
        <p className="mb-1"><span className="font-medium">Auth Provider:</span> Clerk</p>
        <p className="mb-1"><span className="font-medium">User ID:</span> {userId || 'Not authenticated'}</p>
        <p className="mb-1"><span className="font-medium">Database:</span> Supabase</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Instruments Data</h2>
        
        {instruments && instruments.length > 0 ? (
          <>
            <ul className="divide-y divide-gray-200">
              {instruments.map((instrument) => (
                <li key={instrument.id} className="py-3 flex items-center">
                  <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                    #{instrument.id}
                  </span>
                  <span className="text-lg">{instrument.name}</span>
                </li>
              ))}
            </ul>
            
            <details className="mt-6 bg-gray-50 p-3 rounded-md">
              <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                View Raw JSON Data
              </summary>
              <pre className="mt-2 p-3 bg-gray-800 text-white rounded text-sm overflow-auto">
                {JSON.stringify(instruments, null, 2)}
              </pre>
            </details>
          </>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 border border-yellow-200">
            <p className="font-medium">No instruments found.</p>
            <p className="text-sm mt-1">Please make sure your Supabase database has an instruments table with sample data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
