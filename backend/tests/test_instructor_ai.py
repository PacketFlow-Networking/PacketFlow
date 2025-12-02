"""
Test script for Instructor-based structured AI responses.

Run this after starting the backend to test the new AI endpoints.
"""
import asyncio
import httpx
import json


async def test_analyze_event():
    """Test structured event analysis."""
    print("\n" + "="*80)
    print("TEST 1: Analyze Event with Structured Output")
    print("="*80)
    
    event_data = {
        "event": {
            "timestamp": "2025-11-29T12:00:00Z",
            "src": "192.168.1.50",
            "dst": "8.8.8.8",
            "proto": "UDP",
            "flows": 500,
            "total_bytes": 125000,
            "anomaly_score": 0.91,
            "detection_methods": ["Z-Score", "Protocol"],
            "threat_indicators": ["DNS_TUNNELING"],
            "summary": " ANOMALY [CRITICAL]: High DNS traffic spike detected"
        },
        "include_context": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:8000/api/ai/analyze-event",
                json=event_data
            )
            
            if response.status_code == 200:
                analysis = response.json()
                print("\n Response received and validated!")
                print(f"\nThreat Level: {analysis['threat_level'].upper()}")
                print(f"Confidence: {analysis['confidence']:.2%}")
                print(f"\nSummary:\n{analysis['summary']}")
                
                if analysis['threat_indicators']:
                    print(f"\nThreat Indicators ({len(analysis['threat_indicators'])}):")
                    for indicator in analysis['threat_indicators']:
                        print(f"  - [{indicator['type']}] {indicator['evidence']}")
                        print(f"    Confidence: {indicator['confidence']:.2%}")
                
                print(f"\nRecommendations ({len(analysis['recommendations'])}):")
                for i, rec in enumerate(analysis['recommendations'], 1):
                    print(f"  {i}. [{rec['priority'].upper()}] {rec['action']}")
                    print(f"     {rec['details']}")
            else:
                print(f"\n Error: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"\n Exception: {e}")


async def test_correlate_incident():
    """Test incident correlation."""
    print("\n" + "="*80)
    print("TEST 2: Correlate Multiple Events into Incident")
    print("="*80)
    
    incident_data = {
        "event_ids": ["evt1", "evt2", "evt3"],
        "events_data": [
            {
                "timestamp": "2025-11-29T12:00:00Z",
                "src": "192.168.1.50",
                "dst": "8.8.8.8",
                "proto": "UDP",
                "anomaly_score": 0.85,
                "detection_methods": ["Z-Score"],
                "threat_indicators": ["DNS_TUNNELING"],
                "summary": "DNS tunneling detected"
            },
            {
                "timestamp": "2025-11-29T12:01:00Z",
                "src": "192.168.1.50",
                "dst": "1.1.1.1",
                "proto": "UDP",
                "anomaly_score": 0.78,
                "detection_methods": ["Rate-Based"],
                "threat_indicators": ["DNS_TUNNELING"],
                "summary": "Continued DNS tunneling to alternate server"
            },
            {
                "timestamp": "2025-11-29T12:02:00Z",
                "src": "192.168.1.50",
                "dst": "10.0.0.5",
                "proto": "TCP",
                "anomaly_score": 0.92,
                "detection_methods": ["Behavioral"],
                "threat_indicators": ["LATERAL_MOVEMENT"],
                "summary": "Lateral movement to internal server"
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:8000/api/ai/correlate-incident",
                json=incident_data
            )
            
            if response.status_code == 200:
                incident = response.json()
                print("\n Incident correlation complete!")
                print(f"\nIncident: {incident['incident_title']}")
                print(f"Severity: {incident['severity'].upper()}")
                print(f"Attack Stage: {incident.get('attack_stage', 'N/A')}")
                print(f"Events Correlated: {incident['related_event_count']}")
                print(f"\nDescription:\n{incident['description']}")
                print(f"\nTimeline:\n{incident['timeline']}")
                
                print(f"\nIncident Recommendations ({len(incident['recommendations'])}):")
                for i, rec in enumerate(incident['recommendations'], 1):
                    print(f"  {i}. [{rec['priority'].upper()}] {rec['action']}")
                    print(f"     {rec['details']}")
            else:
                print(f"\n Error: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"\n Exception: {e}")


async def test_chat():
    """Test structured chat response."""
    print("\n" + "="*80)
    print("TEST 3: Interactive Chat Query")
    print("="*80)
    
    chat_data = {
        "question": "What are the common signs of DNS tunneling attacks?",
        "include_events": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:8000/api/ai/chat",
                json=chat_data
            )
            
            if response.status_code == 200:
                chat = response.json()
                print("\n Chat response received!")
                print(f"\nQuestion: {chat_data['question']}")
                print(f"\nAnswer:\n{chat['answer']}")
                print(f"\nConfidence: {chat['confidence']:.2%}")
                
                if chat.get('related_events'):
                    print(f"\nRelated Events: {', '.join(chat['related_events'])}")
                
                if chat.get('follow_up_questions'):
                    print(f"\nSuggested Follow-ups:")
                    for q in chat['follow_up_questions']:
                        print(f"  - {q}")
            else:
                print(f"\n Error: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"\n Exception: {e}")


async def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("PacketFlow Instructor Integration - Test Suite")
    print("="*80)
    print("\nPrerequisites:")
    print("  1. Backend running on http://localhost:8000")
    print("  2. AI_MODE=remote in .env")
    print("  3. REMOTE_AI_URL=https://chatucy.cs.ucy.ac.cy/api/send_message")
    print("\nRunning tests...")
    
    # Run tests sequentially
    await test_analyze_event()
    await asyncio.sleep(2)
    
    await test_correlate_incident()
    await asyncio.sleep(2)
    
    await test_chat()
    
    print("\n" + "="*80)
    print("Tests complete! Check the results above.")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
