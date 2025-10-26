import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const storage = new Storage();
    const bucket = storage.bucket('service-ticket');
    
    const [files] = await bucket.getFiles({ prefix: 'transcripts/' });
    
    const jsonFiles = files
      .filter(file => file.name.endsWith('.json'))
      .sort((a, b) => {
        const aTime = new Date(a.metadata.timeCreated).getTime();
        const bTime = new Date(b.metadata.timeCreated).getTime();
        return bTime - aTime;
      });

    if (jsonFiles.length === 0) {
      return NextResponse.json({ 
        sessionId: null,
        source: 'gcs-empty'
      });
    }

    const latestFile = jsonFiles[0];
    const sessionId = latestFile.name.replace('transcripts/', '').replace('.json', '');
    
    return NextResponse.json({ 
      sessionId,
      source: 'gcs-bucket',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Latest session error:', error);
    return NextResponse.json({ 
      sessionId: null,
      source: 'error',
      error: error.message
    }, { status: 500 });
  }
}
