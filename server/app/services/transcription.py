import asyncio
import tempfile
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except Exception:  # pragma: no cover - optional dependency behavior
    WhisperModel = None

try:
    import whisper as openai_whisper
except Exception:  # pragma: no cover - optional dependency behavior
    openai_whisper = None


class TranscriptionService:
    def __init__(self, model_name: str, language: str = "bn") -> None:
        self.model_name = model_name
        self.language = language
        self._model = None
        self._backend = ""

    def _ensure_model(self):
        if self._model is not None:
            return self._model

        if WhisperModel is not None:
            self._backend = "faster_whisper"
            self._model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
            return self._model

        if openai_whisper is not None:
            self._backend = "openai_whisper"
            self._model = openai_whisper.load_model(self.model_name)
            return self._model

        raise RuntimeError(
            "No speech-to-text backend installed. Install faster-whisper or openai-whisper."
        )

    def _transcribe_with_faster_whisper(self, model, file_path: Path) -> str:
        segments, _ = model.transcribe(str(file_path), language=self.language)
        text = " ".join(segment.text.strip() for segment in segments if segment.text)
        return text.strip()

    def _transcribe_with_openai_whisper(self, model, file_path: Path) -> str:
        result = model.transcribe(str(file_path), language=self.language)
        return str(result.get("text", "")).strip()

    def _transcribe_file(self, file_path: Path) -> str:
        model = self._ensure_model()
        if self._backend == "faster_whisper":
            return self._transcribe_with_faster_whisper(model, file_path)
        if self._backend == "openai_whisper":
            return self._transcribe_with_openai_whisper(model, file_path)

        # Defensive fallback for unexpected backend state.
        if openai_whisper is None:
            raise RuntimeError(
                "Speech-to-text model backend is not available."
            )
        self._backend = "openai_whisper"
        return self._transcribe_with_openai_whisper(openai_whisper.load_model(self.model_name), file_path)

    @staticmethod
    def _write_temp_file(audio_bytes: bytes, suffix: str) -> Path:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            return Path(temp_file.name)

    @staticmethod
    def _delete_file(file_path: Path) -> None:
        file_path.unlink(missing_ok=True)

    async def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".wav") -> str:
        temp_path = await asyncio.to_thread(self._write_temp_file, audio_bytes, suffix)

        try:
            return await asyncio.to_thread(self._transcribe_file, temp_path)
        finally:
            await asyncio.to_thread(self._delete_file, temp_path)
