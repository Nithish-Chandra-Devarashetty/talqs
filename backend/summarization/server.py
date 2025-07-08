from flask import Flask, request, jsonify
from model import SummarizerModel
import os

app = Flask(__name__)

# Initialize the model
summarizer = SummarizerModel.get_instance()

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint to check if the server is running."""
    return jsonify({"status": "healthy"})

@app.route('/summarize', methods=['POST'])
def summarize_text():
    """Endpoint to summarize text."""
    try:
        if not request.json or 'text' not in request.json:
            return jsonify({"error": "No text provided"}), 400
        
        text = request.json['text']
        
        if not text or len(text.strip()) == 0:
            return jsonify({"error": "Empty text provided"}), 400
        
        # Initialize model if not already done
        if not summarizer._is_initialized:
            # Get model paths from environment or use defaults
            model_path = os.environ.get('MODEL_PATH', 'models/summary_model/epoch10.pth')
            tokenizer_path = os.environ.get('TOKENIZER_PATH', 't5-base')
            summarizer.initialize(model_path, tokenizer_path)
        
        # Generate summary
        summary = summarizer.summarize(text)
        
        return jsonify({"summary": summary})
    
    except Exception as e:
        print(f"Error in summarize_text: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Load model at startup
    try:
        model_path = os.environ.get('MODEL_PATH', 'models/summary_model/epoch10.pth')
        tokenizer_path = os.environ.get('TOKENIZER_PATH', 't5-base')
        summarizer.initialize(model_path, tokenizer_path)
    except Exception as e:
        print(f"Warning: Failed to initialize model at startup: {e}")
        print("The model will attempt to initialize when the first request is received.")
    
    # Run the server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
