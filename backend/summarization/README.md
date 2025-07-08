# Custom T5 Summarization Model Integration

This directory contains the implementation of a custom T5-based summarization model for the TALQS application. The model is built using PyTorch and is designed to be run as a separate Python service that communicates with the Next.js application via HTTP.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend/summarization
pip install -r requirements.txt
```

### 2. Model Files

Place your pre-trained model files in the following directory:
```
models/summary_model/final_model/
```

The directory structure should look like this:
- `models/summary_model/final_model/model_weights.pth` - Your trained model weights
- `models/summary_model/final_model/` - Tokenizer files (will use t5-base tokenizer if not available)

### 3. Running the Summarization Service

Start the Python service:
```bash
cd backend/summarization
python server.py
```

By default, the service runs on port 5000. You can customize this by setting the PORT environment variable.

### 4. Environment Variables

Add the following to your `.env.local` file:
```
SUMMARIZATION_SERVICE_URL=http://localhost:5000
MODEL_PATH=models/summary_model/final_model/model_weights.pth
TOKENIZER_PATH=models/summary_model/final_model
```

## Usage

The integration works as follows:

1. The Next.js application sends text to the `/api/custom-summarize` endpoint
2. The endpoint calls the Python service to generate a summary
3. If the service is unavailable, it falls back to a simple extractive summarization method

## Files

- `model.py`: The PyTorch model implementation
- `server.py`: Flask API server that exposes the model
- `requirements.txt`: Python dependencies

## Front-end Integration

The front-end components call the `/api/custom-summarize` endpoint, which uses the T5 model for summarization. No changes are needed to the UI components.
