# Visual Data Flow Diagrams

##  Mock Mode OFF - Real Network Monitoring

```

                        YOUR NETWORK                              
               
   Laptop      Phone       Server      Printer         
   192.168     192.168     10.0.0.5    192.168         
   .1.105      .1.107                  .1.200          
               
                                                             
                      
                                                                 
                                                       
                     Router                                     
                    Gateway                                     
                                                       
                                                                 

                          
                           Real Packets
                          

                   BACKEND (Python)                               
    
   capture.py (TShark)                                         
     Captures packets: 192.168.1.105  8.8.8.8              
     Extracts: src, dst, proto, size, timestamp              
    
                                                                 
    
   condense.py                                                 
     Aggregates flows                                         
     Detects anomalies                                        
     Creates events with REAL IPs                             
    
                                                                 
    
   websocket_server.py                                         
     Broadcasts: {                                            
        "src": "192.168.1.105",                               
        "dst": "8.8.8.8",                                     
        "proto": "UDP",                                       
        "flows": 45                                           
      }                                                        
    

                        
                         WebSocket (ws://localhost:8000/ws/updates)
                        

                   FRONTEND (React)                               
    
   useWebSocket.ts                                             
     Receives WebSocket message                               
     Parses event data                                        
     Calls addEvent()                                         
    
                                                                 
    
   Global Store (Zustand)                                      
     events: [                                                
        { src: "192.168.1.105", dst: "8.8.8.8", ... },       
        { src: "192.168.1.107", dst: "1.1.1.1", ... }        
      ]                                                        
    
                                                                 
    
   TopologyView.tsx                                            
     Reads events from store                                  
     Creates node for each unique IP                          
     Displays: [192.168.1.105]  [8.8.8.8]                  
                [192.168.1.107]  [1.1.1.1]                  
                [10.0.0.5]  [142.250.185.46]                
    


Result: REAL IP addresses from YOUR network appear in topology!
```

---

##  Mock Mode ON - Frontend Simulation

```

                   FRONTEND (React)                               
                                                                  
    
   App.tsx (useEffect - Mock Mode)                            
     Runs every 3-8 seconds                                   
     Calls generateMockEvent()                                
    
                                                                 
    
   mockData.ts                                                 
     HARDCODED IP Pool (12 IPs):                             
      Internal: [                                              
        '192.168.1.10', '192.168.1.15', '192.168.1.20',      
        '10.0.0.5', '10.0.0.10', '172.16.0.1'                
      ]                                                        
      External: [                                              
        '8.8.8.8', '1.1.1.1', '208.67.222.222',              
        '142.250.185.46', '151.101.1.69', '104.16.132.229'   
      ]                                                        
                                                               
     Randomly selects src and dst from pool                  
     Returns fake event: {                                   
        src: "192.168.1.10",  // Random pick                  
        dst: "8.8.8.8",       // Random pick                  
        proto: "TCP",         // Random protocol              
        flows: 234,           // Random count                 
        anomaly_score: 0.45   // Random score                 
      }                                                        
    
                                                                 
    
   addEvent()  Global Store                                   
     Stores fake events                                       
     events: [                                                
        { src: "192.168.1.10", dst: "8.8.8.8", ... },        
        { src: "10.0.0.5", dst: "142.250.185.46", ... }      
      ]                                                        
    
                                                                 
    
   TopologyView.tsx                                            
     Reads fake events from store                             
     Creates nodes from 12 hardcoded IPs                      
     Displays random connections:                             
      [192.168.1.10]  [8.8.8.8]                             
      [10.0.0.5]  [142.250.185.46]                          
      [192.168.1.15]  [1.1.1.1]                             
    


Result: Only 12 hardcoded IPs in random combinations
        (No real network traffic involved)
```

---

##  Mock Mode ON + TopologyDemo Component

```

                   FRONTEND (React)                               
                                                                  
    
   TopologyDemo.tsx (mounted in App.tsx)                      
     Runs ONCE on mount                                       
     clearEvents() - removes existing events                 
     Defines EXPANDED IP pools:                               
                                                               
      Internal (17 IPs):                                       
          
       Workstations: 192.168.1.10, .15, .22, .35, .47     
       Servers: 192.168.2.10, .15, .20, .25               
       DMZ: 10.0.0.50, .51, .52                            
       Admin: 172.16.5.100, .101                           
       IoT: 192.168.3.10, .20                              
          
                                                               
      External (16 IPs):                                       
          
       DNS: 8.8.8.8, 8.8.4.4, 1.1.1.1, 1.0.0.1            
       Services: GitHub, Reddit, Google, Twitter           
       CDN: AWS CloudFront, Akamai                         
       Suspicious: 45.76.139.42, 198.51.100.23            
          
                                                               
     Generates ~75 events with:                               
      - 60 baseline (normal traffic)                           
      - 8 suspicious (C2, lateral movement, etc.)             
      - 10 warning level                                       
                                                               
     Calls addEvent() for each                                
    
                                                                 
    
   Global Store - now contains 75 diverse events               
    
                                                                 
    
   TopologyView.tsx                                            
     Creates 33 nodes (17 internal + 16 external)            
     Shows rich topology:                                     
      [192.168.1.10]  [192.168.2.20] (lateral movement)     
      [192.168.1.15]  [45.76.139.42] (C2 beacon)            
      [192.168.3.10]  [8.8.8.8] (DNS tunnel)                
      [172.16.5.100]  [52.84.23.112] (exfiltration)         
     Multiple attack scenarios visible                        
    


Result: 33 diverse IPs with realistic attack scenarios
        (Enhanced mock data for better visualization)
```

---

##  Component Relationships

```
TopologyView.tsx
     
      (reads from)
     
     
Global Store (Zustand)
     
      (writes to via addEvent())
     
     
                                                
                                                
(Mock OFF)   (Mock ON)    (Mock ON)         (Mock ON)
                                                
                                                
useWebSocket   App.tsx      App.tsx      TopologyDemo.tsx
   .ts         useEffect   useEffect      (one-time)
                                                
                                                
receives       calls         calls           generates
WebSocket    generateMock  generateMock    75 events
events         Event()      Event()         with 33 IPs
                                                
                                                
(real IPs)    (12 IPs)      (12 IPs)        (33 IPs)
```

---

##  Summary

### Data Source by Mode:

| Mode | IP Source | Number of Unique IPs | Data Generation |
|------|-----------|----------------------|-----------------|
| **Mock OFF** | Real network packets | Unlimited (your network) | Backend (TShark) |
| **Mock ON** | mockData.ts hardcoded | 12 fixed IPs | Frontend (every 3-8s) |
| **Mock ON + TopologyDemo** | TopologyDemo.tsx hardcoded | 33 fixed IPs | Frontend (once on mount) |

### What TopologyView Does (Always the Same):

1.  Reads events from global store
2.  Extracts unique IPs from src/dst fields
3.  Creates one node per unique IP
4.  Labels each node with full IP address
5.  Colors based on internal/external/anomaly

**The topology visualization doesn't care where the data came fromit just displays what's in the store!**
