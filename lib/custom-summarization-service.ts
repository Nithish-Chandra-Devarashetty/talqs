import axios from 'axios';

// Configuration for the summarization service
const SUMMARIZATION_SERVICE_URL = process.env.SUMMARIZATION_SERVICE_URL || 'http://localhost:5000';

/**
 * Client for the custom summarization service
 */
export class CustomSummarizationService {
  /**
   * Check if the summarization service is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${SUMMARIZATION_SERVICE_URL}/health`, {
        timeout: 3000, // 3 second timeout
      });
      return response.status === 200;
    } catch (error) {
      console.error('Summarization service health check failed:', error);
      return false;
    }
  }

  /**
   * Summarize text using the custom T5 model
   * @param text Text to summarize
   */
  static async summarizeText(text: string): Promise<string> {
    try {
      // Check if service is available
      const isServiceAvailable = await this.isAvailable();
      
      if (!isServiceAvailable) {
        throw new Error('Summarization service is not available');
      }
      
      // Call the summarization API
      const response = await axios.post(
        `${SUMMARIZATION_SERVICE_URL}/summarize`,
        { text },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000, // 60 second timeout for longer texts
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`Summarization failed with status: ${response.status}`);
      }
      
      return response.data.summary;
    } catch (error) {
      console.error('Error calling summarization service:', error);
      throw new Error('Failed to generate summary using custom model');
    }
  }
}
