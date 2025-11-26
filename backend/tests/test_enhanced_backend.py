"""
test_enhanced_backend.py - Test script for enhanced backend features
Tests all Sprint 1 improvements: metrics, auth, health checks, rate limiting
"""

import requests
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = "your-api-key-change-me-in-production"  # Update this!


class Colors:
    """ANSI color codes for pretty output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_test(name: str):
    """Print test name"""
    print(f"\n{Colors.BLUE}{Colors.BOLD} TEST: {name}{Colors.ENDC}")


def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN} {message}{Colors.ENDC}")


def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED} {message}{Colors.ENDC}")


def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}  {message}{Colors.ENDC}")


def print_info(message: str):
    """Print info message"""
    print(f"   {message}")


def test_server_running():
    """Test 1: Check if server is running"""
    print_test("Server Running")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Server is running (v{data.get('version', 'unknown')})")
            print_info(f"Service: {data.get('service')}")
            print_info(f"Status: {data.get('status')}")
            return True
        else:
            print_error(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server. Is it running?")
        print_info(f"Expected URL: {BASE_URL}")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_prometheus_metrics():
    """Test 2: Check Prometheus metrics endpoint"""
    print_test("Prometheus Metrics")
    
    try:
        response = requests.get(f"{BASE_URL}/metrics", timeout=5)
        if response.status_code == 200:
            metrics_text = response.text
            
            # Check for key metrics
            expected_metrics = [
                'packetflow_packets_total',
                'packetflow_active_flows',
                'packetflow_websocket_clients',
                'packetflow_queue_depth',
            ]
            
            found_metrics = []
            missing_metrics = []
            
            for metric in expected_metrics:
                if metric in metrics_text:
                    found_metrics.append(metric)
                else:
                    missing_metrics.append(metric)
            
            if len(found_metrics) == len(expected_metrics):
                print_success(f"All {len(expected_metrics)} expected metrics found")
                for metric in found_metrics[:3]:  # Show first 3
                    print_info(f" {metric}")
                return True
            else:
                print_warning(f"Found {len(found_metrics)}/{len(expected_metrics)} metrics")
                if missing_metrics:
                    print_info(f"Missing: {', '.join(missing_metrics)}")
                return False
        else:
            print_error(f"Metrics endpoint returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_api_key_required():
    """Test 3: Check that API key is required for protected endpoints"""
    print_test("API Key Authentication - Without Key")
    
    try:
        response = requests.get(f"{BASE_URL}/status", timeout=5)
        if response.status_code == 403:
            print_success("Protected endpoint correctly requires API key")
            print_info(f"Response: {response.json()}")
            return True
        else:
            print_error(f"Expected 403, got {response.status_code}")
            print_warning("API key authentication may not be enabled")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_api_key_valid():
    """Test 4: Check that valid API key grants access"""
    print_test("API Key Authentication - With Valid Key")
    
    headers = {"X-API-Key": API_KEY}
    
    try:
        response = requests.get(f"{BASE_URL}/status", headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Valid API key accepted")
            print_info(f"Total packets: {data.get('total_packets', 'N/A')}")
            print_info(f"Total events: {data.get('total_events', 'N/A')}")
            print_info(f"Active flows: {data.get('active_flows', 'N/A')}")
            print_info(f"Connected clients: {data.get('connected_clients', 'N/A')}")
            return True
        elif response.status_code == 403:
            print_error("Valid API key rejected")
            print_warning("Check that API_KEY in this script matches .env")
            return False
        else:
            print_error(f"Unexpected status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_health_probes():
    """Test 5: Check health probe endpoints"""
    print_test("Health Probes")
    
    probes = {
        "Liveness": "/health/live",
        "Readiness": "/health/ready",
        "Startup": "/health/startup"
    }
    
    all_passed = True
    
    for probe_name, endpoint in probes.items():
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                print_info(f" {probe_name}: {status}")
                
                if probe_name == "Readiness" and 'checks' in data:
                    for check, result in data['checks'].items():
                        print_info(f"    {check}: {result}")
                
                if probe_name == "Startup" and 'warmup_complete' in data:
                    warmup = data['warmup_complete']
                    print_info(f"    Warmup complete: {warmup}")
            else:
                print_error(f" {probe_name} returned {response.status_code}")
                all_passed = False
        except Exception as e:
            print_error(f" {probe_name} failed: {e}")
            all_passed = False
    
    if all_passed:
        print_success("All health probes passed")
        return True
    else:
        print_warning("Some health probes failed")
        return False


def test_rate_limiting():
    """Test 6: Check rate limiting on /query-event"""
    print_test("Rate Limiting (10 req/min)")
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "event": {
            "src": "192.168.1.1",
            "dst": "8.8.8.8",
            "proto": "TCP",
            "timestamp": datetime.now().isoformat()
        },
        "question": "Test rate limiting"
    }
    
    print_info("Sending 11 rapid requests...")
    
    success_count = 0
    rate_limited = False
    
    try:
        for i in range(11):
            response = requests.post(
                f"{BASE_URL}/query-event",
                headers=headers,
                json=payload,
                timeout=5
            )
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited = True
                print_info(f"Request {i+1}: Rate limited (429) ")
                break
            elif response.status_code == 503:
                print_warning(f"Request {i+1}: AI agent not available (503)")
                print_info("Skipping rate limit test (AI required)")
                return True
            else:
                print_info(f"Request {i+1}: Status {response.status_code}")
            
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limited:
            print_success(f"Rate limiting working ({success_count} allowed, then blocked)")
            return True
        else:
            print_warning(f"No rate limiting detected (sent {success_count} requests)")
            print_info("Expected 429 after 10 requests")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_queue_monitoring():
    """Test 7: Check queue depth metrics"""
    print_test("Queue Depth Monitoring")
    
    try:
        response = requests.get(f"{BASE_URL}/metrics", timeout=5)
        if response.status_code == 200:
            metrics_text = response.text
            
            queue_metrics = []
            for line in metrics_text.split('\n'):
                if 'packetflow_queue_depth' in line and not line.startswith('#'):
                    queue_metrics.append(line.strip())
            
            if queue_metrics:
                print_success(f"Found {len(queue_metrics)} queue metrics")
                for metric in queue_metrics[:3]:  # Show first 3
                    print_info(metric)
                return True
            else:
                print_warning("No queue depth metrics found")
                return False
        else:
            print_error(f"Metrics endpoint returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_packet_drop_tracking():
    """Test 8: Check packet drop metrics"""
    print_test("Packet Drop Tracking")
    
    try:
        # Check status endpoint
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{BASE_URL}/status", headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            packets_dropped = data.get('packets_dropped', None)
            
            if packets_dropped is not None:
                print_success(f"Packet drop tracking enabled")
                print_info(f"Packets dropped: {packets_dropped}")
                return True
            else:
                print_warning("'packets_dropped' not in status response")
                return False
        else:
            print_error(f"Status endpoint returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_websocket_metrics():
    """Test 9: Check WebSocket client metrics"""
    print_test("WebSocket Client Metrics")
    
    try:
        response = requests.get(f"{BASE_URL}/metrics", timeout=5)
        if response.status_code == 200:
            metrics_text = response.text
            
            # Look for websocket_clients metric
            for line in metrics_text.split('\n'):
                if 'packetflow_websocket_clients' in line and not line.startswith('#'):
                    print_success("WebSocket client tracking enabled")
                    print_info(line.strip())
                    return True
            
            print_warning("WebSocket client metric not found")
            return False
        else:
            print_error(f"Metrics endpoint returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_cors_configuration():
    """Test 10: Check CORS headers"""
    print_test("CORS Configuration")
    
    headers = {
        "Origin": "http://localhost:5173"
    }
    
    try:
        response = requests.options(f"{BASE_URL}/status", headers=headers, timeout=5)
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        }
        
        if any(cors_headers.values()):
            print_success("CORS headers configured")
            for header, value in cors_headers.items():
                if value:
                    print_info(f"{header}: {value[:50]}...")
            return True
        else:
            print_warning("No CORS headers found")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def run_all_tests():
    """Run all tests and provide summary"""
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"  PacketFlow Enhanced Backend Test Suite")
    print(f"  Sprint 1 Implementation Validation")
    print(f"{'='*60}{Colors.ENDC}\n")
    
    print_info(f"Testing server at: {BASE_URL}")
    print_info(f"API Key: {'***' + API_KEY[-6:] if len(API_KEY) > 6 else '***'}")
    print_info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("Server Running", test_server_running),
        ("Prometheus Metrics", test_prometheus_metrics),
        ("API Auth (No Key)", test_api_key_required),
        ("API Auth (Valid Key)", test_api_key_valid),
        ("Health Probes", test_health_probes),
        ("Rate Limiting", test_rate_limiting),
        ("Queue Monitoring", test_queue_monitoring),
        ("Packet Drop Tracking", test_packet_drop_tracking),
        ("WebSocket Metrics", test_websocket_metrics),
        ("CORS Configuration", test_cors_configuration),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{Colors.BOLD}{'='*60}")
    print("  Test Summary")
    print(f"{'='*60}{Colors.ENDC}\n")
    
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    for test_name, result in results:
        status = f"{Colors.GREEN} PASS{Colors.ENDC}" if result else f"{Colors.RED} FAIL{Colors.ENDC}"
        print(f"  {status}  {test_name}")
    
    print(f"\n{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"  Total: {len(results)} tests")
    print(f"  {Colors.GREEN}Passed: {passed}{Colors.ENDC}")
    print(f"  {Colors.RED}Failed: {failed}{Colors.ENDC}")
    print(f"  Success Rate: {passed/len(results)*100:.1f}%")
    print(f"{Colors.BOLD}{'='*60}{Colors.ENDC}\n")
    
    if failed == 0:
        print(f"{Colors.GREEN}{Colors.BOLD} All tests passed! Sprint 1 implementation successful!{Colors.ENDC}\n")
        return 0
    else:
        print(f"{Colors.YELLOW}  Some tests failed. Check implementation.{Colors.ENDC}\n")
        return 1


if __name__ == "__main__":
    # Check if API key was updated
    if API_KEY == "your-api-key-change-me-in-production":
        print_warning("WARNING: Using default API key!")
        print_info("Update API_KEY variable in this script before testing")
        print()
        
        user_input = input("Continue anyway? (y/n): ")
        if user_input.lower() != 'y':
            sys.exit(1)
    
    exit_code = run_all_tests()
    sys.exit(exit_code)
