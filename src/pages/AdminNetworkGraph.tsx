import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Search, 
  Share2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Users,
  Briefcase,
  Info
} from "lucide-react";
import GraphClass from "graphology";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import forceAtlas2 from "graphology-layout-forceatlas2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GraphType = any;

interface NetworkNode {
  id: string;
  identity_group_id: string;
  display_name: string;
  roles: string[];
  project_count: number;
  is_producer: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heat_context: any;
}

interface NetworkEdge {
  id: string;
  source_group_id: string;
  target_group_id: string;
  weight: number;
  shared_project_titles: string[];
}

interface NodeDetail {
  id: string;
  name: string;
  roles: string[];
  projectCount: number;
  isProducer: boolean;
  heatContext: Record<string, any>;
  connections: { name: string; weight: number }[];
}

// Graph events component
function GraphEvents({ onNodeClick }: { onNodeClick: (nodeId: string) => void }) {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        onNodeClick(event.node);
      },
      enterNode: () => {
        document.body.style.cursor = "pointer";
      },
      leaveNode: () => {
        document.body.style.cursor = "default";
      },
    });
  }, [registerEvents, onNodeClick]);

  return null;
}

// Zoom controls component
function ZoomControls() {
  const sigma = useSigma();

  const handleZoomIn = () => {
    const camera = sigma.getCamera();
    camera.animatedZoom({ duration: 200 });
  };

  const handleZoomOut = () => {
    const camera = sigma.getCamera();
    camera.animatedUnzoom({ duration: 200 });
  };

  const handleReset = () => {
    const camera = sigma.getCamera();
    camera.animatedReset({ duration: 200 });
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
      <Button variant="secondary" size="icon" onClick={handleZoomIn} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="icon" onClick={handleZoomOut} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="icon" onClick={handleReset} title="Reset view">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function AdminNetworkGraph() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "producers" | "crew">("all");
  const [minWeight, setMinWeight] = useState([1]);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadNetworkData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadNetworkData = async () => {
    try {
      // Load network nodes - ONLY PRODUCERS
      const { data: nodesData, error: nodesError } = await supabase
        .from('network_nodes')
        .select('*')
        .eq('is_producer', true);

      if (nodesError) throw nodesError;

      // Load relationship edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('relationship_edges')
        .select('*');

      if (edgesError) throw edgesError;

      setNodes(nodesData || []);
      setEdges(edgesData || []);
    } catch (error: any) {
      console.error('[NetworkGraph] Load error:', error);
      // Don't show error toast if tables are just empty
    }
  };

  // Build the graphology graph instance
  const graph = useMemo(() => {
    const g: GraphType = new GraphClass();

    // Filter nodes based on type
    const filteredNodes = nodes.filter(node => {
      if (filterType === "producers") return node.is_producer;
      if (filterType === "crew") return !node.is_producer;
      return true;
    });

    // Filter by search
    const searchFiltered = searchQuery
      ? filteredNodes.filter(n => 
          n.display_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : filteredNodes;

    // Create node ID set for edge filtering
    const nodeIds = new Set(searchFiltered.map(n => n.identity_group_id));

    // Add nodes
    searchFiltered.forEach(node => {
      // Calculate size based on project count
      const size = Math.min(60, Math.max(12, node.project_count * 1.5));
      
      // Color based on producer vs crew
      const color = node.is_producer ? "#E6E6FA" : "#14B8A6";
      
      g.addNode(node.identity_group_id, {
        label: node.display_name,
        size,
        color,
        x: Math.random() * 100,
        y: Math.random() * 100,
        // Store extra data
        isProducer: node.is_producer,
        projectCount: node.project_count,
        roles: node.roles,
        heatContext: node.heat_context,
      });
    });

    // Add edges that meet weight threshold and connect filtered nodes
    edges
      .filter(e => e.weight >= minWeight[0])
      .filter(e => nodeIds.has(e.source_group_id) && nodeIds.has(e.target_group_id))
      .forEach(edge => {
        // Avoid self-loops and duplicate edges
        if (edge.source_group_id === edge.target_group_id) return;
        if (g.hasEdge(edge.source_group_id, edge.target_group_id)) return;

        const thickness = Math.min(16, Math.max(1, edge.weight * 2));
        
        g.addEdge(edge.source_group_id, edge.target_group_id, {
          size: thickness,
          color: "#94A3B8",
          weight: edge.weight,
          sharedProjects: edge.shared_project_titles,
        });
      });

    // Apply ForceAtlas2 layout if we have nodes
    if (g.order > 0) {
      forceAtlas2.assign(g, {
        iterations: 100,
        settings: {
          gravity: 1,
          scalingRatio: 10,
          barnesHutOptimize: g.order > 100,
        },
      });
    }

    return g;
  }, [nodes, edges, filterType, searchQuery, minWeight]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.identity_group_id === nodeId);
    if (!node) return;

    // Get connections for this node
    const connections = edges
      .filter(e => e.source_group_id === nodeId || e.target_group_id === nodeId)
      .map(e => {
        const connectedId = e.source_group_id === nodeId ? e.target_group_id : e.source_group_id;
        const connectedNode = nodes.find(n => n.identity_group_id === connectedId);
        return {
          name: connectedNode?.display_name || "Unknown",
          weight: e.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    setSelectedNode({
      id: nodeId,
      name: node.display_name,
      roles: node.roles || [],
      projectCount: node.project_count,
      isProducer: node.is_producer,
      heatContext: node.heat_context || {},
      connections,
    });
    setDrawerOpen(true);
  }, [nodes, edges]);

  const handleBuildNetwork = async () => {
    setBuilding(true);
    try {
      // Call edge function to build network data
      const { error } = await supabase.functions.invoke('build-intelligence-data', {
        body: { action: 'build_network' }
      });

      if (error) throw error;

      toast({
        title: "Network build started",
        description: "Building network from parsed contacts. This may take a moment.",
      });

      // Reload after a delay
      setTimeout(() => {
        loadNetworkData();
        setBuilding(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Build failed",
        description: error.message,
        variant: "destructive",
      });
      setBuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const hasData = nodes.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Network Graph</h1>
          </div>
          <p className="text-muted-foreground">
            Conspiracy web — visualize who works with who and how often
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{nodes.length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Producers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#E6E6FA]" />
                <span className="text-2xl font-bold">{nodes.filter(n => n.is_producer).length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crew Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-500" />
                <span className="text-2xl font-bold">{nodes.filter(n => !n.is_producer).length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{edges.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground mb-2 block">Show</Label>
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="producers">Producers Only</SelectItem>
                    <SelectItem value="crew">Crew Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-[200px]">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Min. Connection Weight: {minWeight[0]}
                </Label>
                <Slider
                  value={minWeight}
                  onValueChange={setMinWeight}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              
              <Button variant="outline" onClick={loadNetworkData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button onClick={handleBuildNetwork} disabled={building}>
                {building ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Building...
                  </>
                ) : (
                  "Build Network"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Graph Container */}
        <Card>
          <CardHeader>
            <CardTitle>Relationship Graph</CardTitle>
            <CardDescription>
              Node size = project count • Lavender = producer • Teal = crew • Click nodes for details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <div className="h-[600px] flex flex-col items-center justify-center text-center">
                <Share2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Network Data Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  The network graph is built from parsed call sheet contacts. 
                  Click "Build Network" to generate the relationship graph from existing data.
                </p>
                <Button onClick={handleBuildNetwork} disabled={building}>
                  {building ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Building...
                    </>
                  ) : (
                    "Build Network"
                  )}
                </Button>
              </div>
            ) : (
              <div className="h-[600px] relative border rounded-lg overflow-hidden bg-background">
                <SigmaContainer
                  graph={graph}
                  settings={{
                    renderLabels: true,
                    labelRenderedSizeThreshold: 8,
                    labelSize: 12,
                    labelWeight: "bold",
                    defaultNodeColor: "#94A3B8",
                    defaultEdgeColor: "#E2E8F0",
                  }}
                  className="w-full h-full"
                >
                  <GraphEvents onNodeClick={handleNodeClick} />
                  <ZoomControls />
                </SigmaContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Node Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedNode?.isProducer ? (
                <Badge className="bg-[#E6E6FA] text-[#4B0082]">Producer</Badge>
              ) : (
                <Badge className="bg-teal-500">Crew</Badge>
              )}
              {selectedNode?.name}
            </SheetTitle>
            <SheetDescription>
              Node details and connections
            </SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Roles</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.roles.length > 0 ? (
                    selectedNode.roles.map((role, i) => (
                      <Badge key={i} variant="outline">{role}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No roles recorded</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Projects</h4>
                <p className="text-2xl font-bold">{selectedNode.projectCount}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Top Connections ({selectedNode.connections.length})
                </h4>
                {selectedNode.connections.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNode.connections.map((conn, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{conn.name}</span>
                        <Badge variant="secondary">{conn.weight} projects</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No connections</span>
                )}
              </div>

              {Object.keys(selectedNode.heatContext).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Heat Context</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedNode.heatContext, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
