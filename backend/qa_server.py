# backend/qa_server.py
import torch
import math
import torch.nn as nn
from transformers import T5Tokenizer, T5ForConditionalGeneration
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import re

# Define the QA model architecture (same style as summarizer)
class CustomEncoderDecoderQA(nn.Module):
    def __init__(self, pretrained_model_name="t5-small", d_model=512):
        super().__init__()
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
        return self.t5(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels,
            decoder_input_ids=decoder_input_ids
        )

# Set up FastAPI app
app = FastAPI()

# Device setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Initialize model and tokenizer
try:
    print("Loading QA model and tokenizer...")
    tokenizer = T5Tokenizer.from_pretrained("t5-small")
    model = T5ForConditionalGeneration.from_pretrained("t5-small")
    model.eval()
    model.to(device)
    print("QA model loaded successfully")
except Exception as e:
    print(f"Error loading QA model: {str(e)}")
    model = None
    tokenizer = None

# Load tokenizer and model
# Using a different tokenizer approach that doesn't require SentencePiece
try:
    from transformers import T5Tokenizer
    tokenizer = T5Tokenizer.from_pretrained("t5-small")
    print("Successfully loaded T5Tokenizer")
except ImportError:
    # Fall back to a simpler tokenizer
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("t5-small", use_fast=True)
    print("Using AutoTokenizer as fallback")

# First try to load the custom model weights
try:
    model_path = "models/summary_model/model_weight_1.pth"  # Using the smaller model file
    print(f"Attempting to load model from {model_path}...")
    model = CustomEncoderDecoderQA(pretrained_model_name="t5-small").to(device)  
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("Successfully loaded custom QA model")
except Exception as e:
    print(f"Error loading custom QA model: {str(e)}")
    model_path = "models/summary_model/model_weight_1.pth"  # Using the smaller model file
    print(f"Attempting to load model from {model_path}...")
    model = T5ForConditionalGeneration.from_pretrained("t5-small").to(device)  # Using base T5 model for now
    # model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("Successfully loaded T5 base model")

# Input schema
class QARequest(BaseModel):
    context: str
    question: str

# Default legal questions
default_questions = [
    "Who is the petitioner in the case?",
    "Who is the respondent in the case?",
    "What is the case summary?",
    "What was the court's decision?",
    "Were there any dissenting opinions?",
    "What evidence was presented?",
    "What are the key legal issues in the case?",
    "What was the timeline of events?",
]

@app.get("/questions")
def get_default_questions():
    return {"default_questions": default_questions}

# ✅ New route for answering all default questions from a single context
class BulkQARequest(BaseModel):
    text: str

@app.post("/answer_bulk")
def answer_bulk_questions(request: BulkQARequest):
    print("Received QA request")
    print("Context preview:", request.text[:100])  # Just print a preview

    context = request.text
    results = []

    for question in default_questions:
        print(f"Asking: {question}")
        input_text = f"question: {question} context: {context}"
        input_ids = tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True).to(device)

        with torch.no_grad():
            output_ids = model.t5.generate(
                input_ids=input_ids,
                max_length=100,
                num_beams=4,
                no_repeat_ngram_size=2,
                repetition_penalty=1.5,
                length_penalty=1.0,
                early_stopping=True,
            )
        answer = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        results.append({"question": question, "answer": answer})

    return {"qa_results": results}

# Single question answering endpoint
@app.post("/answer")
def answer_question(request: QARequest):
    print(f"Answering question: {request.question}")
    print("Context preview:", request.context[:100])  # Just print a preview

    input_text = f"question: {request.question} context: {request.context}"
    input_ids = tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True).to(device)

    with torch.no_grad():
        output_ids = model.t5.generate(
            input_ids=input_ids,
            max_length=100,
            num_beams=4,
            no_repeat_ngram_size=2,
            repetition_penalty=1.5,
            length_penalty=1.0,
            early_stopping=True,
        )
    answer = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    print(f"Answer: {answer}")
    
    return {"answer": answer}

# Start the server if this file is run directly
if __name__ == "__main__":
    import uvicorn
    print("Starting QA server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
