from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store uploaded documents in memory (for simplicity)
# In a production environment, you would use a database
document_store = {
    "content": "",
    "filename": ""
}

# Simple mock implementation of the LongT5 model functionality
# In a real implementation, you would use the actual model from the provided code
def generate_answer(context, question):
    """
    Mock implementation of answer generation.
    In production, you would integrate the actual LongT5 model here.
    """
    # This would be replaced with actual model inference
    if "plaintiff" in question.lower() or "petitioner" in question.lower():
        return "Based on the document, the petitioner appears to be John Smith."
    elif "respondent" in question.lower():
        return "The respondent in this case is ABC Corporation."
    elif "decision" in question.lower() or "ruling" in question.lower():
        return "The court ruled in favor of the petitioner, finding that the patent was valid and infringed upon."
    elif "legal" in question.lower() and "provision" in question.lower():
        return "The court applied sections 101 and 103 of the Patent Act regarding patentability and non-obviousness."
    elif "argument" in question.lower():
        return "The main arguments were about patent validity and whether infringement occurred."
    elif "reasoning" in question.lower():
        return "The court reasoned that the technology was novel enough to merit protection."
    elif "precedent" in question.lower():
        return "Several key precedents were cited including Diamond v. Diehr (1981)."
    elif "dissent" in question.lower():
        return "There were no dissenting opinions in this unanimous decision."
    elif "penalt" in question.lower() or "consequence" in question.lower():
        return "The court ordered damages of $1.2 million and issued an injunction."
    elif "implication" in question.lower():
        return "This case strengthens protection for software patents."
    elif "fact" in question.lower():
        return "Key facts included the filing date of the patent and when alleged infringement began."
    elif "evidence" in question.lower():
        return "Evidence included source code comparisons and expert testimony."
    elif "issue" in question.lower():
        return "Key legal issues were patent validity and infringement."
    elif "timeline" in question.lower():
        return "The timeline spans from 2018 (patent filing) to 2022 (lawsuit)."
    else:
        # For any other question, generate a generic response that includes context
        return f"Based on my analysis of the document which is about {len(context.split())} words long, I cannot provide a specific answer to this question."

def summarize_text(text):
    """
    Mock implementation of text summarization.
    In production, you would integrate the actual summarization model.
    """
    # Very simple extractive summarization as a placeholder
    sentences = text.split('. ')
    if len(sentences) <= 5:
        return text
    
    # Take first two sentences and last three
    summary = '. '.join(sentences[:2] + sentences[-3:]) + '.'
    return f"### Document Summary ###\n\nThis is a legal document containing approximately {len(text.split())} words. {summary}"

@app.route('/api/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if not file.filename.endswith('.txt'):
        return jsonify({"error": "Only .txt files are supported"}), 400
    
    # Read file content
    content = file.read().decode('utf-8')
    if not content.strip():
        return jsonify({"error": "File is empty"}), 400
    
    # Store document
    document_store["content"] = content
    document_store["filename"] = file.filename
    
    # Generate summary
    summary = summarize_text(content)
    
    return jsonify({
        "filename": file.filename,
        "fileSize": len(content),
        "summary": summary
    })

@app.route('/api/qa', methods=['POST'])
def answer_question():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    question = data.get('question')
    if not question:
        return jsonify({"error": "No question provided"}), 400
    
    # Use stored document content or specific content provided
    context = data.get('documentContent') or document_store["content"]
    if not context:
        return jsonify({"error": "No document has been uploaded"}), 400
    
    # Generate answer
    answer = generate_answer(context, question)
    
    return jsonify({
        "question": question,
        "answer": answer
    })

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify({
        "questions": [
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
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
