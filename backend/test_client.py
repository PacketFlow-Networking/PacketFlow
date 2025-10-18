"""
test_client.py - WebSocket test client for AINetUI backend
"""

import asyncio
import websockets
import json
from datetime import datetime


async def test_websocket():
    """Connect to WebSocket and display events."""
    uri = "ws://localhost:8000/ws/updates"
    
    print("=" * 70)
    print("AINetUI WebSocket Test Client")
    print("=" * 70)
    print(f"Connecting to {uri}...\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print(" Connected successfully!")
            print("\nWaiting for events (Ctrl+C to stop)...\n")
            print("-" * 70)
            
            event_count = 0
            anomaly_count = 0
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get('type', 'unknown')
                    
                    if msg_type == 'connected':
                        print(f" Server: {data.get('message')}")
                        print("-" * 70)
                    
                    elif msg_type == 'network_event':
                        event_count += 1
                        event = data['data']
                        
                        # Display event header
                        timestamp = event.get('timestamp', '')
                        is_anomaly = event.get('is_anomaly', False)
                        
                        if is_anomaly:
                            anomaly_count += 1
                            print(f"\n ANOMALY #{anomaly_count} [{timestamp}]")
                        else:
                            print(f"\n Event #{event_count} [{timestamp}]")
                        
                        # Display event summary
                        summary = event.get('summary', 'No summary')
                        print(f"   {summary}")
                        
                        # Display details
                        print(f"   Source: {event.get('src')}  Destination: {event.get('dst')}")
                        print(f"   Protocol: {event.get('proto')} | Packets: {event.get('flows')} | Bytes: {event.get('total_bytes')}")
                        
                        # Display AI explanation if available
                        if event.get('ai_processed') and event.get('ai_explanation'):
                            print(f"    AI Analysis:")
                            explanation = event['ai_explanation']
                            # Format multi-line explanations
                            for line in explanation.split('\n'):
                                if line.strip():
                                    print(f"      {line.strip()}")
                        
                        print("-" * 70)
                    
                    elif msg_type == 'keepalive':
                        # Don't print keepalive messages
                        pass
                    
                    else:
                        print(f"Unknown message type: {msg_type}")
                
                except json.JSONDecodeError as e:
                    print(f"Error decoding message: {e}")
                except Exception as e:
                    print(f"Error processing message: {e}")
    
    except websockets.exceptions.WebSocketException as e:
        print(f"\n WebSocket error: {e}")
        print("\nMake sure the backend is running:")
        print("   python main.py")
    except ConnectionRefusedError:
        print(f"\n Connection refused to {uri}")
        print("\nMake sure the backend is running:")
        print("   python main.py")
    except KeyboardInterrupt:
        print("\n\nDisconnecting...")
    except Exception as e:
        print(f"\n Unexpected error: {e}")
    
    print("\n" + "=" * 70)
    print(f"Session Summary:")
    print(f"  Total Events: {event_count}")
    print(f"  Anomalies Detected: {anomaly_count}")
    print("=" * 70)


async def test_rest_api():
    """Test REST API endpoints."""
    import aiohttp
    
    print("\n" + "=" * 70)
    print("Testing REST API Endpoints")
    print("=" * 70)
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        # Test root endpoint
        try:
            async with session.get(f"{base_url}/") as response:
                data = await response.json()
                print(f"\n GET / - Status: {response.status}")
                print(f"   Service: {data.get('service')}")
                print(f"   Version: {data.get('version')}")
        except Exception as e:
            print(f"\n GET / - Error: {e}")
        
        # Test status endpoint
        try:
            async with session.get(f"{base_url}/status") as response:
                data = await response.json()
                print(f"\n GET /status - Status: {response.status}")
                print(f"   Total Events: {data.get('total_events', 0)}")
                print(f"   Total Anomalies: {data.get('total_anomalies', 0)}")
                print(f"   Active Flows: {data.get('active_flows', 0)}")
                print(f"   Connected Clients: {data.get('connected_clients', 0)}")
                if 'ai_model' in data:
                    print(f"   AI Model: {data.get('ai_model')}")
        except Exception as e:
            print(f"\n GET /status - Error: {e}")
        
        # Test health endpoint
        try:
            async with session.get(f"{base_url}/health") as response:
                data = await response.json()
                print(f"\n GET /health - Status: {response.status}")
                print(f"   Health: {data.get('status')}")
        except Exception as e:
            print(f"\n GET /health - Error: {e}")
    
    print("\n" + "=" * 70)


async def main():
    """Main entry point."""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--api-test':
        await test_rest_api()
    else:
        await test_websocket()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest client stopped.")
