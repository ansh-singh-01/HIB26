"""
Firebase Cloud Messaging (FCM) Service.
Dispatches real-time emergency push alerts to hospital ER desks & doctors
when FIREBASE_SERVER_KEY / FIREBASE_PROJECT_ID is set in .env.
"""
from typing import Optional
import httpx

from app.core.config import settings


async def send_emergency_fcm_alert(
    device_token: str,
    title: str,
    body: str,
    extra_data: Optional[dict] = None,
) -> dict:
    """
    Dispatches Firebase FCM Push Notification.
    Returns status dict indicating success or fallback mock.
    """
    if not settings.FIREBASE_SERVER_KEY:
        return {
            "status": "mock_sent",
            "detail": "[MOCK] FCM alert logged (FIREBASE_SERVER_KEY not set in .env)",
            "title": title,
            "body": body,
        }

    url = "https://fcm.googleapis.com/fcm/send"
    headers = {
        "Authorization": f"key={settings.FIREBASE_SERVER_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "to": device_token,
        "notification": {
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
        },
        "data": extra_data or {},
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            res_data = resp.json()
            return {
                "status": "fcm_sent" if resp.status_code == 200 else "fcm_error",
                "response": res_data,
            }
    except Exception as e:
        return {"status": "fcm_error", "detail": str(e)}
