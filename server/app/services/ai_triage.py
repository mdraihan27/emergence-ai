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
    "You are an emergency AI assistant for Bangladesh. Always respond in Bangla. "
    "Classify emergency type and severity (1-5). Provide calm, short guidance. "
    "Escalate if needed."
)


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
                response_bn="দয়া করে সমস্যাটি একটু বিস্তারিত লিখুন, আমি পাশে আছি।",
                should_escalate=False,
            )

        if self._model is None:
            return self._heuristic_triage(user_message, category)

        try:
            return await asyncio.to_thread(
                self._triage_with_gemini,
                user_message,
                category,
            )
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
            for phrase in ["following", "follow", "help", "blood", "রক্ত", "পিছু নিচ্ছে"]
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

        if any(word in text for word in ["আগুন", "fire", "smoke", "burn", "ধোঁয়া"]):
            return EmergencyType.fire.value
        if any(
            word in text
            for word in ["চুরি", "stolen", "ছিনতাই", "follow", "attack", "crime", "পুলিশ"]
        ):
            return EmergencyType.crime.value
        if any(
            word in text
            for word in ["heart", "bleeding", "medical", "doctor", "injury", "অসুস্থ", "রক্ত"]
        ):
            return EmergencyType.medical.value
        if any(word in text for word in ["depression", "panic", "suicide", "anxiety", "মানসিক"]):
            return EmergencyType.mental_health.value
        return EmergencyType.other.value

    @staticmethod
    def _infer_severity_from_text(user_message: str, emergency_type: str) -> int:
        text = user_message.lower()

        if any(word in text for word in ["immediate", "dying", "unconscious", "explosion", "জরুরি"]):
            return 5
        if any(word in text for word in ["following me", "fire", "bleeding", "stuck", "help now", "পিছু নিচ্ছে"]):
            return 4
        if any(word in text for word in ["injury", "threat", "panic", "বিপদ"]):
            return 3
        if any(word in text for word in ["lost", "stolen phone", "চুরি হয়েছে"]):
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
                "আপনি নিরাপদ দূরত্বে যান, গ্যাস/বিদ্যুৎ বন্ধ করার চেষ্টা করুন, "
                "এবং আশেপাশের মানুষকে সতর্ক করুন।"
            )
        if emergency_type == EmergencyType.medical.value:
            return (
                "রোগীকে নিরাপদ ভঙ্গিতে রাখুন, শ্বাসপ্রশ্বাস দেখুন, "
                "প্রয়োজনে কাছের চিকিৎসা সহায়তা দ্রুত নিন।"
            )
        if emergency_type == EmergencyType.crime.value and severity >= 4:
            return (
                "নিরাপদ স্থানে যান, আশেপাশের লোকজনকে জানান, "
                "এবং আপনার অবস্থান শেয়ার করুন।"
            )
        if emergency_type == EmergencyType.mental_health.value:
            return (
                "আপনি একা নন। ধীরে শ্বাস নিন, নিরাপদ কারও সাথে থাকুন, "
                "এবং প্রয়োজন হলে জরুরি সহায়তা নিন।"
            )
        return "আমি আপনার তথ্য নোট করেছি। অনুগ্রহ করে শান্ত থাকুন, আমি সাহায্য করছি।"

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
  "response_bn": "Bangla response only",
  "should_escalate": true
}}

Rules:
- Bangla text only in response_bn
- severity must be integer from 1 to 5
- if severity >= 4, should_escalate must be true
""".strip()
