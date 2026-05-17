import os
import json
import traceback
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from bob_service import BobAnalyzer, BobStorage
from dotenv import load_dotenv
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
import httpx

# Load environment variables
load_dotenv()

app = FastAPI(title="IBM Bob Repository Analyzer (Real Edition)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bob = BobAnalyzer()

# Pydantic Models for /generate endpoint
class RoboticsDescription(BaseModel):
    description: str = Field(
        ..., 
        description="Plain English description of the robotics project",
        example="Arduino Uno, 2 DC motors, IR sensor, line follower"
    )

class RoboticsProject(BaseModel):
    folder_structure: Dict[str, Any] = Field(
        ..., 
        description="Nested dictionary representing the project folder structure"
    )
    pin_wiring: Dict[str, Any] = Field(
        ..., 
        description="Component-to-pin mappings for hardware connections"
    )
    starter_code: str = Field(
        ..., 
        description="Complete starter code for the robotics project"
    )
    readme: str = Field(
        ..., 
        description="Markdown documentation for the project"
    )

# Initialize watsonx.ai client
def get_watsonx_model():
    """Initialize and return the IBM watsonx.ai model with extended timeout"""
    api_key = os.getenv("WATSONX_API_KEY")
    project_id = os.getenv("WATSONX_PROJECT_ID")
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    model_id = os.getenv("WATSONX_MODEL_ID", "meta-llama/llama-3-1-70b-gptq")
    
    if not api_key or not project_id:
        raise HTTPException(
            status_code=500,
            detail="WATSONX_API_KEY and WATSONX_PROJECT_ID must be set in .env file"
        )
    
    credentials = Credentials(
        url=url,
        api_key=api_key
    )
    
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MIN_NEW_TOKENS: 100,
        GenParams.TEMPERATURE: 0.7,
        GenParams.TOP_K: 50,
        GenParams.TOP_P: 1
    }
    
    # Create custom httpx client with extended timeout
    custom_client = httpx.Client(timeout=120.0)
    
    model = ModelInference(
        model_id=model_id,
        params=parameters,
        credentials=credentials,
        project_id=project_id,
        httpx_client=custom_client
    )
    
    return model

def create_robotics_prompt(description: str) -> str:
    """Create a structured prompt for generating robotics project details"""
    return f"""You are an expert robotics engineer. Given a plain English description of a robotics project, generate a complete project structure.

Project Description: {description}

Generate a JSON response with the following structure:
{{
  "folder_structure": {{
    "project_name": {{
      "src": ["main.ino or main.py"],
      "lib": ["library files"],
      "docs": ["documentation files"],
      "examples": ["example files"]
    }}
  }},
  "pin_wiring": {{
    "component_name": {{
      "pin_type": "pin_number or pin_name",
      "description": "connection description"
    }}
  }},
  "starter_code": "Complete working code with comments",
  "readme": "# Project Title\\n\\n## Description\\n\\n## Components\\n\\n## Wiring\\n\\n## Setup\\n\\n## Usage"
}}

Requirements:
1. Identify all components mentioned in the description
2. Create appropriate folder structure for the project type (Arduino, Raspberry Pi, etc.)
3. Generate accurate pin wiring based on standard practices
4. Write SHORT, concise starter code (max 50 lines) with proper libraries and comments
5. Create a brief README with setup instructions
6. CRITICAL: Use \\n for newlines in code strings instead of actual line breaks

IMPORTANT: Ensure you close all JSON braces and quotes correctly. Generate ONLY the JSON object.
Generate ONLY valid JSON. Do not include any text before or after the JSON object."""

def parse_llm_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """Parse and validate the LLM chat response"""
    try:
        # Extract content from chat response format
        if 'choices' in response and len(response['choices']) > 0:
            response_text = response['choices'][0]['message']['content']
        elif 'results' in response and len(response['results']) > 0:
            # Fallback for alternative response format
            response_text = response['results'][0]['generated_text']
        else:
            raise ValueError("Unexpected response format from chat API")
        
        # Strip markdown code blocks if present (e.g., ```json ... ```)
        response_text = response_text.strip()
        if response_text.startswith('```'):
            # Remove opening code fence
            lines = response_text.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            # Remove closing code fence
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            response_text = '\n'.join(lines)
        
        # Try to find JSON in the response
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        
        if start_idx == -1 or end_idx == 0:
            print("=== RAW MODEL RESPONSE ===")
            print(response_text)
            print("==========================")
            raise ValueError("No JSON object found in response")
        
        json_str = response_text[start_idx:end_idx]
        # Use strict=False to allow control characters
        parsed = json.loads(json_str, strict=False)
        
        # Validate required fields
        required_fields = ["folder_structure", "pin_wiring", "starter_code", "readme"]
        for field in required_fields:
            if field not in parsed:
                raise ValueError(f"Missing required field: {field}")
        
        return parsed
    except json.JSONDecodeError as e:
        print("=== JSON DECODE ERROR RAW STRING ===")
        print(json_str if 'json_str' in locals() else "JSON string not extracted")
        print("=====================================")
        raise ValueError(f"Invalid JSON in response: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error parsing response: {str(e)}")

@app.post("/analyze")
async def analyze_repository(file: UploadFile = File(...)):
    """
    Triggers the analysis view. If Bob has already submitted data via MCP, 
    it returns that. Otherwise, it prepares for Bob's input.
    """
    # In a real hackathon, this would notify Bob to start analysis
    return await bob.analyze_repo_fallback(file.filename, [file.filename])

@app.get("/live-updates")
async def get_live_updates():
    """
    Polling endpoint for the frontend to get insights pushed by Bob via MCP.
    """
    stored = BobStorage.get()
    if stored:
        return stored
    return {"status": "waiting", "message": "Bob is thinking..."}

@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "engine": "IBM Bob Real-time Engine",
        "mcp_enabled": True
    }

@app.post("/generate", response_model=RoboticsProject)
async def generate_robotics_project(request: RoboticsDescription):
    """
    Generate a complete robotics project from a plain English description.
    
    This endpoint uses IBM watsonx.ai with the Granite model to generate:
    - Project folder structure
    - Pin wiring diagrams
    - Starter code
    - README documentation
    
    Example request:
    {
        "description": "Arduino Uno, 2 DC motors, IR sensor, line follower"
    }
    """
    try:
        # Get the watsonx.ai model
        model = get_watsonx_model()
        
        # Create the prompt
        prompt = create_robotics_prompt(request.description)
        
        # Format as chat messages
        messages = [
            {
                'role': 'user',
                'content': prompt
            }
        ]
        
        # Generate response from watsonx.ai using chat API with max_tokens
        response = model.chat(messages=messages, params={'max_tokens': 4096})
        
        # Parse and validate the response
        parsed_response = parse_llm_response(response)
        
        # Return the structured response
        return RoboticsProject(**parsed_response)
        
    except HTTPException:
        raise
    except ValueError as e:
        print("ValueError in /generate endpoint:")
        traceback.print_exc()
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse LLM response: {str(e)}"
        )
    except Exception as e:
        print("Exception in /generate endpoint:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating robotics project: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Made with Bob
