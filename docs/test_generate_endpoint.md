# Testing the /generate Endpoint

## Prerequisites

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your IBM watsonx.ai credentials:
   ```env
   WATSONX_API_KEY=your_actual_api_key_here
   WATSONX_PROJECT_ID=your_actual_project_id_here
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
   ```

   **Getting Your Credentials:**
   - API Key: https://cloud.ibm.com/iam/apikeys
   - Project ID: From your watsonx.ai project settings

## Starting the Server

```bash
cd backend
python main.py
```

The server will start on `http://localhost:8000`

## Testing with cURL

### Basic Test
```bash
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Arduino Uno, 2 DC motors, IR sensor, line follower"
  }'
```

### Other Examples

**Raspberry Pi Robot:**
```bash
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Raspberry Pi 4, servo motor, ultrasonic sensor, obstacle avoidance robot"
  }'
```

**ESP32 IoT Device:**
```bash
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "ESP32, DHT22 temperature sensor, OLED display, WiFi weather station"
  }'
```

**Arduino Robotic Arm:**
```bash
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Arduino Mega, 6 servo motors, joystick control, robotic arm"
  }'
```

## Testing with Python

Create a test script `test_generate.py`:

```python
import requests
import json

# Test the /generate endpoint
url = "http://localhost:8000/generate"

payload = {
    "description": "Arduino Uno, 2 DC motors, IR sensor, line follower"
}

response = requests.post(url, json=payload)

if response.status_code == 200:
    result = response.json()
    
    print("✓ Success!")
    print("\n=== Folder Structure ===")
    print(json.dumps(result["folder_structure"], indent=2))
    
    print("\n=== Pin Wiring ===")
    print(json.dumps(result["pin_wiring"], indent=2))
    
    print("\n=== Starter Code (first 500 chars) ===")
    print(result["starter_code"][:500] + "...")
    
    print("\n=== README (first 500 chars) ===")
    print(result["readme"][:500] + "...")
else:
    print(f"✗ Error: {response.status_code}")
    print(response.json())
```

Run it:
```bash
python test_generate.py
```

## Testing with Postman

1. Create a new POST request to `http://localhost:8000/generate`
2. Set Headers: `Content-Type: application/json`
3. Set Body (raw JSON):
   ```json
   {
     "description": "Arduino Uno, 2 DC motors, IR sensor, line follower"
   }
   ```
4. Click Send

## Expected Response Format

```json
{
  "folder_structure": {
    "project_name": {
      "src": ["main.ino"],
      "lib": ["library_files"],
      "docs": ["documentation"],
      "examples": ["example_files"]
    }
  },
  "pin_wiring": {
    "component_name": {
      "pin_type": "pin_number",
      "description": "connection details"
    }
  },
  "starter_code": "// Complete Arduino/Python code...",
  "readme": "# Project Title\n\n## Description..."
}
```

## API Documentation

Once the server is running, visit:
- **Interactive API Docs:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

## Troubleshooting

### Error: "WATSONX_API_KEY and WATSONX_PROJECT_ID must be set"
- Ensure `.env` file exists in the project root
- Verify credentials are correct
- Check that `python-dotenv` is installed

### Error: "Import ibm_watsonx_ai could not be resolved"
- Install dependencies: `pip install -r requirements.txt`
- Activate virtual environment if using one

### Error: "Failed to parse LLM response"
- The model may have returned invalid JSON
- Try adjusting the prompt or model parameters
- Check the model ID is correct

### Slow Response Times
- First request may be slower (model initialization)
- Subsequent requests should be faster
- Consider adjusting `MAX_NEW_TOKENS` in the code

## Performance Tips

1. **Caching:** Consider implementing response caching for common descriptions
2. **Async Processing:** For production, use background tasks for long-running generations
3. **Rate Limiting:** Add rate limiting to prevent API quota exhaustion
4. **Monitoring:** Log all requests and responses for debugging

## Next Steps

After successful testing:
1. Integrate with frontend
2. Add user authentication
3. Implement project saving/loading
4. Add export functionality (ZIP download)
5. Create project templates library