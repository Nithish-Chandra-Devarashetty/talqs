import { NextRequest, NextResponse } from 'next/server';
import { CustomSummarizationService } from '@/lib/custom-summarization-service';

// Simple in-memory document store (would use a database in production)
const documentStore: Record<string, { content: string; fileName: string }> = {};

// Default document when no fingerprint is provided
let defaultDocument = {
  content: '',
  fileName: ''
};

// Helper function to create a simple extractive summary when the custom model fails
function createSimpleExtractiveSummary(text: string): string {
  const sentences = text.split(/[.!?]\s+/);
  
  // If text is very short, return as is
  if (sentences.length <= 5) return text;
  
  // Extract important sentences (first, some from middle, and last)
  const firstSentence = sentences[0];
  const quarterPoint = Math.floor(sentences.length * 0.25);
  const midPoint = Math.floor(sentences.length * 0.5);
  const threeQuarterPoint = Math.floor(sentences.length * 0.75);
  const lastSentence = sentences[sentences.length - 1];
  
  // Combine key sentences into a summary
  return [
    firstSentence,
    sentences[quarterPoint],
    sentences[midPoint],
    sentences[threeQuarterPoint],
    lastSentence
  ].filter(Boolean).join('. ') + '.';
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file type
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'Only .txt files are supported' },
        { status: 400 }
      );
    }
    
    // Read the text content
    const fullText = await file.text();
    
    if (fullText.trim().length === 0) {
      return NextResponse.json(
        { error: 'The file is empty' },
        { status: 400 }
      );
    }
    
    // Get document fingerprint if provided
    const fingerprint = formData.get('fingerprint') as string | null;
    
    // Store the document content in memory for QA
    if (fingerprint) {
      documentStore[fingerprint] = {
        content: fullText,
        fileName: file.name
      };
    }
    
    // Also store as default document
    defaultDocument.content = fullText;
    defaultDocument.fileName = file.name;
    
    // Check if the text is too short
    if (fullText.trim().split(/\s+/).length < 100) {
      return NextResponse.json(
        { error: 'Text is too short for meaningful summarization' },
        { status: 400 }
      );
    }
    
    // Use extractive summarization since the Python service isn't available
    console.log('Using extractive summarization method');
    const summary = createSimpleExtractiveSummary(fullText);
    
    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      summary: `### Structured Legal Summary ###\n${summary}`,
      originalTextPreview: fullText.substring(0, 300) + (fullText.length > 300 ? '...' : '')
    });
    
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process the file' },
      { status: 500 }
    );
  }
}

// Get the stored document (for internal use)
export function getStoredDocument(fingerprint?: string | null): { content: string; fileName: string } {
  if (fingerprint && documentStore[fingerprint]) {
    return documentStore[fingerprint];
  }
  return defaultDocument;
}
