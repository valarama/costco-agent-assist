import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const storage = new Storage();
    const bucket = storage.bucket('service-ticket');
    
    const [files] = await bucket.getFiles({ prefix: 'transcripts/' });
    
    const conversations = files
      .filter(file => file.name.endsWith('.json'))
      .map(file => {
        const fileName = file.name.replace('transcripts/', '').replace('.json', '');
        const metadata = file.metadata;
        const created = new Date(metadata.timeCreated);
        
        return {
          sessionId: fileName,
          duration: '0m00s',
          turns: 0,
          channel: 'Audio',
          startTime: created.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          timestamp: created.getTime()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return NextResponse.json({ 
      conversations,
      source: 'gcs-bucket'
    });

  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json({
      conversations: [],
      source: 'error',
      error: error.message
    }, { status: 500 });
  }
}
