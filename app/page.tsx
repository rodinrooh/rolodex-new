"use client";

import React, { useEffect, useState, useCallback, Fragment } from "react";
import ReactFlow, {
  Background,
  Controls,
  ConnectionLineType,
  applyNodeChanges,
  applyEdgeChanges,
  type DefaultEdgeOptions,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  type NodeTypes,
  Handle,
  Position,
} from "reactflow";
import { useUser, UserButton } from "@clerk/nextjs";
import AddPersonModal from "@/components/AddPersonModal";
import ProfilePanel from "@/components/ProfilePanel";
import { getPeople, Person, getEventsForPeople, calculateLineColor, Event } from "@/lib/db";

// Node data type
type PersonNodeData = {
  label: string;
  person?: Person | null;
  isUser?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
};

function getTwoLetterInitials(name: string | null | undefined): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "?";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = Array.from(parts[0] ?? "")[0] ?? "";
    const second = Array.from(parts[1] ?? "")[0] ?? "";
    const initials = `${first}${second}`.trim();
    return (initials || "?").toUpperCase();
  }

  const chars = Array.from(parts[0] ?? "");
  const initials = `${chars[0] ?? ""}${chars[1] ?? ""}`.trim();
  return (initials || "?").toUpperCase();
}

// Custom circular node component with invisible handles
function PersonCircleNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { label, isUser } = data;

  // Create 64 handles evenly spaced around the circle (every ~5.6 degrees)
  // This provides smooth connections without performance issues
  const NUM_HANDLES = 64;
  const NODE_RADIUS = 25; // 50px diameter / 2

  return (
    <div className="relative flex items-center justify-center">
      {/* Multiple invisible handles around the circle for natural edge routing */}
      {Array.from({ length: NUM_HANDLES }).map((_, index) => {
        // Calculate angle for this handle (0° = top, clockwise)
        const angle = (index / NUM_HANDLES) * 2 * Math.PI - Math.PI / 2; // Start at top
        const x = 50 + Math.cos(angle) * NODE_RADIUS; // 50% center + radius offset
        const y = 50 + Math.sin(angle) * NODE_RADIUS;
        
        // Determine closest React Flow position for fallback (simplified for 360 handles)
        let position: Position = Position.Top;
        const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
        if (normalizedAngle >= 0 && normalizedAngle < Math.PI / 2) position = Position.Right;
        else if (normalizedAngle >= Math.PI / 2 && normalizedAngle < Math.PI) position = Position.Bottom;
        else if (normalizedAngle >= Math.PI && normalizedAngle < 3 * Math.PI / 2) position = Position.Left;
        else position = Position.Top;

        return (
          <Fragment key={`handle-${index}`}>
            <Handle
              type="source"
              position={position}
              className="rf-invisible-handle"
              id={`source-${index}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            <Handle
              type="target"
              position={position}
              className="rf-invisible-handle"
              id={`target-${index}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </Fragment>
        );
      })}

      <div
        className={[
          "flex h-[50px] w-[50px] select-none items-center justify-center rounded-full text-[15px] font-semibold leading-none tracking-tight",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg"
            : data.gradientFrom && data.gradientTo
            ? `bg-gradient-to-br text-white shadow-md`
            : "border border-slate-300 bg-white text-slate-800",
          selected ? "ring-2 ring-indigo-400" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          !isUser && data.gradientFrom && data.gradientTo
            ? {
                background: `linear-gradient(to bottom right, ${data.gradientFrom}, ${data.gradientTo})`,
              }
            : undefined
        }
      >
        {label}
      </div>
    </div>
  );
}

// Register node types
const nodeTypes: NodeTypes = {
  person: PersonCircleNode,
};


// Fallback node so we always see at least one dot even if data fails to load
const fallbackNodes: Node<PersonNodeData>[] = [
  {
    id: "fallback-user-center",
    type: "person",
    position: { x: 0, y: 0 },
    data: { label: "US", isUser: true },
    draggable: false,
  },
];

export default function Home() {
  const { user, isLoaded } = useUser();
  const [nodes, setNodes] = useState<Node<PersonNodeData>[]>(fallbackNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null);
  const [hoveredNodePosition, setHoveredNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

  // Collision detection and bounce-back
  const NODE_RADIUS = 25; // 50px / 2
  const MIN_DISTANCE = NODE_RADIUS * 1.25; // Detection threshold (31.25px)
  const BOUNCE_FORCE = 5; // How far to push nodes apart (reduced for less sensitivity)

  // Calculate which handle index (0-63) is best for an edge based on direction
  const getHandleIndex = useCallback((dx: number, dy: number): number => {
    // Calculate angle from source to target (0° = right, clockwise)
    const angle = Math.atan2(dy, dx);
    // Convert to 0-2π range starting from top (matching our handle layout)
    const normalizedAngle = angle + Math.PI / 2;
    // Wrap to 0-2π
    const wrappedAngle = ((normalizedAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    // Convert to handle index (0-63)
    const NUM_HANDLES = 64;
    const handleIndex = Math.round((wrappedAngle / (2 * Math.PI)) * NUM_HANDLES) % NUM_HANDLES;
    return handleIndex;
  }, []);

  // Get handle ID for a handle index
  const getHandleId = useCallback((handleIndex: number, type: "source" | "target"): string => {
    return `${type}-${handleIndex}`;
  }, []);

  const detectAndResolveCollisions = (
    nodes: Node<PersonNodeData>[],
    changedNodeId?: string,
  ): Node<PersonNodeData>[] => {
    if (changedNodeId) {
      console.log(
        "[Collision] Resolving collisions for dragged node:",
        changedNodeId,
      );
    }

    const updatedNodes = nodes.map((n) => ({ ...n }));
    let hasCollisions = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Iterate until no collisions or max iterations
    while (hasCollisions && iterations < maxIterations) {
      hasCollisions = false;
      iterations++;

      for (let i = 0; i < updatedNodes.length; i++) {
        const nodeA = updatedNodes[i];

        for (let j = i + 1; j < updatedNodes.length; j++) {
          const nodeB = updatedNodes[j];

          // Calculate distance between node centers
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if nodes are colliding (distance < minimum required distance)
          if (distance < MIN_DISTANCE && distance > 0.1) {
            hasCollisions = true;

            // Calculate unit vector from A to B
            const unitX = dx / distance;
            const unitY = dy / distance;

            // Calculate overlap amount
            const overlap = MIN_DISTANCE - distance;
            const pushDistance = overlap + BOUNCE_FORCE;

            // Push nodes apart
            // If a node was being dragged, it moves less (30%), other node moves more (70%)
            // If user center is involved, it never moves (draggable: false), other node gets full push
            // Otherwise, both move equally (50% each)
            const isAChanged = changedNodeId === nodeA.id;
            const isBChanged = changedNodeId === nodeB.id;
            const isAUserCenter = nodeA.id === "user-center" || nodeA.id === "fallback-user-center";
            const isBUserCenter = nodeB.id === "user-center" || nodeB.id === "fallback-user-center";
            
            // User center never moves, so if it's involved, the other node gets the full push
            let pushA: number;
            let pushB: number;
            
            if (isAUserCenter) {
              // Node A is user center - it doesn't move, node B gets full push
              pushA = 0;
              pushB = pushDistance;
            } else if (isBUserCenter) {
              // Node B is user center - it doesn't move, node A gets full push
              pushA = pushDistance;
              pushB = 0;
            } else {
              // Neither is user center - normal collision logic (reduced push for less sensitivity)
              pushA = isAChanged ? pushDistance * 0.15 : pushDistance * 0.25;
              pushB = isBChanged ? pushDistance * 0.15 : pushDistance * 0.25;
            }

            // Update positions - create new objects to ensure React Flow detects the change
            updatedNodes[i] = {
              ...updatedNodes[i],
              position: {
                x: updatedNodes[i].position.x - unitX * pushA,
                y: updatedNodes[i].position.y - unitY * pushA,
              },
            };

            updatedNodes[j] = {
              ...updatedNodes[j],
              position: {
                x: updatedNodes[j].position.x + unitX * pushB,
                y: updatedNodes[j].position.y + unitY * pushB,
              },
            };

            // Debug log
            if (iterations === 1) {
              console.log(`Collision detected: ${nodeA.id} and ${nodeB.id}, distance: ${distance.toFixed(1)}px`);
            }
          }
        }
      }
    }

    return updatedNodes;
  };

  // Save node positions to localStorage
  const saveNodePositions = useCallback((nodes: Node<PersonNodeData>[]) => {
    if (!user?.id) {
      console.log("[saveNodePositions] No user ID, skipping save");
      return;
    }
    
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      // Don't save user center position (it's always at 0,0)
      if (node.id !== "user-center" && node.id !== "fallback-user-center") {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      }
    });
    
    try {
      const key = `node-positions-${user.id}`;
      localStorage.setItem(key, JSON.stringify(positions));
      console.log(`[saveNodePositions] Saved ${Object.keys(positions).length} positions:`, positions);
    } catch (error) {
      console.error("Failed to save node positions:", error);
    }
  }, [user?.id]);

  // Load node positions from localStorage
  const loadNodePositions = useCallback((): Record<string, { x: number; y: number }> => {
    if (!user?.id) {
      console.log("[loadNodePositions] No user ID, returning empty");
      return {};
    }
    
    try {
      const key = `node-positions-${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const positions = JSON.parse(saved);
        console.log(`[loadNodePositions] Loaded ${Object.keys(positions).length} saved positions:`, positions);
        return positions;
      } else {
        console.log("[loadNodePositions] No saved positions found");
      }
    } catch (error) {
      console.error("Failed to load node positions:", error);
    }
    
    return {};
  }, [user?.id]);

  // Change handlers for React Flow dragging with collision detection
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => {
        // Find which node is currently being dragged (if any)
        const positionChange = changes.find(
          (change) => change.type === "position",
        );

        // React Flow sets `dragging: true` while a node is actively dragged
        const changedNodeId =
          positionChange && positionChange.dragging
            ? positionChange.id
            : undefined;

        // 1) Apply the changes from React Flow
        const updatedNodes = applyNodeChanges(changes, currentNodes);

        // 2) Run collision detection / resolution
        const nodesAfterCollision = detectAndResolveCollisions(
          updatedNodes,
          changedNodeId,
        );

        // 3) Save positions when dragging ends (not while dragging to avoid too many writes)
        if (positionChange && !positionChange.dragging) {
          // Use setTimeout to ensure state has updated
          setTimeout(() => {
            saveNodePositions(nodesAfterCollision);
          }, 0);
        }

        // 4) Update edge handles for any moved nodes
        if (positionChange) {
          setEdges((currentEdges) => {
            const nodeById = new Map(nodesAfterCollision.map((n) => [n.id, n]));
            const updatedEdges = currentEdges.map((edge) => {
              const sourceNode = nodeById.get(edge.source);
              const targetNode = nodeById.get(edge.target);
              
              // Only update edges connected to the moved node
              if (
                !sourceNode ||
                !targetNode ||
                (sourceNode.id !== positionChange.id &&
                  targetNode.id !== positionChange.id)
              ) {
                return edge;
              }

              // Recalculate optimal handle positions based on current node positions
              const dx = targetNode.position.x - sourceNode.position.x;
              const dy = targetNode.position.y - sourceNode.position.y;

              const sourceHandleIndex = getHandleIndex(dx, dy);
              const targetHandleIndex = getHandleIndex(-dx, -dy);

              return {
                ...edge,
                sourceHandle: getHandleId(sourceHandleIndex, "source"),
                targetHandle: getHandleId(targetHandleIndex, "target"),
              };
            });

            return updatedEdges;
          });
        }

        return nodesAfterCollision;
      });
    },
    [getHandleIndex, getHandleId, saveNodePositions],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [],
  );

  // Initialize user dot when user logs in
  useEffect(() => {
    if (!isLoaded || !user) return;

    // If nodes are empty, create at least the center user node.
    if (nodes.length === 0) {
      const userNameForInitials =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.emailAddresses?.[0]?.emailAddress ||
        "User";
      const userInitial = getTwoLetterInitials(userNameForInitials);

      const centerNode: Node<PersonNodeData> = {
        id: "user-center",
        type: "person",
        position: { x: 0, y: 0 },
        data: { label: userInitial, isUser: true, person: null },
        draggable: false,
      };

      setNodes([centerNode]);
      setEdges([]);
    }
  }, [isLoaded, user, nodes.length]);

  // Load people from database when user is logged in
  useEffect(() => {
    if (isLoaded && user?.id) {
      loadPeople();
    } else if (isLoaded && !user) {
      // Reset state when user logs out
      setIsLoading(false);
      setPeople([]);
    }
  }, [isLoaded, user?.id]);

  const loadPeople = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const fetchedPeople = await getPeople(user.id);
      setPeople(fetchedPeople);
      
      // Load events for all people to calculate line colors
      const personIds = fetchedPeople.map((p) => p.id);
      const allEvents = await getEventsForPeople(personIds);
      
      updateNodesAndEdges(fetchedPeople, allEvents);
    } catch (error) {
      console.error("Error loading people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Deterministic "random" in [0,1) from a string.
  // Keeps layout stable between renders while still looking organic.
  const seedRandomFromString = (key: string): number => {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return (h % 10000) / 10000;
  };

  // Generate a gradient color pair based on an ID using similar colors (same family, different shades)
  const generateGradientFromId = (id: string): { from: string; to: string } => {
    const seed1 = seedRandomFromString(id + "-gradient1");
    const seed2 = seedRandomFromString(id + "-gradient2");
    const seed3 = seedRandomFromString(id + "-gradient3");

    // Generate base hue (0-360) - use person ID for better distribution
    const baseHue = Math.floor(seed1 * 360);
    
    // Use analogous colors (similar hues, ±20-40 degrees) or same hue with different saturation/lightness
    // This creates harmonious gradients like blue-to-blue, purple-to-purple, etc.
    const hueVariation = seed2 < 0.5 
      ? 0 // Same hue, different saturation/lightness (monochromatic)
      : 20 + Math.floor(seed2 * 40); // ±20-60° variation (analogous colors)
    
    const hueDirection = seed3 < 0.5 ? 1 : -1;
    const hue1 = baseHue;
    const hue2 = (baseHue + hueDirection * hueVariation + 360) % 360;

    // Use high saturation (70-95%) for vibrant colors
    const sat1 = 70 + Math.floor(seed2 * 25); // 70-95% saturation
    const sat2 = 70 + Math.floor(seed3 * 25);

    // Use different lightness for distinction: one lighter, one darker
    const light1 = 45 + Math.floor(seed1 * 20); // 45-65% lightness
    const light2 = 50 + Math.floor(seed2 * 20); // 50-70% lightness

    // Convert to HSL color strings
    const from = `hsl(${hue1}, ${sat1}%, ${light1}%)`;
    const to = `hsl(${hue2}, ${sat2}%, ${light2}%)`;

    return { from, to };
  };

  const updateNodesAndEdges = useCallback((peopleList: Person[], allEvents: Event[]) => {
    if (!user) return;

    setNodes((prevNodes) => {
      const prevById = new Map(prevNodes.map((n) => [n.id, n]));

      const nodes: Node<PersonNodeData>[] = [];
      const edges: Edge[] = [];

      const centerX = 0;
      const centerY = 0;

      // ---- Center user node ----
      const existingCenter = prevById.get("user-center");
      const userNameForInitials =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.emailAddresses?.[0]?.emailAddress ||
        "User";
      const userInitial = getTwoLetterInitials(userNameForInitials);

      const userNode: Node<PersonNodeData> =
        existingCenter != null
          ? {
              ...existingCenter,
              data: {
                ...(existingCenter.data as PersonNodeData),
                isUser: true,
                label: userInitial,
              },
            }
          : {
              id: "user-center",
              type: "person",
              position: { x: centerX, y: centerY },
              data: {
                label: userInitial,
                isUser: true,
                person: null,
              },
              draggable: false,
            };

      nodes.push(userNode);

      // ---- Split people ----
      const directConnections = peopleList.filter((p) => !p.introducer_id);
      const introducedConnections = peopleList.filter((p) => p.introducer_id);

      // Load saved positions once for all nodes
      const savedPositions = loadNodePositions();

      // ---- Direct connections: circle around user with random angles ----
      const baseRadius = 200;
      const radiusJitter = 40; // ±40px variation

      directConnections.forEach((person, index) => {
        const existing = prevById.get(person.id);
        const savedPosition = savedPositions[person.id];

        let position;
        if (existing) {
          // Keep where the user dragged it
          position = existing.position;
        } else if (savedPosition) {
          // Use saved position from localStorage
          position = savedPosition;
        } else {
          // Initial layout with fully random angles (not evenly spaced)
          // Each person gets a random angle between 0 and 2π
          const randomAngleSeed = seedRandomFromString(person.id + "-angle");
          const angle = randomAngleSeed * 2 * Math.PI; // Full 360° random distribution
          
          const radiusRand = seedRandomFromString(person.id + "-radius");
          const radius = baseRadius + (radiusRand - 0.5) * radiusJitter;
          
          position = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
          };
        }

        const personEvents = allEvents.filter(
          (e) => e.person_id === person.id,
        );
        const lineColor = calculateLineColor(personEvents);

        // Generate gradient for this person
        const gradient = generateGradientFromId(person.id);

        const node: Node<PersonNodeData> =
          existing != null
            ? {
                ...existing,
                position,
                data: {
                  ...(existing.data as PersonNodeData),
                  label: getTwoLetterInitials(person.name),
                  person,
                  gradientFrom: gradient.from,
                  gradientTo: gradient.to,
                },
              }
            : {
                id: person.id,
                type: "person",
                position,
                data: {
                  label: getTwoLetterInitials(person.name),
                  person,
                  gradientFrom: gradient.from,
                  gradientTo: gradient.to,
                },
              };

        nodes.push(node);

        // Calculate optimal handle positions based on edge direction
        const targetNode = node;
        const sourceNode = userNode;
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        
        const sourceHandleIndex = getHandleIndex(dx, dy);
        const targetHandleIndex = getHandleIndex(-dx, -dy);
        
        edges.push({
          id: `edge-user-${person.id}`,
          source: "user-center",
          target: person.id,
          sourceHandle: getHandleId(sourceHandleIndex, "source"),
          targetHandle: getHandleId(targetHandleIndex, "target"),
          type: "default",
          style: { stroke: lineColor, strokeWidth: 2 },
        });
      });

      // Helper to quickly look up node positions
      const nodeById = new Map(nodes.map((n) => [n.id, n]));

      // ---- Introduced connections: near introducer with slight randomness ----
      // Note: savedPositions is already loaded above
      // Group by introducer to handle multiple children
      const childrenByIntroducer = new Map<string, Person[]>();
      introducedConnections.forEach((person) => {
        if (!person.introducer_id || person.introducer_id === person.id) return;
        const current = childrenByIntroducer.get(person.introducer_id) ?? [];
        current.push(person);
        childrenByIntroducer.set(person.introducer_id, current);
      });

      childrenByIntroducer.forEach((children, introducerId) => {
        const introducerNode =
          nodes.find((n) => n.id === introducerId) ??
          prevById.get(introducerId);
        if (!introducerNode) return;

        // Angle of introducer relative to center
        const angleToIntroducer = Math.atan2(
          introducerNode.position.y - centerY,
          introducerNode.position.x - centerX,
        );

        const baseOffsetRadius = 120;
        const radiusJitter = 30; // ±30px variation
        const baseSpread = Math.PI / 4; // ~45° spread
        const spreadJitter = Math.PI / 12; // ±15° variation

        children.forEach((person, index) => {
          const existing = prevById.get(person.id);
          const savedPosition = savedPositions[person.id];

          let position;
          if (existing) {
            // Keep dragged position
            position = existing.position;
          } else if (savedPosition) {
            // Use saved position from localStorage
            position = savedPosition;
          } else {
            // Initial layout near introducer with randomness
            const count = children.length;
            const totalSpread = baseSpread * Math.max(count - 1, 0);
            const startAngle = angleToIntroducer - totalSpread / 2;
            
            // Add deterministic randomness based on person ID
            const angleRand = seedRandomFromString(person.id + "-angle");
            const radiusRand = seedRandomFromString(person.id + "-radius");
            
            // Base angle with spread, plus small random jitter
            const baseAngle = startAngle + (index * baseSpread);
            const angleJitter = (angleRand - 0.5) * spreadJitter;
            const angle = baseAngle + angleJitter;
            
            // Radius with slight variation
            const radius = baseOffsetRadius + (radiusRand - 0.5) * radiusJitter;

            position = {
              x: introducerNode.position.x + Math.cos(angle) * radius,
              y: introducerNode.position.y + Math.sin(angle) * radius,
            };
          }

          const personEvents = allEvents.filter(
            (e) => e.person_id === person.id,
          );
          const lineColor = calculateLineColor(personEvents);

          // Generate gradient for this person
          const gradient = generateGradientFromId(person.id);

          const node: Node<PersonNodeData> =
            existing != null
              ? {
                  ...existing,
                  position,
                  data: {
                    ...(existing.data as PersonNodeData),
                    label: getTwoLetterInitials(person.name),
                    person,
                    gradientFrom: gradient.from,
                    gradientTo: gradient.to,
                  },
                }
              : {
                  id: person.id,
                  type: "person",
                  position,
                  data: {
                    label: getTwoLetterInitials(person.name),
                    person,
                    gradientFrom: gradient.from,
                    gradientTo: gradient.to,
                  },
                };

          nodes.push(node);

          // Calculate optimal handle positions based on edge direction
          const targetNode = node;
          const sourceNode = introducerNode;
          const dx = targetNode.position.x - sourceNode.position.x;
          const dy = targetNode.position.y - sourceNode.position.y;
          
          const sourceHandleIndex = getHandleIndex(dx, dy);
          const targetHandleIndex = getHandleIndex(-dx, -dy);
          
          edges.push({
            id: `edge-${introducerId}-${person.id}`,
            source: introducerId,
            target: person.id,
            sourceHandle: getHandleId(sourceHandleIndex, "source"),
            targetHandle: getHandleId(targetHandleIndex, "target"),
            type: "default",
            style: { stroke: lineColor, strokeWidth: 2 },
          });
        });
      });

      // ---- Commit edges once per recompute ----
      setEdges(edges);

      // Resolve any initial collisions in the layout
      const NODE_RADIUS = 25;
      const MIN_DISTANCE = NODE_RADIUS * 1.25;
      const BOUNCE_FORCE = 5;

      let resolvedNodes = [...nodes];
      let hasCollisions = true;
      let iterations = 0;
      const maxIterations = 10;

      while (hasCollisions && iterations < maxIterations) {
        hasCollisions = false;
        iterations++;

        for (let i = 0; i < resolvedNodes.length; i++) {
          const nodeA = resolvedNodes[i];
          if (nodeA.id === "user-center" && !nodeA.draggable) continue;

          for (let j = i + 1; j < resolvedNodes.length; j++) {
            const nodeB = resolvedNodes[j];
            if (nodeB.id === "user-center" && !nodeB.draggable) continue;

            const dx = nodeB.position.x - nodeA.position.x;
            const dy = nodeB.position.y - nodeA.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < MIN_DISTANCE && distance > 0) {
              hasCollisions = true;

              const unitX = dx / distance;
              const unitY = dy / distance;
              const overlap = MIN_DISTANCE - distance;
              const pushDistance = (overlap / 2) + BOUNCE_FORCE;

              resolvedNodes[i] = {
                ...nodeA,
                position: {
                  x: nodeA.position.x - unitX * pushDistance * 0.25,
                  y: nodeA.position.y - unitY * pushDistance * 0.25,
                },
              };

              resolvedNodes[j] = {
                ...nodeB,
                position: {
                  x: nodeB.position.x + unitX * pushDistance * 0.25,
                  y: nodeB.position.y + unitY * pushDistance * 0.25,
                },
              };
            }
          }
        }
      }

      // Sanity check: log edges count
      console.log(`updateNodesAndEdges: Created ${edges.length} edges, ${resolvedNodes.length} nodes`);

      return resolvedNodes;
    });
  }, [user, loadNodePositions, getHandleIndex, getHandleId, seedRandomFromString, generateGradientFromId, calculateLineColor]);

  const handleAddClick = () => {
    if (!user) {
      // Redirect to sign-in page when not logged in
      window.location.href = "/sign-in";
      return;
    }
    setShowAddModal(true);
  };

  const handleSavePerson = () => {
    loadPeople();
  };

  const handleResetPositions = () => {
    if (!user?.id) return;
    
    // Clear saved positions from localStorage
    try {
      const key = `node-positions-${user.id}`;
      localStorage.removeItem(key);
      console.log("[resetPositions] Cleared saved positions");
    } catch (error) {
      console.error("Failed to clear node positions:", error);
    }
    
    // Clear all nodes except user center to force recalculation
    setNodes((prevNodes) => {
      const userCenter = prevNodes.find(n => n.id === "user-center" || n.id === "fallback-user-center");
      return userCenter ? [userCenter] : fallbackNodes;
    });
    
    // Reload people to trigger updateNodesAndEdges with fresh positions
    // Use setTimeout to ensure state update happens first
    setTimeout(() => {
      loadPeople();
    }, 0);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Sanity logging
  console.log("ReactFlow nodes:", nodes);
  console.log("ReactFlow edges:", edges);
  console.log("All nodes use type 'person':", nodes.every((n) => n.type === "person"));

  // Default edge options for smooth bezier curves
  const defaultEdgeOptions: DefaultEdgeOptions = {
    type: "default", // bezier in React Flow 11
    animated: false,
    style: { strokeWidth: 2 },
  };

  return (
    <div className="relative h-screen w-screen bg-white">
      {/* Clerk UserButton in top right */}
      {isLoaded && user && (
        <div className="fixed top-4 right-4 z-20">
          <UserButton />
        </div>
      )}
      
      {/* Reset positions button */}
      {!isLoading && isLoaded && people.length > 0 && (
        <button
          onClick={handleResetPositions}
          className="fixed top-4 left-4 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 transition-colors z-20 text-sm font-medium text-gray-700"
          aria-label="Reset node positions"
        >
          Reset Positions
        </button>
      )}
      
      <div className="absolute inset-0">
        {isLoading || !isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading your network...</div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.Bezier}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            className="bg-white"
            onNodeClick={(_, node) => {
              if (node.data?.person && !node.data?.isUser) {
                setSelectedPerson(node.data.person);
              }
            }}
              onNodeMouseEnter={(event, node) => {
                if (node.data?.person && !node.data?.isUser) {
                  // Clear any existing timeout
                  if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                  }
                  
                  setHoveredPerson(node.data.person);
                  // Get the node's screen position
                  const rect = (event.target as HTMLElement).getBoundingClientRect();
                  setHoveredNodePosition({ x: rect.left + rect.width / 2, y: rect.top });
                  setShowTooltip(false);
                  
                  // Delay showing tooltip by 0.2 seconds
                  const timeout = setTimeout(() => {
                    setShowTooltip(true);
                  }, 200);
                  setTooltipTimeout(timeout);
                }
              }}
              onNodeMouseLeave={() => {
                // Clear timeout if user moves away before 0.2 seconds
                if (tooltipTimeout) {
                  clearTimeout(tooltipTimeout);
                  setTooltipTimeout(null);
                }
                setHoveredPerson(null);
                setHoveredNodePosition(null);
                setShowTooltip(false);
              }}
          >
            {/* Light grey dotted background */}
            <Background
              variant={"dots" as any}
              gap={24}
              size={2.5}
              color="#d1d5db"
            />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredPerson && showTooltip && hoveredNodePosition && (
        <div
          className="fixed z-30 bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-lg shadow-xl pointer-events-none"
          style={{
            left: hoveredNodePosition.x,
            top: hoveredNodePosition.y - 10,
            transform: "translate(-50%, -100%)",
            minWidth: "200px",
          }}
        >
          <div className="font-semibold text-gray-900">{hoveredPerson.name}</div>
          {(hoveredPerson.role || hoveredPerson.company) && (
            <div className="text-sm text-gray-600 mt-0.5 mb-1.5">
              {hoveredPerson.role || hoveredPerson.company}
            </div>
          )}
          {hoveredPerson.created_at && (
            <div className="text-xs text-gray-500">
              Added {new Date(hoveredPerson.created_at).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "2-digit",
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating + button */}
      <button
        onClick={handleAddClick}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-black text-white text-2xl font-light flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors z-10"
        aria-label="Add connection"
      >
        +
      </button>

      {/* Add Person Modal */}
      {user?.id && (
        <AddPersonModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSavePerson}
          userId={user.id}
          existingPeople={people.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Profile Panel */}
      <ProfilePanel
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEventAdded={handleSavePerson}
        onPersonDeleted={() => {
          setSelectedPerson(null);
          loadPeople();
        }}
      />
    </div>
  );
}
