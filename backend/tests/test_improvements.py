"""
test_improvements.py - Test script for enhanced AINetUI features
Demonstrates all new capabilities: structured explanations, correlation, chat, search
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List


class AINetUITester:
    """Test client for AINetUI enhanced features."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()
    
    async def test_basic_health(self):
        """Test basic connectivity."""
        print("\n" + "="*80)
        print("TEST 1: Basic Health Check")
        print("="*80)
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                data = await response.json()
                print(f" Status: {response.status}")
                print(f" Health: {json.dumps(data, indent=2)}")
                return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_status_endpoint(self):
        """Test enhanced status endpoint."""
        print("\n" + "="*80)
        print("TEST 2: Enhanced Status Endpoint")
        print("="*80)
        
        try:
            async with self.session.get(f"{self.base_url}/status") as response:
                data = await response.json()
                print(f" Status: {response.status}")
                print("\n System Statistics:")
                print(f"  Total Events: {data.get('total_events', 0)}")
                print(f"  Total Anomalies: {data.get('total_anomalies', 0)}")
                print(f"  AI Queries: {data.get('ai_queries', 0)}")
                print(f"  AI Incidents: {data.get('ai_incidents', 0)}")
                print(f"  AI Mode: {data.get('ai_mode', 'unknown')}")
                print(f"  Events in Memory: {data.get('events_in_memory', 0)}")
                print(f"  Event History Size: {data.get('event_history_size', 0)}")
                print(f"  Connected Clients: {data.get('connected_clients', 0)}")
                return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_events_endpoint(self):
        """Test event retrieval with filtering."""
        print("\n" + "="*80)
        print("TEST 3: Event Retrieval & Filtering")
        print("="*80)
        
        try:
            # Get all recent events
            print("\n Getting last 10 events...")
            async with self.session.get(
                f"{self.base_url}/events?limit=10"
            ) as response:
                data = await response.json()
                print(f" Retrieved {data['total']} events")
                
                if data['events']:
                    print("\n Sample Event:")
                    event = data['events'][0]
                    print(f"  Timestamp: {event.get('timestamp')}")
                    print(f"  Source: {event.get('src')}  Dest: {event.get('dst')}")
                    print(f"  Protocol: {event.get('proto')}")
                    print(f"  Is Anomaly: {event.get('is_anomaly')}")
                    if event.get('is_anomaly'):
                        print(f"  Severity: {event.get('severity')}")
                        print(f"  AI Processed: {event.get('ai_processed')}")
                        if event.get('ai_confidence'):
                            print(f"  AI Confidence: {event.get('ai_confidence')}")
                        if event.get('ai_threat_level'):
                            print(f"  Threat Level: {event.get('ai_threat_level')}")
            
            # Get only anomalies
            print("\n Getting anomalies only...")
            async with self.session.get(
                f"{self.base_url}/events?anomalies_only=true&limit=5"
            ) as response:
                data = await response.json()
                print(f" Retrieved {data['total']} anomalies")
                
            # Filter by severity
            print("\n  Getting high severity events...")
            async with self.session.get(
                f"{self.base_url}/events?min_severity=high&limit=5"
            ) as response:
                data = await response.json()
                print(f" Retrieved {data['total']} high+ severity events")
                
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_search_endpoint(self):
        """Test search functionality."""
        print("\n" + "="*80)
        print("TEST 4: Event Search")
        print("="*80)
        
        try:
            # Search by protocol
            print("\n Searching for UDP traffic...")
            async with self.session.get(
                f"{self.base_url}/search?protocol=UDP"
            ) as response:
                data = await response.json()
                print(f" Found {data['total']} UDP events")
                
            # Search by IP (common mock IP)
            print("\n Searching for IP 192.168.1.50...")
            async with self.session.get(
                f"{self.base_url}/search?ip=192.168.1.50"
            ) as response:
                data = await response.json()
                print(f" Found {data['total']} events involving 192.168.1.50")
                
                if data['results']:
                    print(f"\n  Sample results:")
                    for event in data['results'][:3]:
                        print(f"    - {event.get('src')}  {event.get('dst')} "
                              f"[{event.get('proto')}] {event.get('severity', 'normal')}")
                
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_incidents_endpoint(self):
        """Test incident detection."""
        print("\n" + "="*80)
        print("TEST 5: Incident Detection")
        print("="*80)
        
        try:
            async with self.session.get(f"{self.base_url}/incidents") as response:
                data = await response.json()
                print(f" Status: {response.status}")
                print(f" Total Incidents Detected: {data['total']}")
                
                if data['incidents']:
                    print("\n Incident Details:")
                    for incident in data['incidents'][:5]:  # Show first 5
                        print(f"\n  Incident ID: {incident['id']}")
                        print(f"  Title: {incident['title']}")
                        print(f"  Type: {incident['type']}")
                        print(f"  Severity: {incident['severity']}")
                        print(f"  Event Count: {incident['event_count']}")
                        print(f"  Time Span: {incident['time_span']}")
                        print(f"  Affected Hosts: {', '.join(incident['affected_hosts'])}")
                        print(f"  Protocols: {', '.join(incident['protocols'])}")
                else:
                    print("\n    No incidents detected yet (requires correlated anomalies)")
                    print("  Tip: Wait a few minutes in mock mode for incident generation")
                
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_summary_endpoint(self):
        """Test dashboard summary."""
        print("\n" + "="*80)
        print("TEST 6: Dashboard Summary")
        print("="*80)
        
        try:
            async with self.session.get(f"{self.base_url}/summary") as response:
                data = await response.json()
                summary = data['summary']
                
                print(f" Status: {response.status}")
                print("\n Network Summary:")
                print(f"  Total Events: {summary['total_events']}")
                print(f"  Total Anomalies: {summary['total_anomalies']}")
                print(f"  Anomaly Rate: {summary['anomaly_rate']}")
                
                print("\n Top Anomaly Sources:")
                for ip, count in summary['top_anomaly_sources'].items():
                    print(f"  {ip}: {count} anomalies")
                
                print("\n Protocol Distribution:")
                for proto, count in summary['protocol_distribution'].items():
                    print(f"  {proto}: {count} events")
                
                print("\n  Severity Distribution:")
                for severity, count in summary['severity_distribution'].items():
                    print(f"  {severity}: {count} anomalies")
                
                if data['recent_critical']:
                    print("\n Recent Critical Events:")
                    for event in data['recent_critical']:
                        print(f"  - {event.get('summary', 'Unknown')}")
                
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_chat_interface(self):
        """Test interactive chat."""
        print("\n" + "="*80)
        print("TEST 7: Interactive Chat Interface")
        print("="*80)
        
        questions = [
            "What are the top threats right now?",
            "What is happening with 192.168.1.50?",
            "Are there any DNS anomalies?",
            "Summarize the last hour of network activity",
        ]
        
        try:
            for i, question in enumerate(questions, 1):
                print(f"\n Question {i}: \"{question}\"")
                
                async with self.session.post(
                    f"{self.base_url}/chat",
                    json={"message": question}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f" AI Response:")
                        print(f"  {data['response']}")
                        print(f"  (AI Mode: {data['ai_mode']}, Context Events: {data['context_events_used']})")
                    else:
                        print(f" Error: Status {response.status}")
                        error_text = await response.text()
                        print(f"   {error_text}")
                
                # Small delay between requests
                await asyncio.sleep(0.5)
            
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def test_structured_explanation(self):
        """Test structured AI explanations."""
        print("\n" + "="*80)
        print("TEST 8: Structured AI Explanations")
        print("="*80)
        
        try:
            # Get an anomaly with AI analysis
            async with self.session.get(
                f"{self.base_url}/events?anomalies_only=true&limit=1"
            ) as response:
                data = await response.json()
                
                if not data['events']:
                    print("  No anomalies with AI analysis yet")
                    print("   Tip: Wait for mock mode to generate anomalies")
                    return True
                
                event = data['events'][0]
                
                print(" Found anomaly with AI analysis")
                print(f"\n Event Summary: {event.get('summary')}")
                
                if event.get('ai_processed'):
                    print("\n AI Analysis:")
                    print(f"  Explanation: {event.get('ai_explanation')}")
                    
                    if 'ai_confidence' in event:
                        print(f"\n   Structured Data:")
                        print(f"    Confidence: {event['ai_confidence']}")
                        print(f"    Threat Level: {event['ai_threat_level']}")
                        
                        if event.get('ai_recommendations'):
                            print(f"\n   Recommendations:")
                            for i, rec in enumerate(event['ai_recommendations'], 1):
                                print(f"    {i}. {rec}")
                        
                        if event.get('ai_evidence'):
                            evidence = event['ai_evidence']
                            print(f"\n   Evidence:")
                            print(f"    Event ID: {evidence.get('event_id')}")
                            print(f"    Source IP: {evidence.get('source_ip')}")
                            print(f"    Packet Count: {evidence.get('packet_count')}")
                            print(f"    Expected: {evidence.get('baseline_expected')}")
                            print(f"    Anomaly Factor: {evidence.get('anomaly_multiplier')}")
                        
                        if event.get('ai_correlated_events'):
                            print(f"\n   Correlated with {event['ai_correlated_events']} other events")
                        
                        if event.get('ai_incident'):
                            incident = event['ai_incident']
                            print(f"\n   Part of Incident: {incident['title']}")
                            print(f"     Type: {incident['type']}")
                            print(f"     Severity: {incident['severity']}")
                else:
                    print("\n    AI analysis not available for this event")
            
            return True
        except Exception as e:
            print(f" Error: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests in sequence."""
        print("\n" + "="*80)
        print(" AINetUI ENHANCEMENT TEST SUITE")
        print("="*80)
        print(f"Testing backend at: {self.base_url}")
        print(f"Time: {datetime.now().isoformat()}")
        
        tests = [
            ("Basic Health Check", self.test_basic_health),
            ("Enhanced Status", self.test_status_endpoint),
            ("Event Retrieval", self.test_events_endpoint),
            ("Event Search", self.test_search_endpoint),
            ("Incident Detection", self.test_incidents_endpoint),
            ("Dashboard Summary", self.test_summary_endpoint),
            ("Chat Interface", self.test_chat_interface),
            ("Structured Explanations", self.test_structured_explanation),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"\n Test '{test_name}' failed with error: {e}")
                results.append((test_name, False))
        
        # Print summary
        print("\n" + "="*80)
        print(" TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = " PASS" if result else " FAIL"
            print(f"{status} - {test_name}")
        
        print("\n" + "="*80)
        print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        print("="*80)
        
        if passed == total:
            print("\n All tests passed! Enhanced features are working correctly.")
        else:
            print("\n  Some tests failed. Check the output above for details.")
        
        print("\n Next Steps:")
        print("  1. View WebSocket stream: Open test_client.py in another terminal")
        print("  2. Test chat in browser: Open http://localhost:8000/docs")
        print("  3. Build frontend: Use the enhanced API endpoints")


async def main():
    """Main test runner."""
    import sys
    
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    print("\n Starting AINetUI Enhancement Tests...")
    print(f"   Backend URL: {base_url}")
    print("\n Make sure the backend is running: python main.py")
    print("   Press Ctrl+C to cancel, or wait 3 seconds to continue...")
    
    try:
        await asyncio.sleep(3)
    except KeyboardInterrupt:
        print("\n\n Tests cancelled by user")
        return
    
    async with AINetUITester(base_url) as tester:
        await tester.run_all_tests()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n Tests interrupted by user")
    except Exception as e:
        print(f"\n Fatal error: {e}")
        import traceback
        traceback.print_exc()
