/**
 * Summarization model interface for the TALQS application
 * 
 * This module serves as a bridge between the Next.js app and the Python T5 summarization model.
 * It delegates the actual summarization to the Python backend service via the CustomSummarizationService.
 */

import { CustomSummarizationService } from './custom-summarization-service';

/**
 * Generate a summary for the provided text using the custom T5 model
 * 
 * This function attempts to use the Python service with the T5 model.
 * If that fails, it falls back to a simple extractive summarization method.
 * 
 * @param text The text to summarize
 * @returns A promise that resolves to the generated summary
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    // Check if the Python service is available
    const isServiceAvailable = await CustomSummarizationService.isAvailable();
    
    if (isServiceAvailable) {
      // Use the Python service for summarization
      return await CustomSummarizationService.summarizeText(text);
    } else {
      console.warn('Summarization service unavailable, using fallback method');
      return extractivelyGenerateSummary(text);
    }
  } catch (error) {
    console.error('Error in summarization:', error);
    // Fall back to extractive summarization
    return extractivelyGenerateSummary(text);
  }
}

/**
 * Generate a simple extractive summary by selecting key sentences from the text
 * 
 * This is used as a fallback when the Python service is unavailable
 * 
 * @param text The text to summarize
 * @returns An extractive summary of the text
 */
function extractivelyGenerateSummary(text: string): string {
  // Split text into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // If text is short, return as is
  if (sentences.length <= 5) return text;
  
  // Select key sentences from different parts of the text
  const keyPoints = [
    sentences[0], // Introduction
    sentences[Math.floor(sentences.length * 0.25)], // First quarter
    sentences[Math.floor(sentences.length * 0.5)], // Middle
    sentences[Math.floor(sentences.length * 0.75)], // Third quarter
    sentences[sentences.length - 1] // Conclusion
  ].filter(Boolean); // Filter out any undefined sentences
  
  // Join sentences into a coherent summary
  return keyPoints.join('. ') + '.';
}
