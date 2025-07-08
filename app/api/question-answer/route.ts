import { NextRequest, NextResponse } from 'next/server';

// URL for the FastAPI QA server
const QA_SERVER_URL = process.env.QA_SERVER_URL || 'http://localhost:8000';

/**
 * This endpoint processes legal questions using your custom Q&A model
 * It connects to the FastAPI server running your T5 QA model
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { question, documentContent, documentName, fingerprint } = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }
    
    if (!documentContent) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }
    
    try {
      // If it's a specific question, send it to the custom QA model
      if (question !== 'all') {
        // Single question - make a request to the FastAPI server
        const qaResponse = await fetch(`${QA_SERVER_URL}/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: documentContent,
            question: question
          }),
        });
        
        if (!qaResponse.ok) {
          throw new Error(`QA server responded with status: ${qaResponse.status}`);
        }
        
        const data = await qaResponse.json();
        
        return NextResponse.json({
          question,
          answer: data.answer,
          documentName,
          fingerprint
        });
      } else {
        // Process all default questions at once
        const bulkResponse = await fetch(`${QA_SERVER_URL}/answer_bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: documentContent
          }),
        });
        
        if (!bulkResponse.ok) {
          throw new Error(`QA server responded with status: ${bulkResponse.status}`);
        }
        
        const bulkData = await bulkResponse.json();
        
        return NextResponse.json({
          answers: bulkData.answers,
          documentName,
          fingerprint
        });
      }
    } catch (qaError) {
      console.error('Error calling QA server:', qaError);
      
      // Fallback to extractive answering if the QA server is unavailable
      const answer = generateExtractiveAnswer(documentContent, question);
      
      return NextResponse.json({
        question,
        answer,
        documentName,
        fingerprint,
        note: 'Using fallback method because QA server is unavailable'
      });
    }
    
  } catch (error) {
    console.error('Error processing question with custom model:', error);
    return NextResponse.json(
      { error: 'Failed to process the question with custom model' },
      { status: 500 }
    );
  }
}

/**
 * Get the default legal questions from the QA server
 */
export async function GET() {
  try {
    // Try to get questions from the QA server
    const response = await fetch(`${QA_SERVER_URL}/questions`);
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ questions: data.default_questions });
    } else {
      // Fallback to default questions if the server is unavailable
      return NextResponse.json({
        questions: [
          "Who is the petitioner in the case?",
          "Who is the respondent in the case?",
          "What is the case summary?",
          "What was the court's decision?",
          "Were there any dissenting opinions?",
          "What evidence was presented?",
          "What are the key legal issues in the case?",
          "What was the timeline of events?"
        ]
      });
    }
  } catch (error) {
    console.error('Error fetching questions from QA server:', error);
    // Fallback to default questions
    return NextResponse.json({
      questions: [
        "Who is the petitioner in the case?",
        "Who is the respondent in the case?",
        "What is the case summary?",
        "What was the court's decision?",
        "Were there any dissenting opinions?",
        "What evidence was presented?",
        "What are the key legal issues in the case?",
        "What was the timeline of events?"
      ]
    });
  }
}

/**
 * Simple extractive answering method - used as fallback when the QA server is unavailable
 */
function generateExtractiveAnswer(documentContent: string, question: string): string {
  // Split document into sentences
  const sentences = documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Create a simple keyword-based matching
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => 
    w.length > 3 && !['what', 'who', 'when', 'where', 'why', 'how', 'the', 'and', 'this', 'that'].includes(w)
  );
  
  // Score each sentence based on keyword matches
  const scoredSentences = sentences.map(sentence => {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;
    
    questionWords.forEach(word => {
      if (sentenceLower.includes(word)) {
        score += 1;
      }
    });
    
    return { sentence, score };
  });
  
  // Sort by score and take top 3 sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.sentence.trim());
  
  // If no good matches, take first, middle and last sentence
  if (topSentences.length === 0) {
    return `I couldn't find a specific answer to this question in the document. Here are some key excerpts that might be helpful:\n\n${
      [
        sentences[0],
        sentences[Math.floor(sentences.length / 2)],
        sentences[sentences.length - 1]
      ].filter(Boolean).map(s => s.trim()).join('\n\n')
    }`;
  }
  
  // Format the answer
  return `Based on the document, I found this information that answers your question:\n\n${
    topSentences.join('\n\n')
  }`;
}
