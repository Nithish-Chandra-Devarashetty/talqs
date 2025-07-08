import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory document store (would use a database in production)
const documentStore: Record<string, { content: string; fileName: string }> = {};

// Default document when no fingerprint is provided
let defaultDocument = {
  content: '',
  fileName: ''
};

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // === Handle file upload for summarization + bulk QA ===
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!file.name.endsWith('.txt')) {
        return NextResponse.json({ error: 'Only .txt files are supported' }, { status: 400 });
      }

      const fullText = await file.text();

      if (fullText.trim().length === 0) {
        return NextResponse.json({ error: 'File is empty' }, { status: 400 });
      }

      // Get document fingerprint if provided
      const fingerprint = formData.get('fingerprint') as string | null;

      // Store the document content in memory for future QA
      if (fingerprint) {
        documentStore[fingerprint] = {
          content: fullText,
          fileName: file.name
        };
      }

      // Also store as default document
      defaultDocument.content = fullText;
      defaultDocument.fileName = file.name;

      // --- Call summarization backend ---
      const summaryResponse = await fetch('http://localhost:8001/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json().catch(() => null);
        console.error('Summarization backend error:', errorData);
        return NextResponse.json(
          { error: errorData?.error || 'Error from summarization backend' },
          { status: 500 }
        );
      }

      const summaryData = await summaryResponse.json();

      // --- Call QA backend ---
      const qaResponse = await fetch('http://localhost:8000/answer_bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });

      let qaData = null;
      try {
        qaData = await qaResponse.json();
      } catch (err) {
        console.error('Failed to parse QA response as JSON:', err);
      }

      if (!qaResponse.ok || !qaData) {
        console.error('QA backend error or invalid response:', qaData);
        return NextResponse.json(
          { error: 'Error from QA backend or invalid JSON response' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        fileName: file.name,
        fileSize: file.size,
        summary: summaryData.summary,
        originalTextPreview: fullText.substring(0, 300) + (fullText.length > 300 ? '...' : ''),
        qaAnswers: qaData?.answers || [],  // ✅ Safe access
      });

    } else if (contentType.includes('application/json')) {
      // === Handle single QA question answering ===
      const jsonData = await request.json();
      console.log('Received JSON for QA:', jsonData);

      if (!jsonData.question) {
        return NextResponse.json({ error: 'No question provided' }, { status: 400 });
      }

      // Get document from store if fingerprint is provided
      const document = jsonData.documentFingerprint ? 
        documentStore[jsonData.documentFingerprint] : defaultDocument;

      if (!document || !document.content) {
        return NextResponse.json(
          { error: 'No document found. Please upload a document first.' },
          { status: 404 }
        );
      }

      const qaResponse = await fetch('http://localhost:8000/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: document.content,
          question: jsonData.question
        }),
      });

      let qaData = null;
      try {
        qaData = await qaResponse.json();
      } catch (err) {
        console.error('Failed to parse single QA response as JSON:', err);
      }

      if (!qaResponse.ok || !qaData) {
        console.error('Single QA backend error or invalid response:', qaData);
        return NextResponse.json(
          { error: 'Error from single QA backend or invalid JSON response' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        answer: qaData.answer || "No answer found",
        documentName: document.fileName
      });

    } else {
      return NextResponse.json(
        { error: 'Unsupported content-type, expected multipart/form-data or application/json' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/summarize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Utility for accessing stored documents (optional external use)
export function getStoredDocument(fingerprint?: string | null): { content: string; fileName: string } {
  if (fingerprint && documentStore[fingerprint]) {
    return documentStore[fingerprint];
  }
  return defaultDocument;
}
