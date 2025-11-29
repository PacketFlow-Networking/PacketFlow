import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../context/store';
import { GRAPH_CONFIG } from '../config/graph.config';
import type { NetworkEvent } from '../types';

interface Node3D {
  id: string;
  ip: string;
  position: [number, number, number];
  anomalyScore: number;
  eventCount: number;
  type: 'internal' | 'external';
}

function NetworkNode({ node }: { node: Node3D }) {
  const isAnomalous = node.anomalyScore > GRAPH_CONFIG.ANOMALY_THRESHOLD;
  const color = isAnomalous
    ? node.anomalyScore > GRAPH_CONFIG.CRITICAL_THRESHOLD
      ? new THREE.Color('#ef4444')
      : new THREE.Color('#f59e0b')
    : node.type === 'internal'
    ? new THREE.Color('#3b82f6')
    : new THREE.Color('#10b981');

  const size = Math.max(2, Math.min(8, 2 + (node.eventCount / 50) * 2));

  return (
    <group position={node.position}>
      <mesh>
        <sphereGeometry args={[size, 8, 8]} />
        <meshPhongMaterial
          color={color}
          emissive={isAnomalous ? color : new THREE.Color(0x000000)}
          emissiveIntensity={isAnomalous ? 0.5 : 0}
        />
      </mesh>
      {isAnomalous && (
        <mesh position={[0, size + 1, 0]}>
          <sphereGeometry args={[0.8, 6, 6]} />
          <meshPhongMaterial color={new THREE.Color('#ef4444')} emissive={new THREE.Color('#ef4444')} emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function NetworkScene() {
  const { events } = useStore();
  const [nodes, setNodes] = useState<Node3D[]>([]);
  const lineGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const nodeMap = new Map<string, Node3D>();

    const isInternal = (ip: string): boolean => {
      return (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./i) !== null
      );
    };

    events.slice(0, 100).forEach((event, idx) => {
      if (!nodeMap.has(event.src)) {
        nodeMap.set(event.src, {
          id: event.src,
          ip: event.src,
          position: [(idx % 10) * 50 - 225, Math.random() * 200 - 100, (Math.floor(idx / 10)) * 50 - 150] as [number, number, number],
          anomalyScore: event.anomaly_score || 0,
          eventCount: 1,
          type: isInternal(event.src) ? 'internal' : 'external'
        });
      }

      if (!nodeMap.has(event.dst)) {
        nodeMap.set(event.dst, {
          id: event.dst,
          ip: event.dst,
          position: [(idx % 10) * 50 - 225, Math.random() * 200 - 100, (Math.floor(idx / 10)) * 50 - 150] as [number, number, number],
          anomalyScore: event.anomaly_score || 0,
          eventCount: 1,
          type: isInternal(event.dst) ? 'internal' : 'external'
        });
      }

      const srcNode = nodeMap.get(event.src)!;
      const dstNode = nodeMap.get(event.dst)!;
      srcNode.anomalyScore = Math.max(srcNode.anomalyScore, event.anomaly_score || 0);
      dstNode.anomalyScore = Math.max(dstNode.anomalyScore, event.anomaly_score || 0);
      srcNode.eventCount++;
      dstNode.eventCount++;
    });

    setNodes(Array.from(nodeMap.values()));
  }, [events]);

  // Draw lines for connections
  useEffect(() => {
    if (lineGroupRef.current) {
      lineGroupRef.current.clear();

      const connectionMap = new Map<string, number>();
      events.slice(0, 50).forEach(event => {
        const key = `${event.src}-${event.dst}`;
        connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
      });

      connectionMap.forEach((count, key) => {
        const [src, dst] = key.split('-');
        const srcNode = nodes.find(n => n.id === src);
        const dstNode = nodes.find(n => n.id === dst);

        if (srcNode && dstNode) {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
              new Float32Array([
                srcNode.position[0],
                srcNode.position[1],
                srcNode.position[2],
                dstNode.position[0],
                dstNode.position[1],
                dstNode.position[2]
              ]),
              3
            )
          );

          const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(count > 5 ? '#ef4444' : '#64748b'),
            transparent: true,
            opacity: count > 5 ? 0.6 : 0.2,
            linewidth: 1
          });

          const line = new THREE.Line(geometry, material);
          lineGroupRef.current?.add(line);
        }
      });
    }
  }, [nodes, events]);

  return (
    <group>
      <group ref={lineGroupRef} />
      {nodes.map(node => (
        <NetworkNode key={node.id} node={node} />
      ))}
    </group>
  );
}

export default function ThreeDTopologyView() {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas camera={{ position: [0, 0, 500], near: 0.1, far: 10000 }}>
        <PerspectiveCamera makeDefault position={[0, 0, 500]} />
        <OrbitControls />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <NetworkScene />
        <gridHelper args={[500, 20]} />
      </Canvas>

      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-text-dim max-w-xs">
        <p className="font-semibold text-text mb-2">3D Network Topology</p>
        <p>🖱️ Drag to orbit • 🔄 Scroll to zoom</p>
      </div>
    </div>
  );
}
