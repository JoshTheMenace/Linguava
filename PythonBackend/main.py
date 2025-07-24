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
from google.cloud import texttospeech

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LinguavaBackend:
    def __init__(self, project_id: str, key_file_path: str, location: str = "us-central1"):
        self.project_id = project_id
        self.key_file_path = key_file_path
        self.location = location
        self.model = None
        self.tts_client = None
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
        
        # Initialize Text-to-Speech client
        self.tts_client = texttospeech.TextToSpeechClient(credentials=self.credentials)
        
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
        """Initialize Gemini model with fallback options"""
        model_options = [
            "gemini-2.0-flash-exp",      # Experimental with latest features
            "gemini-2.0-flash",          # Stable version
            "gemini-2.5-flash",          # Newer model if available
            "gemini-1.5-pro"             # Fallback option
        ]
        
        for model_name in model_options:
            try:
                self.model = GenerativeModel(model_name)
                logger.info(f"Successfully initialized model: {model_name}")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize {model_name}: {e}")
                continue
        
        # If all models fail
        logger.error("Failed to initialize any Gemini model")
        logger.error("Please ensure:")
        logger.error("1. Vertex AI API is enabled in your Google Cloud project")
        logger.error("2. Your service account has the necessary permissions")
        logger.error("3. Your project has access to Gemini models")
        raise RuntimeError("Could not initialize any Gemini model")

    def create_context_prompt(self, game_state: dict) -> str:
        """Create contextual prompt based on game state"""
        player = game_state.get("player", {})
        target = game_state.get("target", {})
        world = game_state.get("world", {})
        
        prompt = f"""You are a friendly, enthusiastic language tutor helping someone learn while playing Minecraft. Keep your responses:

- CONVERSATIONAL and natural (like talking to a friend)
- SHORT (1-2 sentences max, speak naturally)
- CONTEXTUAL to what they're doing in the game
- ENCOURAGING and supportive
- Try to teach the player the language they are learning. The user is learning Japanese. And already has a basic understanding of the language.

Current game context:
- Player health: {player.get('health', 'unknown')}/20, hunger: {player.get('hunger', 'unknown')}/20
- Holding: {player.get('heldItem', 'nothing')}
- Looking at: {target.get('id', 'nothing')} ({target.get('type', 'none')})
- Environment: {world.get('biome', 'unknown').replace('minecraft:', '').replace('_', ' ')}
- Time: {'night time' if world.get('timeOfDay', 0) > 13000 else 'day time'}
- Weather: {'raining' if world.get('isRaining', False) else 'clear'}

Respond naturally to what they say, like you're right there with them playing the game. Keep it conversational and fun!"""
        
        return prompt

    async def text_to_speech(self, text: str) -> bytes:
        """Convert text to speech using Google Cloud TTS"""
        try:
            # Set up the synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Build the voice request - use a friendly, natural voice
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-F",  # Female voice, sounds natural
                ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
            )
            
            # Select the type of audio file
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000  # Match Minecraft mod's expected format
            )
            
            # Perform the text-to-speech request
            response = self.tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            return response.audio_content
            
        except Exception as e:
            logger.error(f"Error in text-to-speech: {e}")
            return b""  # Return empty bytes if TTS fails

    async def process_audio_with_gemini(self, audio_data: bytes, context_prompt: str):
        """Process audio with Gemini API and return both text and audio response"""
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
            
            # Get text response
            text_response = response.text
            
            # Generate audio from text
            audio_response = await self.text_to_speech(text_response)
            
            return {
                "text": text_response,
                "audio": audio_response
            }
            
        except Exception as e:
            logger.error(f"Error processing with Gemini: {e}")
            return {
                "text": "Sorry, I couldn't process that. Could you try again?",
                "audio": await self.text_to_speech("Sorry, I couldn't process that. Could you try again?")
            }

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
                response_data = await self.process_audio_with_gemini(wav_data, context_prompt)
                
                # Send response back to client
                response = {
                    "type": "AI_RESPONSE",
                    "text": response_data["text"],
                    "audioData": base64.b64encode(response_data["audio"]).decode('utf-8') if response_data["audio"] else "",
                    "timestamp": data.get("timestamp", 0)
                }
                
                await websocket.send(json.dumps(response))
                logger.info(f"Processed audio request, sent response: {response_data['text'][:100]}... (with audio: {len(response_data['audio'])} bytes)")
                
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