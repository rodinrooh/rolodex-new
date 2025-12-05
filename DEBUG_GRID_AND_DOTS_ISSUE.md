# Debug: Grid Background Showing Instead of Person Dots

## Problem Statement

### Current Behavior
- A grid pattern (light gray lines forming a grid) is visible on the canvas
- Person dots (nodes) are NOT visible, even when logged in and people have been added
- The user dot (center dot with user initial) may or may not be visible

### Expected Behavior
- **NO grid background** - just a clean white/blank background
- Person dots (nodes) should be visible as circular nodes on the canvas
- User dot should be visible in the center with gradient background
- Connecting lines between nodes should be visible

## Tech Stack Context

- **Framework**: Next.js 16.0.3 with App Router
- **React**: 19.2.0
- **Graph Library**: React Flow 11.11.4
- **Styling**: Tailwind CSS 4
- **Authentication**: Clerk (for user management)
- **Database**: Supabase (for storing people and events)

## Relevant Code Files

### Main Component: `app/page.tsx`

This is the main page component that renders the canvas. Key sections:

#### 1. State Management
```typescript
const [nodes, setNodes] = useState<Node[]>([]);
const [edges, setEdges] = useState<Edge[]>([]);
const [people, setPeople] = useState<Person[]>([]);
const [isLoading, setIsLoading] = useState(true);
const { user, isLoaded } = useUser(); // From Clerk
```

#### 2. User Dot Initialization (Lines 21-56)
```typescript
useEffect(() => {
  if (isLoaded && user && nodes.length === 0) {
    const userInitial = user.firstName?.[0]?.toUpperCase() || 
                        user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || 
                        "U";
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 - 25 : 400;
    const centerY = typeof window !== "undefined" ? window.innerHeight / 2 - 25 : 300;
    
    const centerNode: Node = {
      id: "user-center",
      type: "default",
      position: { x: centerX, y: centerY },
      data: { label: userInitial, isUser: true },
      style: {
        width: 50,
        height: 50,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: "20px",
        border: "2px solid white",
      },
      draggable: false,
    };
    setNodes([centerNode]);
  } else if (isLoaded && !user && nodes.length > 0) {
    setNodes([]);
    setEdges([]);
  }
}, [isLoaded, user, nodes.length]);
```

#### 3. Loading People and Creating Nodes (Lines 58-196)
```typescript
// Load people from database
useEffect(() => {
  if (isLoaded && user?.id) {
    loadPeople();
  } else if (isLoaded && !user) {
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
    
    const personIds = fetchedPeople.map((p) => p.id);
    const allEvents = await getEventsForPeople(personIds);
    
    updateNodesAndEdges(fetchedPeople, allEvents);
  } catch (error) {
    console.error("Error loading people:", error);
  } finally {
    setIsLoading(false);
  }
};

const updateNodesAndEdges = (peopleList: Person[], allEvents: Event[]) => {
  if (!user) return;

  const userInitial = user.firstName?.[0]?.toUpperCase() || 
                      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || 
                      "U";
  const centerX = typeof window !== "undefined" ? window.innerWidth / 2 - 25 : 400;
  const centerY = typeof window !== "undefined" ? window.innerHeight / 2 - 25 : 300;

  // Create center node
  const centerNode: Node = {
    id: "user-center",
    type: "default",
    position: { x: centerX, y: centerY },
    data: { label: userInitial, isUser: true },
    style: {
      width: 50,
      height: 50,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: "20px",
      border: "2px solid white",
    },
    draggable: false,
  };

  // Create person nodes around center
  const personNodes: Node[] = peopleList.map((person, index) => {
    const angle = (index / peopleList.length) * 2 * Math.PI;
    const radius = 200;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return {
      id: person.id,
      type: "default",
      position: { x, y },
      data: { 
        label: person.name[0].toUpperCase(),
        person: person,
      },
      style: {
        width: 50,
        height: 50,
        borderRadius: "50%",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#1f2937",
        fontWeight: "bold",
        fontSize: "20px",
        border: "2px solid #9ca3af",
      },
    };
  });

  // Create edges with color based on events
  const personEdges: Edge[] = [];
  peopleList.forEach((person) => {
    const personEvents = allEvents.filter((e) => e.person_id === person.id);
    const lineColor = calculateLineColor(personEvents);

    if (person.introducer_id) {
      const introducer = peopleList.find((p) => p.id === person.introducer_id);
      if (introducer) {
        const introducerEvents = allEvents.filter((e) => e.person_id === introducer.id);
        const introducerLineColor = calculateLineColor(introducerEvents);
        
        if (!personEdges.some((e) => e.source === "user-center" && e.target === introducer.id)) {
          personEdges.push({
            id: `edge-user-${introducer.id}`,
            source: "user-center",
            target: introducer.id,
            style: { stroke: introducerLineColor, strokeWidth: 2 },
          });
        }
      }
      personEdges.push({
        id: `edge-${person.introducer_id}-${person.id}`,
        source: person.introducer_id,
        target: person.id,
        style: { stroke: lineColor, strokeWidth: 2 },
      });
    } else {
      personEdges.push({
        id: `edge-user-${person.id}`,
        source: "user-center",
        target: person.id,
        style: { stroke: lineColor, strokeWidth: 2 },
      });
    }
  });

  setNodes([centerNode, ...personNodes]);
  setEdges(personEdges);
};
```

#### 4. Render Section (Lines 222-265) - CURRENT PROBLEMATIC CODE
```typescript
return (
  <div className="relative h-screen w-screen bg-white">
    {/* Subtle grid background - just lines, no dots */}
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }}
    />

    {/* React Flow canvas */}
    <div className="absolute inset-0 z-10">
      {showLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading your network...</div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          className="bg-transparent"
          onNodeClick={(event, node) => {
            if (node.data.person && !node.data.isUser) {
              setSelectedPerson(node.data.person);
            }
          }}
          onNodeMouseEnter={(event, node) => {
            if (node.data.person && !node.data.isUser) {
              setHoveredPerson(node.data.person);
            }
          }}
          onNodeMouseLeave={() => {
            setHoveredPerson(null);
          }}
        >
          <Controls />
        </ReactFlow>
      )}
    </div>
    {/* ... rest of component ... */}
  </div>
);
```

## What We've Tried

1. **Removed React Flow Background component** - Initially removed `<Background />` from ReactFlow, but dots still didn't show
2. **Added z-index layering** - Set grid to `z-0` and React Flow to `z-10` to ensure proper stacking
3. **Wrapped React Flow in absolute container** - Tried wrapping ReactFlow in an absolute positioned div

## Key Observations

1. **Grid is visible** - The CSS grid background (lines 224-234) is rendering
2. **Nodes array has data** - Based on the code, `nodes` should contain:
   - At minimum: the user center node (when logged in)
   - Additionally: person nodes (when people exist in database)
3. **React Flow is rendering** - The component is mounting (Controls are visible)
4. **Nodes not visible** - Despite nodes being in the array, they're not appearing on screen

## Potential Issues to Investigate

### 1. React Flow CSS/Styling
- React Flow requires `reactflow/dist/style.css` to be imported (line 6)
- Check if nodes are being rendered but hidden by CSS
- Verify React Flow's default node styling isn't being overridden incorrectly

### 2. Node Positioning
- Nodes are positioned using `x, y` coordinates
- `fitView` prop might be zooming/panning in a way that hides nodes
- Check if nodes are positioned off-screen

### 3. Node Rendering
- React Flow uses a custom node renderer
- Default node type might not be rendering custom styles correctly
- May need to use a custom node component or ensure default node type supports inline styles

### 4. Z-Index Conflicts
- Grid at `z-0`, React Flow at `z-10` should work, but verify
- Check if React Flow's internal elements have proper z-index

### 5. React Flow Viewport
- `fitView` might be causing issues
- Check if viewport is initialized correctly
- Verify React Flow's internal canvas is rendering

## Expected Node Appearance

**User Center Node:**
- 50x50px circle
- Purple-to-blue gradient background
- White border (2px)
- White letter (user initial) in center
- Fixed position (not draggable)

**Person Nodes:**
- 50x50px circles
- Light gray background (#f3f4f6)
- Gray border (#9ca3af)
- Dark gray letter (first letter of person's name)
- Positioned in circle around center node

## Debugging Steps to Try

1. **Remove grid completely** - Delete the grid background div entirely
2. **Check browser console** - Look for React Flow errors or warnings
3. **Inspect DOM** - Verify React Flow is creating node elements in the DOM
4. **Check node data** - Add `console.log(nodes)` to verify nodes array has data
5. **Test with minimal node** - Try rendering just one hardcoded node
6. **Verify React Flow version compatibility** - Check if React Flow 11.11.4 API matches our usage
7. **Check React Flow CSS** - Ensure `reactflow/dist/style.css` is loading correctly
8. **Test without fitView** - Remove `fitView` prop to see if that's causing issues
9. **Verify node type** - React Flow might need explicit node type or custom node component

## Additional Context

- The PRD specifies: "Blank grid background" - but user wants NO grid, just dots
- The app uses React Flow for graph visualization
- Nodes should be interactive (clickable, hoverable)
- The grid was added to match PRD but user wants it removed

## Files to Check

1. `app/page.tsx` - Main component (full file attached above)
2. `lib/db.ts` - Database functions (getPeople, getEventsForPeople)
3. `components/AddPersonModal.tsx` - Modal for adding people
4. `app/globals.css` - Global styles that might affect React Flow

## React Flow Documentation Reference

- React Flow v11 uses a different API than v10
- Nodes require proper structure: `{ id, type, position, data, style }`
- Default node type should render with custom styles
- May need to check if React Flow v11 requires different node configuration

## Next Steps

1. Remove the grid background div completely
2. Verify nodes are in the state array (add console.log)
3. Check React Flow's internal rendering
4. Test with a minimal example to isolate the issue
5. Verify React Flow CSS is loading
6. Check if nodes need custom node components for React Flow v11

