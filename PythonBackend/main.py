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
import re
from google.oauth2 import service_account
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedLinguavaBackend:
    def __init__(self, project_id: str, key_file_path: str, azure_speech_key: str, azure_speech_region: str, location: str = "us-central1"):
        # Configuration from environment variables
        self.project_id = project_id
        self.key_file_path = key_file_path
        self.location = location
        self.model = None
        self.connected_clients = set()
        self.credentials = None
        
        # Azure Speech configuration from environment
        self.azure_speech_key = azure_speech_key
        self.azure_speech_region = azure_speech_region
        self.speech_config = None
        
        # Voice configuration for different languages
        self.voices = {
            "english": os.getenv("VOICE_ENGLISH", "en-US-AriaNeural"),
            "japanese": os.getenv("VOICE_JAPANESE", "ja-JP-NanamiNeural"), 
            "spanish": os.getenv("VOICE_SPANISH", "es-ES-ElviraNeural"),
            "french": os.getenv("VOICE_FRENCH", "fr-FR-DeniseNeural"),
            "chinese": os.getenv("VOICE_CHINESE", "zh-CN-XiaoxiaoNeural")
        }
        
        # Target language for learning (configurable)
        self.target_language = os.getenv("TARGET_LANGUAGE", "japanese").lower()
        
        # Load Google credentials from key file (for Vertex AI)
        self._load_credentials()
        
        # Initialize Vertex AI with credentials
        vertexai.init(
            project=project_id, 
            location=location,
            credentials=self.credentials
        )
        
        # Initialize Azure Speech configuration
        self._initialize_azure_speech()
        
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
    
    def _initialize_azure_speech(self):
        """Initialize Azure Speech configuration"""
        try:
            self.speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_speech_key, 
                region=self.azure_speech_region
            )
            
            # Set default English voice
            self.speech_config.speech_synthesis_voice_name = self.voices["english"]
            
            # Set audio format to match Minecraft mod expectations
            self.speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
            )
            
            logger.info(f"Azure Speech initialized with voice: {self.speech_config.speech_synthesis_voice_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Azure Speech: {e}")
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
        
        # Customize prompt based on target language
        language_examples = {
            "japanese": {
                "name": "Japanese",
                "examples": "stone is 'ishi' (ee-shee), wood is 'ki' (kee), water is 'mizu' (mee-zoo)",
                "time_day": "day time (hiru)", 
                "time_night": "night time (yoru)",
                "weather_rain": "raining (ame)",
                "weather_clear": "clear (hareta)"
            },
            "spanish": {
                "name": "Spanish", 
                "examples": "stone is 'piedra', wood is 'madera', water is 'agua'",
                "time_day": "day time (día)",
                "time_night": "night time (noche)", 
                "weather_rain": "raining (lluvia)",
                "weather_clear": "clear (despejado)"
            },
            "french": {
                "name": "French",
                "examples": "stone is 'pierre', wood is 'bois', water is 'eau'", 
                "time_day": "day time (jour)",
                "time_night": "night time (nuit)",
                "weather_rain": "raining (pluie)", 
                "weather_clear": "clear (clair)"
            }
        }
        
        lang_config = language_examples.get(self.target_language, language_examples["japanese"])
        
        prompt = f"""You are a friendly, enthusiastic language tutor helping someone learn {lang_config['name']} while playing Minecraft. 

IMPORTANT GUIDELINES:
- Keep responses SHORT (1-2 sentences max)
- Be CONVERSATIONAL and natural
- Mix English and {lang_config['name']} appropriately for learning
- Use simple {lang_config['name']} words with English pronunciation guides
- Include relevant {lang_config['name']} vocabulary for Minecraft items/actions
- Be encouraging and supportive

CURRENT GAME CONTEXT:
- Player health: {player.get('health', 'unknown')}/20, hunger: {player.get('hunger', 'unknown')}/20
- Holding: {player.get('heldItem', 'nothing')}
- Looking at: {target.get('id', 'nothing')} ({target.get('type', 'none')})
- Environment: {world.get('biome', 'unknown').replace('minecraft:', '').replace('_', ' ')}
- Time: {lang_config['time_night'] if world.get('timeOfDay', 0) > 13000 else lang_config['time_day']}
- Weather: {lang_config['weather_rain'] if world.get('isRaining', False) else lang_config['weather_clear']}

RESPONSE FORMAT:
- Start with natural English conversation
- Include 1-2 relevant {lang_config['name']} words/phrases with pronunciation
- Keep it contextual to their current activity
- Example: "Nice stone! In {lang_config['name']}, {lang_config['examples'].split(',')[0]}. What are you building?"

Respond naturally like you're playing alongside them!"""
        
        return prompt

    def detect_language_in_text(self, text: str) -> str:
        """Detect primary language in response text"""
        # Simple detection based on character patterns
        japanese_chars = re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text)
        chinese_chars = re.findall(r'[\u4E00-\u9FFF]', text)
        
        if japanese_chars and len(japanese_chars) > 3:
            return "japanese"
        elif chinese_chars and len(chinese_chars) > 3:
            return "chinese"
        else:
            return "english"

    async def text_to_speech_smart(self, text: str) -> bytes:
        """Convert text to speech with smart language detection and voice switching"""
        try:
            # Detect if text contains non-English content
            detected_lang = self.detect_language_in_text(text)
            
            # Choose appropriate voice
            voice_name = self.voices.get(detected_lang, self.voices["english"])
            
            # Create speech config
            speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_speech_key,
                region=self.azure_speech_region
            )
            
            # For mixed language content, use SSML for better pronunciation
            if detected_lang != "english" and any(char.isascii() and char.isalpha() for char in text):
                # Mixed content - use SSML
                ssml_text = self._create_mixed_language_ssml(text, voice_name)
                return await self._synthesize_ssml(ssml_text, speech_config)
            else:
                # Single language - use regular synthesis
                speech_config.speech_synthesis_voice_name = voice_name
                speech_config.set_speech_synthesis_output_format(
                    speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
                )
                
                synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
                result = synthesizer.speak_text_async(text).get()
                
                if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                    return result.audio_data
                else:
                    logger.error(f"Speech synthesis failed: {result.reason}")
                    return b""
                
        except Exception as e:
            logger.error(f"Error in smart text-to-speech: {e}")
            return b""

    def _create_mixed_language_ssml(self, text: str, primary_voice: str) -> str:
        """Create SSML for mixed language content"""
        # Simple SSML wrapper - could be enhanced for better language detection
        english_voice = self.voices["english"]
        
        ssml = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="{english_voice}">
        {text}
    </voice>
</speak>'''
        return ssml

    async def _synthesize_ssml(self, ssml_text: str, speech_config) -> bytes:
        """Synthesize SSML text"""
        try:
            speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
            )
            
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
            result = synthesizer.speak_ssml_async(ssml_text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                return result.audio_data
            else:
                logger.error(f"SSML synthesis failed: {result.reason}")
                return b""
                
        except Exception as e:
            logger.error(f"Error in SSML synthesis: {e}")
            return b""

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
            
            # Generate audio using smart language detection
            audio_response = await self.text_to_speech_smart(text_response)
            
            return {
                "text": text_response,
                "audio": audio_response
            }
            
        except Exception as e:
            logger.error(f"Error processing with Gemini: {e}")
            fallback_text = "Sorry, I couldn't process that. Sumimasen! (excuse me) Try again?"
            return {
                "text": fallback_text,
                "audio": await self.text_to_speech_smart(fallback_text)
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
        
        logger.info(f"Starting Enhanced Linguava backend server on {host}:{port}")
        logger.info(f"Available voices: {list(self.voices.keys())}")
        async with websockets.serve(self.handle_client, host, port):
            logger.info("Server started successfully")
            await asyncio.Future()  # Run forever

async def main():
    """Main function that loads configuration from environment variables"""
    
    # Load configuration from environment variables
    PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
    KEY_FILE_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./key.json")
    AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
    AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "eastus")
    
    # Validate required configuration
    missing_vars = []
    
    if not PROJECT_ID:
        missing_vars.append("GOOGLE_CLOUD_PROJECT")
    
    if not AZURE_SPEECH_KEY:
        missing_vars.append("AZURE_SPEECH_KEY")
    
    if missing_vars:
        logger.error("Missing required environment variables:")
        for var in missing_vars:
            logger.error(f"  - {var}")
        logger.error("")
        logger.error("Please create a .env file with the required variables.")
        logger.error("See .env.example for reference.")
        return
    
    # Check if key file exists
    if not os.path.exists(KEY_FILE_PATH):
        logger.error(f"Google service account key file not found: {KEY_FILE_PATH}")
        logger.error("Please ensure your Google service account key file exists")
        logger.error("You can download it from Google Cloud Console → IAM & Admin → Service Accounts")
        return
    
    # Log configuration (without sensitive data)
    logger.info("🚀 Starting Linguava Backend")
    logger.info(f"📋 Project ID: {PROJECT_ID}")
    logger.info(f"🔑 Key File: {KEY_FILE_PATH}")
    logger.info(f"🌍 Azure Region: {AZURE_SPEECH_REGION}")
    logger.info(f"🎯 Target Language: {os.getenv('TARGET_LANGUAGE', 'japanese')}")
    logger.info("=" * 50)
    
    try:
        backend = EnhancedLinguavaBackend(PROJECT_ID, KEY_FILE_PATH, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION)
        await backend.start_server()
    except KeyboardInterrupt:
        logger.info("\n🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"\n❌ Server error: {e}")
        logger.error("Please check your configuration and try again")

if __name__ == "__main__":
    asyncio.run(main())