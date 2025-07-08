import mongoose from 'mongoose';

// Define the Summary schema
const SummarySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  documentFingerprint: {
    type: String,
    required: true,
    index: true
  },
  documentName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for userId and documentFingerprint
SummarySchema.index({ userId: 1, documentFingerprint: 1 }, { unique: true });

// Create or get the Summary model
export const Summary = mongoose.models.Summary || mongoose.model('Summary', SummarySchema);

// Helper function to save or update a summary
export async function saveSummary(
  userId: string,
  documentFingerprint: string,
  documentName: string,
  content: string
) {
  try {
    console.log('Summary Model: Saving summary for user and document:', {
      userId,
      documentFingerprint,
      documentName
    });
    
    // Find existing summary for this user and document fingerprint
    const existingSummary = await Summary.findOne({
      userId,
      documentFingerprint
    });

    if (existingSummary) {
      // Update existing summary
      existingSummary.content = content;
      existingSummary.updatedAt = new Date();
      
      await existingSummary.save();
      console.log('Summary Model: Updated existing summary');
      return existingSummary;
    } else {
      // Create new summary
      const newSummary = new Summary({
        userId,
        documentFingerprint,
        documentName,
        content
      });
      
      await newSummary.save();
      console.log('Summary Model: Created new summary');
      return newSummary;
    }
  } catch (error) {
    console.error('Error saving summary:', error);
    throw error;
  }
}

// Helper function to get summary for a user and document
export async function getSummary(userId: string, documentFingerprint: string) {
  try {
    console.log('Summary Model: Getting summary for user and document:', {
      userId,
      documentFingerprint
    });
    
    const summary = await Summary.findOne({
      userId,
      documentFingerprint
    });
    
    if (summary) {
      console.log('Summary Model: Found summary');
      return summary;
    } else {
      console.log('Summary Model: No summary found');
      return null;
    }
  } catch (error) {
    console.error('Error getting summary:', error);
    throw error;
  }
}

// Helper function to get all summaries for a user
export async function getUserSummaries(userId: string) {
  try {
    console.log('Summary Model: Getting all summaries for user:', userId);
    
    const summaries = await Summary.find({ userId })
      .sort({ updatedAt: -1 });
    
    console.log(`Summary Model: Found ${summaries.length} summaries`);
    return summaries;
  } catch (error) {
    console.error('Error getting user summaries:', error);
    throw error;
  }
}
