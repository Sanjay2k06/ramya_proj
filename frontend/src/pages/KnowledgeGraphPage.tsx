import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { analysisService } from '../services/api';
import {
  Network,
  Search,
  RefreshCw,
  Info,
  Shield,
  Layers,
  AlertTriangle,
  ZoomIn,
  Target,
  Activity,
  CheckCircle2,
  ExternalLink,
  Filter,
} from 'lucide-react';

// Custom Node Component with forensic research styling
const ForensicNode: React.FC<{ data: any; selected?: boolean }> = ({ data, selected }) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'cve':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'actor':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'malware':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ip':
      case 'domain':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'asset':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'evidence_record':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[140px] max-w-[220px] transition-all cursor-pointer ${
        selected ? 'ring-2 ring-blue-600 border-blue-600 shadow-md scale-105' : 'border-slate-300 hover:border-blue-400 hover:shadow-md'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
      <div className="flex items-center justify-between space-x-1 mb-1">
        <span
          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border leading-none font-bold ${getBadgeColor(
            data.entity_type
          )}`}
        >
          {data.entity_type}
        </span>
        {data.confidence && (
          <span className="text-[9px] font-mono font-semibold text-slate-400">
            {(data.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-xs font-bold text-slate-900 truncate font-sans">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
    </div>
  );
};

const GraphInner: React.FC<{ id: string }> = ({ id }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [graphMetrics, setGraphMetrics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const { fitView } = useReactFlow();
  const nodeTypes = useMemo(() => ({ forensicNode: ForensicNode as any }), []);

  const fetchGraph = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await analysisService.getGraph(id);
      const incomingNodes = res.data.nodes || [];
      const incomingEdges = res.data.edges || [];
      setRawNodes(incomingNodes);
      setNodes(incomingNodes);
      setEdges(incomingEdges);
      setGraphMetrics(res.data.graph_metrics || null);
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [id]);

  // Handle entity filter changes
  useEffect(() => {
    if (filterType === 'all') {
      setNodes(rawNodes.map((n) => ({ ...n, hidden: false })));
    } else {
      setNodes(
        rawNodes.map((n) => ({
          ...n,
          hidden: n.data.entity_type !== filterType,
        }))
      );
    }
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [filterType, rawNodes]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge.data);
    setSelectedNode(null);
  }, []);

  const handleSelectEntityFromList = (nodeId: string) => {
    const match = nodes.find((n) => n.id === nodeId);
    if (match) {
      setSelectedNode(match.data);
      setSelectedEdge(null);
      // Highlight selection
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        }))
      );
    }
  };

  const highlightSearch = () => {
    if (!searchQuery.trim()) return;
    const match = nodes.find((n) =>
      n.data.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (match) {
      handleSelectEntityFromList(match.id);
    }
  };

  const conflictEdges = useMemo(() => {
    return edges.filter((e) => e.data?.is_conflict);
  }, [edges]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Temporal Forensic Knowledge Graph
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            NETWORKX MULTI-DIRECTED GRAPH • {graphMetrics?.node_count || nodes.length} NODES • {graphMetrics?.edge_count || edges.length} EDGES
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && highlightSearch()}
              placeholder="Find node in graph..."
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 font-mono shadow-subtle w-48"
            />
          </div>

          <button
            onClick={() => fitView({ padding: 0.15, duration: 400 })}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-subtle"
            title="Fit to Screen"
          >
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset View</span>
          </button>

          <button
            onClick={fetchGraph}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
            title="Recalculate Graph Layout"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Graph Canvas & Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[740px]">
        {/* Canvas Area */}
        <div className="lg:col-span-3 forensic-card overflow-hidden relative h-full flex flex-col">
          {/* Top Quick-Filter Pills */}
          <div className="p-2.5 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto z-10">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 font-mono text-[11px] font-bold uppercase mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {[
                { id: 'all', label: `All (${rawNodes.length})` },
                { id: 'cve', label: 'CVEs' },
                { id: 'actor', label: 'Actors' },
                { id: 'malware', label: 'Malware' },
                { id: 'ip', label: 'IPs / IOCs' },
                { id: 'asset', label: 'Assets' },
                { id: 'evidence_record', label: 'Reports' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                    filterType === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {conflictEdges.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold font-mono flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3 h-3" />
                {conflictEdges.length} Active Contradictions
              </span>
            )}
          </div>

          {/* Graph Viewport */}
          <div className="flex-1 relative w-full h-full min-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
                <span className="text-xs font-mono text-slate-500">
                  COMPUTING FORENSIC GRAPH TOPOLOGY...
                </span>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.2}
                maxZoom={2.5}
                defaultViewport={{ x: 60, y: 40, zoom: 0.9 }}
                className="bg-slate-50/50"
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#CBD5E1" />
                <Controls className="bg-white border border-slate-200 shadow-subtle rounded-md" />
              </ReactFlow>
            )}

            {/* Floating Graph Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-3 shadow-md text-[11px] font-mono space-y-1.5 z-10 pointer-events-none">
              <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">Graph Legend</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <span className="text-slate-600 font-semibold">CVEs</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="text-slate-600 font-semibold">Threat Actors</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-slate-600 font-semibold">Malware</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-slate-600 font-semibold">Indicators</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-600 font-semibold">Target Assets</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-600 font-semibold">Evidence Reports</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                <span className="w-4 h-0.5 border-t border-dashed border-red-600" />
                <span className="text-red-600 font-bold">CONTRADICTS (Active Conflict)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dense Inspector & Content Panel (NO EMPTY SPACE) */}
        <div className="forensic-card p-5 h-full overflow-y-auto space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Info className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
              Forensic Entity Inspector
            </h2>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-blue-700 uppercase font-bold block">
                  Focused Entity Node
                </span>
                <div className="text-sm font-bold text-slate-900 font-sans">{selectedNode.label}</div>
                <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-600 text-white mt-1">
                  {selectedNode.entity_type}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">CONFIDENCE:</span>
                  <span className="font-semibold text-slate-900">
                    {(selectedNode.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {selectedNode.source_timestamp && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">TIMESTAMP:</span>
                    <span className="font-semibold text-slate-900">{selectedNode.source_timestamp}</span>
                  </div>
                )}
                {selectedNode.source_type && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PUBLISHER:</span>
                    <span className="font-semibold text-slate-900">{selectedNode.source_type}</span>
                  </div>
                )}
              </div>

              {selectedNode.context && (
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1 font-bold">
                    Extraction Context
                  </span>
                  <p className="p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-xs leading-relaxed">
                    {selectedNode.context}
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedNode(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-xs font-bold transition-colors"
              >
                Clear Node Focus
              </button>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">
                  Focused Relationship Edge
                </span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {selectedEdge.relationship_type}
                </div>
              </div>

              {selectedEdge.is_conflict && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Contradictory Link</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{selectedEdge.reason}</p>
                </div>
              )}

              {selectedEdge.description && (
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1 font-bold">
                    Evidentiary Assertion
                  </span>
                  <p className="p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-xs leading-relaxed">
                    {selectedEdge.description}
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedEdge(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-xs font-bold transition-colors"
              >
                Clear Edge Focus
              </button>
            </div>
          ) : (
            /* DEFAULT RICH CONTENT TO ELIMINATE EMPTY SPACE */
            <div className="space-y-4">
              {/* Top Central Nodes */}
              {graphMetrics?.top_entities && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                      Highest Centrality Nodes
                    </span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">DEGREE RANK</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {graphMetrics.top_entities.map((te: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => handleSelectEntityFromList(te.id)}
                        className="flex justify-between items-center py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all group"
                      >
                        <span className="truncate max-w-[150px] text-slate-800 font-semibold group-hover:text-blue-700">
                          {te.label}
                        </span>
                        <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-100 text-[11px]">
                          {te.centrality}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contradiction Paths List */}
              {conflictEdges.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-red-700 uppercase tracking-wider font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Conflicting Links ({conflictEdges.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {conflictEdges.map((ce: any) => (
                      <div
                        key={ce.id}
                        onClick={() => {
                          setSelectedEdge(ce.data);
                          setSelectedNode(null);
                        }}
                        className="p-2 rounded-lg bg-red-50/60 border border-red-200 hover:border-red-300 cursor-pointer text-xs space-y-1 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-bold text-red-800">CONTRADICTS</span>
                          <span className="text-[9px] text-red-600">Click to Inspect</span>
                        </div>
                        <p className="text-[11px] text-slate-700 line-clamp-2">
                          {ce.data?.reason || ce.data?.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Graph Topology Summary */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                  NetworkX Topology Metrics
                </span>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-mono">TOTAL NODES</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {graphMetrics?.node_count || nodes.length}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-mono">TOTAL EDGES</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {graphMetrics?.edge_count || edges.length}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-mono">DENSITY</span>
                    <span className="text-sm font-extrabold text-blue-600 font-mono">
                      {graphMetrics?.density || '0.045'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-mono">CONTRADICTIONS</span>
                    <span className="text-sm font-extrabold text-red-600 font-mono">
                      {conflictEdges.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const KnowledgeGraphPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <ReactFlowProvider>
      <GraphInner id={id || 'inv-sample-synth-01'} />
    </ReactFlowProvider>
  );
};
