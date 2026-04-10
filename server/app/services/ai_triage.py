import asyncio
import json
import logging
import re

from app.core.config import Settings
from app.models.ai import TriageResult
from app.models.incident import EmergencyType

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - optional dependency behavior
    genai = None


SYSTEM_PROMPT = (
    "You are an emergency AI assistant for Bangladesh. Always respond in English. "
    "Classify emergency type and severity (1-5). Provide calm, short guidance. "
    "Escalate if needed."
)

GEMINI_REQUEST_TIMEOUT_SECONDS = 10


class AITriageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.logger = logging.getLogger("app.ai_triage")
        self._model = None

        if genai is not None and settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self._model = genai.GenerativeModel(settings.gemini_model)

    async def triage(self, user_message: str, category: str | None = None) -> TriageResult:
        if not user_message.strip():
            return TriageResult(
                type=EmergencyType.other,
                severity=1,
                response_bn="Please describe the problem in a bit more detail. I am here to help.",
                should_escalate=False,
            )

        if self._model is None:
            return self._heuristic_triage(user_message, category)

        try:
            return await asyncio.wait_for(
                asyncio.to_thread(
                    self._triage_with_gemini,
                    user_message,
                    category,
                ),
                timeout=GEMINI_REQUEST_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            self.logger.warning("Gemini triage timed out, using heuristic fallback")
            return self._heuristic_triage(user_message, category)
        except Exception:
            self.logger.exception("Gemini triage failed, using heuristic fallback")
            return self._heuristic_triage(user_message, category)

    def _triage_with_gemini(self, user_message: str, category: str | None = None) -> TriageResult:
        prompt = self._build_prompt(user_message=user_message, category=category)
        response = self._model.generate_content(prompt)
        response_text = (getattr(response, "text", "") or "").strip()

        payload = self._extract_json_payload(response_text)
        if payload is None:
            self.logger.warning("Gemini did not return valid JSON; using fallback")
            return self._heuristic_triage(user_message, category)

        normalized = self._normalize_payload(payload, user_message, category)
        return TriageResult.model_validate(normalized)

    @staticmethod
    def _extract_json_payload(raw_text: str) -> dict | None:
        if not raw_text:
            return None

        match = re.search(r"\{[\s\S]*\}", raw_text)
        if not match:
            return None

        block = match.group(0)
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            return None

    def _normalize_payload(
        self,
        payload: dict,
        user_message: str,
        category: str | None,
    ) -> dict:
        normalized_type = str(payload.get("type") or "").strip().lower()
        if normalized_type not in {item.value for item in EmergencyType}:
            normalized_type = self._infer_type_from_text(user_message, category)

        raw_severity = payload.get("severity")
        try:
            severity = int(raw_severity)
        except Exception:
            severity = self._infer_severity_from_text(user_message, normalized_type)
        severity = max(1, min(5, severity))

        response_bn = str(payload.get("response_bn") or "").strip()
        if not response_bn:
            response_bn = self._default_guidance_bn(normalized_type, severity)

        raw_should_escalate = payload.get("should_escalate")
        should_escalate = bool(raw_should_escalate)
        if severity >= self.settings.severity_escalation_threshold:
            should_escalate = True

        return {
            "type": normalized_type,
            "severity": severity,
            "response_bn": response_bn,
            "should_escalate": should_escalate,
        }

    def _heuristic_triage(self, user_message: str, category: str | None = None) -> TriageResult:
        emergency_type = self._infer_type_from_text(user_message, category)
        severity = self._infer_severity_from_text(user_message, emergency_type)
        should_escalate = severity >= self.settings.severity_escalation_threshold

        if severity == 3 and any(
            phrase in user_message.lower()
            for phrase in ["following", "follow", "help", "blood", "bleeding", "being followed"]
        ):
            should_escalate = True

        return TriageResult(
            type=EmergencyType(emergency_type),
            severity=severity,
            response_bn=self._default_guidance_bn(emergency_type, severity),
            should_escalate=should_escalate,
        )

    def _infer_type_from_text(self, user_message: str, category: str | None = None) -> str:
        if category and category in {item.value for item in EmergencyType}:
            return category

        text = user_message.lower()

        if any(word in text for word in ["fire", "smoke", "burn", "flame"]):
            return EmergencyType.fire.value
        if any(
            word in text
            for word in ["stolen", "robbery", "mugging", "follow", "attack", "crime", "police"]
        ):
            return EmergencyType.crime.value
        if any(
            word in text
            for word in ["heart", "bleeding", "medical", "doctor", "injury", "sick", "unwell"]
        ):
            return EmergencyType.medical.value
        if any(word in text for word in ["depression", "panic", "suicide", "anxiety", "mental"]):
            return EmergencyType.mental_health.value
        return EmergencyType.other.value

    @staticmethod
    def _infer_severity_from_text(user_message: str, emergency_type: str) -> int:
        text = user_message.lower()

        if any(word in text for word in ["immediate", "dying", "unconscious", "explosion", "urgent"]):
            return 5
        if any(word in text for word in ["following me", "being followed", "fire", "bleeding", "stuck", "help now"]):
            return 4
        if any(word in text for word in ["injury", "threat", "panic", "danger"]):
            return 3
        if any(word in text for word in ["lost", "stolen", "stolen phone"]):
            return 1

        defaults = {
            EmergencyType.fire.value: 4,
            EmergencyType.medical.value: 4,
            EmergencyType.crime.value: 3,
            EmergencyType.mental_health.value: 3,
            EmergencyType.other.value: 2,
        }
        return defaults.get(emergency_type, 2)

    @staticmethod
    def _default_guidance_bn(emergency_type: str, severity: int) -> str:
        if emergency_type == EmergencyType.fire.value:
            return (
                "Move to a safe distance, turn off gas/electricity if possible, "
                "and alert nearby people."
            )
        if emergency_type == EmergencyType.medical.value:
            return (
                "Keep the person in a safe position, check breathing, "
                "and seek nearby medical help immediately if needed."
            )
        if emergency_type == EmergencyType.crime.value and severity >= 4:
            return (
                "Move to a safe location, alert people around you, "
                "and share your location with trusted contacts."
            )
        if emergency_type == EmergencyType.mental_health.value:
            return (
                "You are not alone. Take slow breaths, stay with someone you trust, "
                "and seek urgent help if needed."
            )
        return "I have noted your report. Please stay calm; help is being arranged."

    @staticmethod
    def _build_prompt(user_message: str, category: str | None = None) -> str:
        category_hint = category or "not_provided"
        return f"""
{SYSTEM_PROMPT}

User category hint: {category_hint}
User message: {user_message}

Return only valid JSON in this exact format:
{{
  "type": "crime|medical|fire|mental_health|other",
  "severity": 1,
    "response_bn": "English response only",
  "should_escalate": true
}}

Rules:
- English text only in response_bn
- severity must be integer from 1 to 5
- if severity >= 4, should_escalate must be true
""".strip()
