"""
Cloud Function: Transcribe Audio with Speech-to-Text
Uses Service Account - NO API KEY NEEDED!
"""

import os
import json
from google.cloud import storage
from google.cloud import speech_v1
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel

def clean_transcript_with_gemini(raw_transcript, project_id="arcane-rigging-473104-k3", location="us-central1"):
    """Clean and professionalize transcript using Gemini"""
    try:
        # Initialize Vertex AI
        vertexai.init(project=project_id, location=location)
        model = GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""You are a transcript cleaner for Costco Smart Home Support customer service calls.

Clean and professionalize this raw transcript. Follow these rules:
1. CRITICAL: Remove ALL instances of the word "asterisk" completely - do not replace with bullet points or any symbol
2. Remove any inappropriate language, profanity, or offensive terms  
3. Fix obvious transcription errors and filler words (ohh, uhh, umm, etc.)
4. Keep only relevant customer service dialogue about smart appliances
5. Format as: "Agent: [text]" and "Customer: [text]"
6. Make conversations clear, professional and helpful
7. Convert technical jargon to plain language (e.g., "2.4 gigahertz" → "2.4 GHz")
8. If the conversation is completely inappropriate or off-topic, return: "Agent: Hello, welcome to Costco Smart Home Support. How can I help you today?"

Example input:
"Okay asterisk follow these steps asterisk asterisk first go to settings asterisk network asterisk"

Example cleaned output:
"Okay, follow these steps. First, go to settings, then network."

Raw transcript to clean:
{raw_transcript}

Return ONLY the cleaned transcript with NO asterisks anywhere, no explanations."""

        response = model.generate_content(prompt)
        cleaned = response.text.strip()
        
        print(f"Cleaned transcript with Gemini (reduced from {len(raw_transcript)} to {len(cleaned)} chars)")
        return cleaned
        
    except Exception as e:
        print(f"Gemini cleaning failed: {e}, using raw transcript")
        return raw_transcript

def process_audio(event, context):
    try:
        bucket_name = event['bucket']
        file_name = event['name']
        
        print(f"Processing: gs://{bucket_name}/{file_name}")
        
        # Skip directories only - allow all files including Dialogflow CX files without extensions
        if file_name.endswith('/'):
            print(f"Skip directory: {file_name}")
            return
        
        # Init Speech-to-Text client
        client = speech_v1.SpeechClient()
        
        # Audio config
        audio_uri = f"gs://{bucket_name}/{file_name}"
        audio = speech_v1.RecognitionAudio(uri=audio_uri)
        
        # Speaker diarization config
        diarization_config = speech_v1.SpeakerDiarizationConfig(
            enable_speaker_diarization=True,
            min_speaker_count=2,
            max_speaker_count=2
        )
        
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            language_code="en-US",
            enable_automatic_punctuation=True,
            diarization_config=diarization_config,
            model="phone_call"
        )
        
        print("Transcribing with Speech-to-Text...")
        print(f"Audio URI: {audio_uri}")
        print(f"Config: LINEAR16, auto-detect sample rate, en-US, phone_call model, 2 speakers")
        
        # Long running operation for files > 60 seconds
        operation = client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=300)
        
        # Parse transcript with speaker labels
        transcript_lines = []
        for result in response.results:
            alternative = result.alternatives[0]
            words_info = alternative.words
            
            current_speaker = None
            current_text = []
            
            for word_info in words_info:
                speaker = word_info.speaker_tag
                
                if speaker != current_speaker:
                    if current_text:
                        speaker_label = "Customer" if current_speaker == 1 else "Agent"
                        transcript_lines.append(f"{speaker_label}: {' '.join(current_text)}")
                    current_speaker = speaker
                    current_text = [word_info.word]
                else:
                    current_text.append(word_info.word)
            
            if current_text:
                speaker_label = "Customer" if current_speaker == 1 else "Agent"
                transcript_lines.append(f"{speaker_label}: {' '.join(current_text)}")
        
        transcript = "\n".join(transcript_lines)
        print(f"Transcribed {len(transcript_lines)} lines, {len(transcript)} chars")
        print(f"Preview: {transcript[:200]}...")
        
        # Clean transcript with Gemini
        print("Cleaning transcript with Gemini...")
        cleaned_transcript = clean_transcript_with_gemini(transcript)
        print(f"Cleaned preview: {cleaned_transcript[:200]}...")
        
        # Save
        storage_client = storage.Client()
        
        # Extract session_id - handle both files with and without extensions
        session_id = file_name
        for ext in ['.wav', '.mp3', '.flac']:
            session_id = session_id.replace(ext, '')
        
        transcript_data = {
            "sessionId": session_id,
            "audioFile": audio_uri,
            "transcribedAt": datetime.utcnow().isoformat(),
            "transcript": cleaned_transcript,
            "rawTranscript": transcript,
            "model": "speech-to-text-phone-call-cleaned-by-gemini"
        }
        
        # Save JSON
        output_bucket = storage_client.bucket('service-ticket')
        transcript_blob = output_bucket.blob(f"transcripts/{file_name}.json")
        transcript_blob.upload_from_string(json.dumps(transcript_data, indent=2), content_type='application/json')
        print(f"Saved JSON: gs://service-ticket/transcripts/{file_name}.json")
        
        # Save TXT
        text_blob = output_bucket.blob(f"transcripts/{file_name}.txt")
        text_blob.upload_from_string(cleaned_transcript, content_type='text/plain')
        print(f"Saved TXT: gs://service-ticket/transcripts/{file_name}.txt")
        
        # Archive
        source_bucket = storage_client.bucket(bucket_name)
        blob = source_bucket.blob(file_name)
        cold_bucket = storage_client.bucket('cold-layer')
        source_bucket.copy_blob(blob, cold_bucket, file_name)
        print(f"Archived to: gs://cold-layer/{file_name}")
        blob.delete()
        print(f"Deleted source: gs://{bucket_name}/{file_name}")
        
        print(f"✓ COMPLETE: gs://service-ticket/transcripts/{file_name}.json")
        return {"status": "success"}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e
