"use client";

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Add required fonts for PDF
import 'jspdf-autotable';

interface PdfGeneratorProps {
  contentId: string;
  title: string;
  type: 'summary' | 'qa';
  buttonClassName?: string;
  documentId?: string;
}

export default function PdfGenerator({ 
  contentId, 
  title, 
  type,
  buttonClassName = "",
  documentId
}: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fullContent, setFullContent] = useState<string>("");
  const [qaMessages, setQaMessages] = useState<{role: string, content: string}[]>([]);

  // Fetch complete data when component mounts
  useEffect(() => {
    const fetchCompleteData = async () => {
      try {
        if (type === 'qa') {
          // Fetch all chat messages from API
          const response = await fetch(`/api/chat/history${documentId ? `?documentId=${documentId}` : ''}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.messages) {
              // Process messages to extract text content without HTML tags
              const processedMessages = data.messages.map((msg: string) => {
                // Extract role (You: or AI:)
                const isUser = msg.includes('<strong>You:</strong>');
                const isAI = msg.includes('<strong>AI:</strong>');
                const role = isUser ? 'user' : (isAI ? 'ai' : 'unknown');
                
                // Remove HTML tags to get plain text
                let content = msg
                  .replace(/<strong>You:<\/strong>\s*/, '')
                  .replace(/<strong>AI:<\/strong>\s*/, '')
                  .replace(/<\/?[^>]+(>|$)/g, ""); // Remove all HTML tags
                
                return { role, content };
              });
              
              setQaMessages(processedMessages);
              console.log(`Loaded ${processedMessages.length} complete messages for PDF`);
            }
          }
        } else if (type === 'summary') {
          // Fetch complete summary from API
          const response = await fetch(`/api/summary/complete${documentId ? `?documentId=${documentId}` : ''}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.summary) {
              // Store the complete summary text
              const summaryText = data.summary.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags
              setFullContent(summaryText);
              console.log('Loaded complete summary for PDF');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching complete content:', error);
      }
    };

    fetchCompleteData();
  }, [type, documentId]);

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set up dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20; // Margin in mm
      const contentWidth = pageWidth - (margin * 2);
      
      // Add header
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      
      // Add title
      const pdfTitle = type === 'summary' ? 'Document Summary' : 'Legal Q&A Conversation';
      pdf.text(pdfTitle, pageWidth / 2, margin, { align: 'center' });
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, margin + 7, { align: 'center' });
      
      // Set up for content
      pdf.setFontSize(11);
      let yPosition = margin + 20; // Starting y position for content
      
      if (type === 'summary') {
        // For summary type - get content either from API or DOM
        let summaryText = fullContent;
        
        // If no content from API, try to get from DOM
        if (!summaryText) {
          const summaryElement = document.getElementById(contentId);
          if (summaryElement) {
            summaryText = summaryElement.innerText || summaryElement.textContent || '';
          }
        }
        
        // Split text into lines that fit the page width
        const textLines = pdf.splitTextToSize(summaryText, contentWidth);
        
        // Add text to PDF, handling page breaks
        for (let i = 0; i < textLines.length; i++) {
          // Check if we need a new page
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(textLines[i], margin, yPosition);
          yPosition += 5; // Line spacing
        }
      } else if (type === 'qa') {
        // For Q&A type - render each message
        let messages = qaMessages;
        
        // If no messages from API, try to get from DOM
        if (messages.length === 0) {
          const qaElement = document.getElementById(contentId);
          if (qaElement) {
            const userMessages = qaElement.querySelectorAll('[data-role="user"]');
            const aiMessages = qaElement.querySelectorAll('[data-role="ai"]');
            
            // Combine and sort messages by their position in the DOM
            const allMessages: {role: string, content: string, index: number}[] = [];
            
            userMessages.forEach((msg, idx) => {
              allMessages.push({
                role: 'user',
                content: (msg as HTMLElement).innerText || '',
                index: Array.from(qaElement.children).indexOf(msg as Element)
              });
            });
            
            aiMessages.forEach((msg, idx) => {
              allMessages.push({
                role: 'ai',
                content: (msg as HTMLElement).innerText || '',
                index: Array.from(qaElement.children).indexOf(msg as Element)
              });
            });
            
            // Sort by DOM position
            allMessages.sort((a, b) => a.index - b.index);
            
            // Remove the index property
            messages = allMessages.map(({ role, content }) => ({ role, content }));
          }
        }
        
        // Render each message
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          const prefix = message.role === 'user' ? 'You: ' : 'AI: ';
          
          // Set background color for user messages
          if (message.role === 'user') {
            pdf.setFillColor(240, 240, 240); // Light gray background
            pdf.rect(margin - 2, yPosition - 4, contentWidth + 4, 10, 'F'); // Draw rectangle
          } else {
            pdf.setFillColor(255, 255, 255); // White background
          }
          
          // Add the message prefix (You: or AI:)
          pdf.setFont('helvetica', 'bold');
          pdf.text(prefix, margin, yPosition);
          
          // Calculate prefix width and set position for content
          const prefixWidth = pdf.getTextWidth(prefix);
          
          // Add the message content
          pdf.setFont('helvetica', 'normal');
          
          // Split text into lines that fit the page width minus the prefix width
          const contentLines = pdf.splitTextToSize(
            message.content, 
            contentWidth - prefixWidth
          );
          
          // Add first line on the same line as prefix
          if (contentLines.length > 0) {
            pdf.text(contentLines[0], margin + prefixWidth, yPosition);
            yPosition += 5; // Move to next line
          }
          
          // Add remaining lines
          for (let j = 1; j < contentLines.length; j++) {
            // Check if we need a new page
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.text(contentLines[j], margin, yPosition);
            yPosition += 5; // Line spacing
          }
          
          // Add spacing between messages
          yPosition += 5;
          
          // Check if we need a new page for the next message
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
        }
      }
      
      // Add footer with page numbers
      const totalPages = pdf.getNumberOfPages();
      
      // Add footer to all pages
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('TALQS - AI-Powered Legal Summarization and Q&A', pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
      
      // Save PDF
      const fileName = type === 'summary' 
        ? `TALQS-Summary-${new Date().toISOString().slice(0, 10)}.pdf`
        : `TALQS-QA-${new Date().toISOString().slice(0, 10)}.pdf`;
        
      pdf.save(fileName);
      console.log(`PDF saved as ${fileName}`);
      
      // Log success
      console.log(`PDF generated successfully with ${totalPages} pages`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF}
      variant="ghost" 
      size="sm"
      className={`flex items-center gap-1 ${buttonClassName}`}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      <span>{isGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
    </Button>
  );
}
