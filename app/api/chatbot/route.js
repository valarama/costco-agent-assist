import { NextResponse } from 'next/server';
import vertexai from '@google-cloud/vertexai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { question } = await request.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        answer: 'Please ask a question'
      }, { status: 400 });
    }

    const projectId = 'arcane-rigging-473104-k3';
    const location = 'us-central1';
    
    const vertex_ai = new vertexai.VertexAI({project: projectId, location: location});
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `You are a Costco Smart Appliance Support assistant with knowledge about smart fridges, washers, switches, and other connected home appliances.

Question: ${question}

Provide a helpful 2-3 sentence answer about smart appliance setup, WiFi/Bluetooth connectivity, troubleshooting, or Costco products.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.candidates[0].content.parts[0].text;

    return NextResponse.json({
      success: true,
      answer: answer.trim()
    });

  } catch (error) {
    console.error('Chatbot Error:', error.message);
    return NextResponse.json({
      success: false,
      answer: 'Unable to process request. Please try again.',
      error: error.message
    }, { status: 500 });
  }
}
