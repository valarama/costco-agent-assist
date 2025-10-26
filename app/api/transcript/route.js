import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import vertexai from '@google-cloud/vertexai';

export const dynamic = 'force-dynamic';

async function getGeminiSuggestions(transcript) {
  try {
    const projectId = 'arcane-rigging-473104-k3';
    const location = 'us-central1';
    
    const vertex_ai = new vertexai.VertexAI({project: projectId, location: location});
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `You are an AI assistant for Costco Smart Appliance Support agents. Analyze this customer service conversation and provide:

1. **Agent Behavior Suggestions** (3-5 bullet points):
   - What should the agent do next?
   - How to handle the customer's needs professionally?

2. **Upsell Opportunity** (Yes/No + explanation):
   - Can we offer extended warranty, accessories, or related products?

3. **Recommended Questions** (3-4 short questions):
   - Questions the agent should ask to help the customer

Conversation:
${transcript}

Respond in this exact JSON format:
{
  "behavior": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "upsell": {
    "possibility": "Yes" or "No",
    "explanation": "brief explanation"
  },
  "questions": ["question 1?", "question 2?", "question 3?"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.candidates[0].content.parts[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse Gemini response');

  } catch (error) {
    console.error('Gemini suggestions error:', error);
    return {
      behavior: [
        'Acknowledge customer\'s smart appliance needs positively',
        'Ask for specific device model to provide accurate guidance',
        'Provide clear step-by-step instructions',
        'Verify each step completed before moving forward'
      ],
      upsell: {
        possibility: 'Yes',
        explanation: 'Customer has smart appliance - opportunity for extended warranty or accessories'
      },
      questions: [
        'What is your appliance model number?',
        'Is your device powered on and connected?',
        'Do you have the companion app installed?',
        'Would you like help with any other features?'
      ]
    };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const storage = new Storage();
    const bucket = storage.bucket('service-ticket');
    const file = bucket.file(`transcripts/${sessionId}.json`);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ 
        messages: [],
        suggestions: {
          behavior: ['No transcript available'],
          upsell: { possibility: 'No', explanation: '' },
          questions: []
        },
        error: 'Transcript not found'
      }, { status: 404 });
    }

    const [contents] = await file.download();
    const data = JSON.parse(contents.toString());

    // Parse the cleaned transcript
    const transcript = data.transcript || '';
    const lines = transcript.split('\n').filter(line => line.trim());

    const messages = lines.map((line, idx) => {
      const isAgent = line.startsWith('Agent:');
      const isCustomer = line.startsWith('Customer:');
      
      let role = 'agent';
      let text = line;
      
      if (isAgent) {
        role = 'agent';
        text = line.replace('Agent:', '').trim();
      } else if (isCustomer) {
        role = 'customer';
        text = line.replace('Customer:', '').trim();
      }

      // Remove all instances of "asterisk" from text
      text = text.replace(/\basterisk\b/gi, '').replace(/\s+/g, ' ').trim();

      return {
        role,
        text,
        sentiment: 'Neutral',
        time: new Date(data.transcribedAt).toLocaleTimeString()
      };
    });

    // Get live suggestions from Gemini
    console.log('Generating live suggestions with Gemini...');
    const suggestions = await getGeminiSuggestions(transcript);

    return NextResponse.json({ 
      messages, 
      suggestions,
      sessionId: data.sessionId,
      audioFile: data.audioFile,
      transcribedAt: data.transcribedAt
    });

  } catch (error) {
    console.error('Get transcript error:', error);
    return NextResponse.json({
      messages: [],
      suggestions: {
        behavior: ['Error loading transcript'],
        upsell: { possibility: 'No', explanation: '' },
        questions: []
      },
      error: error.message
    }, { status: 500 });
  }
}
