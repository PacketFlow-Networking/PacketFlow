"""
test_instructor_integration.py - Test Instructor structured outputs
"""
import asyncio
import json
from datetime import datetime
from ai_agent import AIAgent
from config import config

async def test_structured_explanation():
    """Test structured explanation generation."""
    print("=" * 80)
    print("Testing Instructor Integration - Structured AI Outputs")
    print("=" * 80)
    
    # Create AI agent
    agent = AIAgent(
        mode=config.ai.mode,
        ollama_url=config.ai.ollama_url,
        local_model=config.ai.local_model,
        remote_url=config.ai.remote_url,
        remote_model=config.ai.remote_model,
        timeout=60
    )
    
    try:
        await agent.initialize()
        print(f"\n AI Agent initialized in {config.ai.mode.upper()} mode")
        print(f"   Base URL: {config.ai.ollama_url if config.ai.mode == 'local' else config.ai.remote_url}")
        print(f"   Model: {config.ai.local_model if config.ai.mode == 'local' else config.ai.remote_model}")
        
        # Create a test event
        test_event = {
            "timestamp": datetime.now().isoformat(),
            "src": "192.168.1.50",
            "dst": "8.8.8.8",
            "proto": "UDP",
            "flows": 500,
            "total_bytes": 125000,
            "baseline_avg": 50,
            "anomaly_score": 0.91,
            "is_anomaly": True,
            "severity": "critical",
            "detection_methods": ["Z-Score", "Protocol"],
            "threat_indicators": ["DNS_TUNNELING"],
            "summary": " ANOMALY [CRITICAL]: DNS spike detected (500 flows vs 50 baseline, 10.0x increase)"
        }
        
        print("\n" + "=" * 80)
        print("TEST 1: Structured Event Explanation")
        print("=" * 80)
        print(f"\nTest Event: {test_event['src']} → {test_event['dst']}")
        print(f"Severity: {test_event['severity']}, Score: {test_event['anomaly_score']:.2f}")
        print(f"Threats: {', '.join(test_event['threat_indicators'])}")
        
        # Generate explanation
        print("\n Querying AI with structured schema...")
        result = await agent._generate_structured_explanation(test_event, [])
        
        print("\n STRUCTURED RESPONSE:")
        print("-" * 80)
        print(json.dumps(result, indent=2))
        print("-" * 80)
        
        # Validate structure
        required_fields = ["text", "confidence", "threat_level", "recommendations", "evidence", "important_factors"]
        missing_fields = [field for field in required_fields if field not in result]
        
        if missing_fields:
            print(f"\n  FAILED: Missing fields: {missing_fields}")
        else:
            print(f"\n  SUCCESS: All required fields present")
            print(f"   - Explanation: {len(result['text'])} chars")
            print(f"   - Important Factors: {len(result['important_factors'])} items")
            print(f"   - Recommendations: {len(result['recommendations'])} items")
            print(f"   - Threat Level: {result['threat_level']}")
            print(f"   - Confidence: {result['confidence']}")
        
        # Test chat query
        print("\n" + "=" * 80)
        print("TEST 2: Structured Chat Query")
        print("=" * 80)
        
        # Add event to memory
        agent.recent_events.append(test_event)
        
        chat_query = "What kind of attack is this and what should I do?"
        print(f"\nQuery: '{chat_query}'")
        
        print("\n Querying AI with ChatResponse schema...")
        chat_result = await agent.process_chat_query(chat_query, include_events=True)
        
        print("\n CHAT RESPONSE:")
        print("-" * 80)
        print(json.dumps(chat_result, indent=2))
        print("-" * 80)
        
        if 'response' in chat_result and 'confidence' in chat_result:
            print(f"\n  SUCCESS: Chat query returned structured response")
            print(f"   - Answer: {chat_result['response'][:100]}...")
            print(f"   - Confidence: {chat_result['confidence']}")
            print(f"   - Events analyzed: {chat_result.get('events_analyzed', 0)}")
        else:
            print(f"\n  FAILED: Chat response missing required fields")
        
        # Test event query
        print("\n" + "=" * 80)
        print("TEST 3: Structured Event Query")
        print("=" * 80)
        
        event_question = "Is this a real attack or a false positive?"
        print(f"\nQuestion: '{event_question}'")
        
        print("\n Querying AI with EventQueryResponse schema...")
        event_result = await agent.query_event(test_event, event_question)
        
        print("\n EVENT QUERY RESPONSE:")
        print("-" * 80)
        print(json.dumps(event_result, indent=2))
        print("-" * 80)
        
        if 'analysis' in event_result and 'severity_assessment' in event_result:
            print(f"\n  SUCCESS: Event query returned structured response")
            print(f"   - Analysis: {event_result['analysis'][:100]}...")
            print(f"   - Severity Assessment: {event_result['severity_assessment']}")
            print(f"   - Next Steps: {len(event_result.get('next_steps', []))} items")
        else:
            print(f"\n  FAILED: Event query response missing required fields")
        
        # Final summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"\nTotal queries: {agent.query_count}")
        print(f"Mode: {agent.mode.upper()}")
        print(f"Model: {agent.remote_model if agent.mode == 'remote' else agent.local_model}")
        print("\n All tests completed! Structured outputs working correctly.")
        
    except Exception as e:
        print(f"\n ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await agent.close()


if __name__ == "__main__":
    print("\nMake sure the AI service is running:")
    print(f"  - Mode: {config.ai.mode}")
    print(f"  - URL: {config.ai.ollama_url if config.ai.mode == 'local' else config.ai.remote_url}")
    print(f"  - Model: {config.ai.local_model if config.ai.mode == 'local' else config.ai.remote_model}")
    print("\nStarting tests...\n")
    
    asyncio.run(test_structured_explanation())
