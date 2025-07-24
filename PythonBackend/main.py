import asyncio
import websockets
import json
import base64
import logging
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import io
import wave
import os
from google.oauth2 import service_account

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LinguavaBackend:
    def __init__(self, project_id: str, key_file_path: str, location: str = "us-central1"):
        self.project_id = project_id
        self.key_file_path = key_file_path
        self.location = location
        self.model = None
        self.connected_clients = set()
        self.credentials = None
        
        # Load credentials from key file
        self._load_credentials()
        
        # Initialize Vertex AI with credentials
        vertexai.init(
            project=project_id, 
            location=location,
            credentials=self.credentials
        )
        
    def _load_credentials(self):
        """Load service account credentials from key file"""
        try:
            if not os.path.exists(self.key_file_path):
                raise FileNotFoundError(f"Key file not found: {self.key_file_path}")
            
            self.credentials = service_account.Credentials.from_service_account_file(
                self.key_file_path,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            logger.info(f"Successfully loaded credentials from: {self.key_file_path}")
            
        except Exception as e:
            logger.error(f"Failed to load credentials from {self.key_file_path}: {e}")
            raise
        
    async def initialize_gemini(self):
        """Initialize Gemini Live model"""
        try:
            # Use the latest available Gemini model for audio/text
            self.model = GenerativeModel("gemini-2.0-flash-exp")
            logger.info("Gemini model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            raise

    def create_context_prompt(self, game_state: dict) -> str:
        """Create contextual prompt based on game state"""
        player = game_state.get("player", {})
        target = game_state.get("target", {})
        world = game_state.get("world", {})
        
        prompt = f"""You are a helpful language tutor in Minecraft. The player is learning and you should:
1. Respond naturally and conversationally
2. Help with language learning related to what they're doing in the game
3. Keep responses concise but helpful
4. Use the game context to make learning relevant

Current context:
- Player position: {player.get('position', 'unknown')}
- Health: {player.get('health', 'unknown')}/20
- Held item: {player.get('heldItem', 'none')}
- Looking at: {target.get('id', 'nothing')} ({target.get('type', 'none')})
- Biome: {world.get('biome', 'unknown')}
- Time: {'night' if world.get('timeOfDay', 0) > 13000 else 'day'}

Respond naturally to what the player says while incorporating this game context."""
        
        return prompt

    async def process_audio_with_gemini(self, audio_data: bytes, context_prompt: str):
        """Process audio with Gemini API"""
        try:
            # Create audio part for Gemini
            audio_part = Part.from_data(audio_data, mime_type="audio/wav")
            
            # Generate response (run in thread pool since it's not async)
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content([context_prompt, audio_part])
            )
            
            # Return text response
            return response.text
            
        except Exception as e:
            logger.error(f"Error processing with Gemini: {e}")
            return "Sorry, I couldn't process that. Could you try again?"

    def convert_pcm_to_wav(self, pcm_data: bytes, sample_rate: int = 16000, channels: int = 1, sample_width: int = 2) -> bytes:
        """Convert raw PCM data to WAV format"""
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        return buffer.getvalue()

    async def handle_client_message(self, websocket, message: str):
        """Handle incoming message from Minecraft client"""
        try:
            data = json.loads(message)
            
            if data.get("type") == "PLAYER_ACTION_WITH_AUDIO":
                # Extract audio data
                audio_b64 = data.get("audioChunk", "")
                if not audio_b64:
                    await websocket.send(json.dumps({
                        "type": "ERROR",
                        "message": "No audio data received"
                    }))
                    return
                
                # Decode audio
                pcm_data = base64.b64decode(audio_b64)
                wav_data = self.convert_pcm_to_wav(pcm_data)
                
                # Create context prompt
                context_prompt = self.create_context_prompt(data.get("gameState", {}))
                
                # Process with Gemini
                response_text = await self.process_audio_with_gemini(wav_data, context_prompt)
                
                # Send response back to client
                response = {
                    "type": "AI_RESPONSE",
                    "text": response_text,
                    "timestamp": data.get("timestamp", 0)
                }
                
                await websocket.send(json.dumps(response))
                logger.info(f"Processed audio request, sent response: {response_text[:100]}...")
                
            elif data.get("type") == "PING":
                await websocket.send(json.dumps({"type": "PONG"}))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await websocket.send(json.dumps({
                "type": "ERROR", 
                "message": "Invalid JSON format"
            }))
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await websocket.send(json.dumps({
                "type": "ERROR",
                "message": str(e)
            }))

    async def handle_client(self, websocket):
        """Handle new client connection"""
        self.connected_clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.connected_clients)}")
        
        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            self.connected_clients.discard(websocket)
            logger.info(f"Client removed. Total clients: {len(self.connected_clients)}")

    async def start_server(self, host: str = "localhost", port: int = 8765):
        """Start the WebSocket server"""
        await self.initialize_gemini()
        
        logger.info(f"Starting Linguava backend server on {host}:{port}")
        async with websockets.serve(self.handle_client, host, port):
            logger.info("Server started successfully")
            await asyncio.Future()  # Run forever

async def main():
    # Configuration - UPDATE THESE PATHS
    PROJECT_ID = "linguava"  # Replace with your Google Cloud project ID
    KEY_FILE_PATH = "./key.json"    # Path to your service account key file
    
    # Validate configuration
    if PROJECT_ID == "your-project-id":
        logger.error("Please update PROJECT_ID in main.py with your actual Google Cloud project ID")
        return
    
    if not os.path.exists(KEY_FILE_PATH):
        logger.error(f"Key file not found: {KEY_FILE_PATH}")
        logger.error("Please ensure your service account key file exists at the specified path")
        return
    
    backend = LinguavaBackend(PROJECT_ID, KEY_FILE_PATH)
    await backend.start_server()

if __name__ == "__main__":
    asyncio.run(main())