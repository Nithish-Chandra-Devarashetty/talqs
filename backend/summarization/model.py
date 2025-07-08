import torch
from torch import nn
from transformers import T5Tokenizer, T5ForConditionalGeneration
import os
import math

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Custom Model Wrapper
class CustomEncoderDecoderSummarizer(nn.Module):
    def __init__(self, pretrained_model_name="t5-base", d_model=768):
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
        # encoder_hidden_states = self.fc(encoder_hidden_states) + self.positional_encoding[:encoder_hidden_states.size(1), :].to(device)

        return self.t5(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels,
            decoder_input_ids=decoder_input_ids
        )

    def load_model(self, model_path):
        """Load the model weights from a file."""
        try:
            # Load the model state dict
            self.load_state_dict(torch.load(model_path, map_location=device))
            self.eval()  # Set to evaluation mode
            print(f"Successfully loaded model from {model_path}")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

# Generate summary for a given text
def generate_summary(model, tokenizer, text, max_input_length=512, max_output_length=200):
    model.eval()
    input_text = "summarize: " + text
    input_ids = tokenizer.encode(
        input_text,
        return_tensors="pt",
        max_length=max_input_length,
        truncation=True
    ).to(device)

    with torch.no_grad():
        summary_ids = model.t5.generate(
            input_ids=input_ids,
            max_length=max_output_length,
            num_beams=4,
            temperature=1.0,
            no_repeat_ngram_size=2,
            repetition_penalty=1.5,
            length_penalty=1.0,
            top_k=50,
            top_p=0.95,
            early_stopping=True
        )
    return tokenizer.decode(summary_ids[0], skip_special_tokens=True)

# Create singleton model class
class SummarizerModel:
    _instance = None
    _model = None
    _tokenizer = None
    _is_initialized = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = SummarizerModel()
        return cls._instance

    def initialize(self, model_path="models/summary_model/epoch10.pth", tokenizer_path="t5-base"):
        """Initialize the model and tokenizer."""
        if not self._is_initialized:
            try:
                print("Initializing summarizer model...")
                # Load tokenizer
                self._tokenizer = T5Tokenizer.from_pretrained(tokenizer_path if os.path.exists(tokenizer_path) else "t5-base")
                
                # Load model
                self._model = CustomEncoderDecoderSummarizer().to(device)
                
                # Check if model weights exist
                if os.path.exists(model_path):
                    self._model.load_model(model_path)
                else:
                    print(f"Model weights not found at {model_path}, using base t5 model")
                
                self._is_initialized = True
                print("Summarizer model initialized successfully")
            except Exception as e:
                print(f"Error initializing model: {e}")
                raise

    def summarize(self, text):
        """Generate summary for the given text."""
        if not self._is_initialized:
            self.initialize()
        
        try:
            return generate_summary(self._model, self._tokenizer, text)
        except Exception as e:
            print(f"Error generating summary: {e}")
            # Fallback to a simple extractive summary
            return self._extractive_summary(text)
    
    def _extractive_summary(self, text):
        """Generate a simple extractive summary as fallback."""
        sentences = text.split(". ")
        if len(sentences) <= 3:
            return text
        
        # Take first, middle and last sentence
        summary = f"{sentences[0]}. {sentences[len(sentences)//2]}. {sentences[-1]}."
        return summary
