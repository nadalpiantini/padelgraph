// Social Graph Types

export interface GraphNode {
  id: string;
  name: string;
  level?: string;
  avatar_url?: string;
  rating?: number;
  is_target?: boolean;
  is_source?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  connection_type: string;
  strength: number;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  degree_of_separation: number;
}

export interface ConnectionResponse {
  path: GraphPath | null;
  stats: {
    total_nodes: number;
    total_edges: number;
    degree_of_separation: number | null;
    computation_time_ms: number;
  };
}

export interface GraphStats {
  total_connections: number;
  first_degree_connections: number;
  second_degree_connections: number;
  avg_degree_of_separation: number;
  famous_connections: {
    user_id: string;
    user_name: string;
    degree: number;
  }[];
}
