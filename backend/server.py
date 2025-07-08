import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import math
import torch.nn as nn
import os
from typing import Optional

class CustomEncoderDecoderSummarizer(nn.Module):
    def __init__(self, pretrained_model_name="t5-base", d_model=768):
        super().__init__()
        from transformers import T5ForConditionalGeneration
        self.t5 = T5ForConditionalGeneration.from_pretrained(pretrained_model_name)
        self.encoder = self.t5.encoder
        self.decoder = self.t5.decoder
        self.d_model = d_model
        self.fc = nn.Linear(self.encoder.config.d_model, d_model)
        self.positional_encoding = self._get_positional_encoding(d_model)

    def _get_positional_encoding(self, d_model, max_len=512):
        pos_encoding = torch.zeros(max_len, d_model)
        for pos in range(max_len):
            for i in range(0, d_model, 2):
                pos_encoding[pos, i] = math.sin(pos / (10000 ** (i / d_model)))
                if i + 1 < d_model:
                    pos_encoding[pos, i + 1] = math.cos(pos / (10000 ** (i / d_model)))
        return pos_encoding

    def forward(self, input_ids, decoder_input_ids=None, attention_mask=None, labels=None):
        encoder_outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        encoder_hidden_states = encoder_outputs.last_hidden_state
        # You commented out positional encoding usage during training, so no need here
        return self.t5(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels,
            decoder_input_ids=decoder_input_ids
        )

# Setup device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize FastAPI app
app = FastAPI()

# Check if we should use a simple model (faster but lower quality)
USE_SIMPLE_MODEL = True

# Initialize tokenizer and model
try:
    print("Loading tokenizer...")
    tokenizer = T5Tokenizer.from_pretrained("t5-small" if USE_SIMPLE_MODEL else "t5-base")
    print("Successfully loaded T5Tokenizer")
    
    print("Loading model...")
    if USE_SIMPLE_MODEL:
        model = T5ForConditionalGeneration.from_pretrained("t5-small")
    else:
        model = T5ForConditionalGeneration.from_pretrained("t5-base")
    model.eval()
    print("Model loaded successfully")
    
except Exception as e:
    print(f"Error loading model: {str(e)}")
    print("Falling back to simple summarization")
    # Fall back to a simpler tokenizer
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("t5-base", use_fast=True)
    print("Using AutoTokenizer as fallback")

model = CustomEncoderDecoderSummarizer(pretrained_model_name="t5-base").to(device)
model.load_state_dict(torch.load("models/summary_model/model_weight.pth", map_location=device))
model.eval()

# Setup FastAPI app
app = FastAPI()

# Pydantic model for request body validation
class SummaryRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    min_length: Optional[int] = 30

@app.post("/summarize")
async def summarize(request: SummaryRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
            
        print(f"Received summarization request (text length: {len(request.text)})")
        
        # Tokenize input text with a summarization prefix
        inputs = tokenizer("summarize: " + request.text, 
                         return_tensors="pt", 
                         max_length=512, 
                         truncation=True)
        
        # Generate summary
        summary_ids = model.t5.generate(
            inputs.input_ids.to(device),
            max_length=request.max_length,
            min_length=request.min_length,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        
        # Decode and return summary
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        print(f"Generated summary (length: {len(summary)})")
        return {"summary": summary}
        
    except Exception as e:
        print(f"Error in summarization: {str(e)}")
        # Fallback to simple summarization if model fails
        words = request.text.split()
        if len(words) > 100:
            summary = " ".join(words[:100]) + "... [Summary truncated]"
        else:
            summary = request.text
        return {"summary": summary, "warning": "Using fallback summarization"}

# Start the server if this file is run directly
if __name__ == "__main__":
    import uvicorn
    print("Starting summarization server on port 8001...")
    print(f"Using {'simple' if USE_SIMPLE_MODEL else 'full'} model")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
