import { NextRequest, NextResponse } from 'next/server';
import { getStoredDocument } from '../summarize/route';

// Predefined questions from the provided code
export const defaultQuestions = [
  "Who is the petitioner in the case?",
  "Who is the respondent in the case?",
  "What is the case summary?",
  "What was the court's decision?",
  "What legal provisions are applied?",
  "What were the main arguments from both sides?",
  "What is the reasoning behind the decision?",
  "Were there any precedents cited?",
  "Were there any dissenting opinions?",
  "What penalties or consequences were given?",
  "What are the implications of the case?",
  "What facts were established in the case?",
  "What evidence was presented?",
  "What are the key legal issues in the case?",
  "What is the timeline of events?"
];

/**
 * Process a question using the custom QA model
 */
export async function POST(request: NextRequest) {
  try {
    const { question, fingerprint } = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }
    
    // Get the document from the store
    const document = await getStoredDocument(fingerprint);
    
    if (!document.content) {
      return NextResponse.json(
        { error: 'No document found. Please upload a document first.' },
        { status: 404 }
      );
    }
    
    // Create URL for the custom question-answer endpoint
    const qaApiUrl = new URL(request.url);
    qaApiUrl.pathname = '/api/question-answer';
    
    // Create a new request to forward to the custom implementation
    const forwardRequest = new Request(qaApiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        fingerprint,
        documentContent: document.content,
        documentName: document.fileName
      })
    });
    
    // Forward the request to the custom QA implementation
    const response = await fetch(forwardRequest);
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error processing question:', error);
    return NextResponse.json(
      { error: 'Failed to process the question' },
      { status: 500 }
    );
  }
}

// Endpoint to get the list of default questions
export async function GET() {
  return NextResponse.json({ questions: defaultQuestions });
}
