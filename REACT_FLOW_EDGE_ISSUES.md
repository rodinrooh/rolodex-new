# React Flow Edge and Connection Issues

## Problem Summary

The React Flow diagram is experiencing multiple critical issues with edge rendering, connection points, and node positioning. Edges are appearing as short, disconnected segments instead of smooth, continuous lines connecting nodes properly.

## Current Behavior

1. **Edge Rendering Issues:**
   - Edges appear as very short segments, not connecting nodes properly
   - Lines are "all over the place" and appear bugged
   - Edges do not form continuous connections between nodes
   - Lines seem disconnected or incomplete

2. **Connection Handle Visibility:**
   - Connection handles (small dots/lines on node edges) are still visible on some nodes
   - User wants NO visible connection points - connections should be able to attach anywhere on the 360-degree circle perimeter
   - Multiple attempts to hide handles via CSS have been partially successful but inconsistent

3. **Node Positioning:**
   - People with introducers should be positioned directly next to their introducer
   - Currently, some nodes (like Nick) appear far from their introducer (Richard) instead of adjacent
   - Example: If Richard is on the right side, Nick should be right next to Richard, not on the opposite side

## Expected Behavior

1. **Edges:**
   - Smooth, slightly curved bezier lines connecting nodes
   - Continuous lines that properly connect from one node to another
   - Lines should connect at optimal points on the circle perimeter (anywhere, not just fixed positions)
   - Clean, aesthetic appearance similar to reference diagrams

2. **Connection Points:**
   - NO visible connection handles/dots on any nodes
   - Connections should be able to attach anywhere on the 360-degree circle perimeter
   - No restrictions to top/bottom/left/right positions

3. **Node Layout:**
   - People without introducers: positioned around the center (user) in a circle
   - People with introducers: positioned directly adjacent to their introducer
   - Example: User → Richard → Nick (Nick should be right next to Richard)

## Technical Context

### Tech Stack
- **Framework:** Next.js 16.0.3 with App Router
- **React:** 19.2.0
- **Graph Library:** React Flow 11.11.4
- **Styling:** Tailwind CSS 4
- **TypeScript:** Yes

### File Structure
- Main component: `app/page.tsx`
- Global styles: `app/globals.css`
- Layout: `app/layout.tsx` (imports `reactflow/dist/style.css`)

## Current Implementation

### Edge Creation Logic

Located in `app/page.tsx` in the `updateNodesAndEdges` function (lines ~280-330):

```typescript
const personEdges: Edge[] = [];
peopleList.forEach((person) => {
  const personEvents = allEvents.filter((e) => e.person_id === person.id);
  const lineColor = calculateLineColor(personEvents);

  if (person.introducer_id) {
    const introducer = peopleList.find((p) => p.id === person.introducer_id);

    if (introducer) {
      const introducerEvents = allEvents.filter(
        (e) => e.person_id === introducer.id,
      );
      const introducerLineColor = calculateLineColor(introducerEvents);

      // Only create edge from user to introducer if it doesn't exist
      if (
        !personEdges.some(
          (e) =>
            e.source === "user-center" && e.target === introducer.id,
        )
      ) {
        personEdges.push({
          id: `edge-user-${introducer.id}`,
          source: "user-center",
          target: introducer.id,
          type: "default", // Explicit bezier for smooth curves
          style: { stroke: introducerLineColor, strokeWidth: 2 },
        });
      }

      // Edge from introducer to person (Nick connects to Richard, not directly to user)
      personEdges.push({
        id: `edge-${person.introducer_id}-${person.id}`,
        source: person.introducer_id,
        target: person.id,
        type: "default", // Explicit bezier for smooth curves
        style: { stroke: lineColor, strokeWidth: 2 },
      });
    }
  } else {
    // Direct connection from user to person
    personEdges.push({
      id: `edge-user-${person.id}`,
      source: "user-center",
      target: person.id,
      type: "default", // Explicit bezier for smooth curves
      style: { stroke: lineColor, strokeWidth: 2 },
    });
  }
});
```

### Node Creation

Nodes are created with:
- `type: "default"` 
- Circular styling (50x50px, borderRadius: "50%")
- Position calculated based on introducer relationships

**Direct connections** (no introducer) are positioned around center:
```typescript
const directNodes: Node[] = directConnections.map((person, index) => {
  const angle = (index / Math.max(directConnections.length, 1)) * 2 * Math.PI;
  const radius = 200;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;
  // ... node creation
});
```

**Introduced connections** are positioned near their introducer:
```typescript
// Position directly next to introducer
const offsetRadius = 120; // Closer to introducer
const angleOffset = index === 0 
  ? Math.PI / 4  // 45 degrees to the side
  : (index / Math.max(people.length, 1)) * Math.PI * 0.6;
const offsetAngle = angleToIntroducer + angleOffset;
const x = introducerPos.x + Math.cos(offsetAngle) * offsetRadius;
const y = introducerPos.y + Math.sin(offsetAngle) * offsetRadius;
```

### React Flow Configuration

Located in `app/page.tsx` render section (~lines 350-400):

```typescript
<ReactFlow
  nodes={nodes.length ? nodes : fallbackNodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  fitView
  className="bg-white"
  nodesConnectable={false}
  nodesDraggable={true}
  elementsSelectable={true}
  // ... event handlers
>
  <Background variant={"dots" as any} gap={24} size={2.5} color="#d1d5db" />
  <Controls />
</ReactFlow>
```

### Handle Hiding Attempts

**Global CSS** (`app/globals.css`):
```css
/* Hide React Flow connection handles - we want connections anywhere on the circle */
.react-flow__handle,
.react-flow__handle-top,
.react-flow__handle-bottom,
.react-flow__handle-left,
.react-flow__handle-right,
.react-flow__node .react-flow__handle,
.react-flow__node-default .react-flow__handle,
div[class*="react-flow__handle"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  pointer-events: none !important;
}
```

**Dynamic CSS Injection** (in `app/page.tsx` component, top-level useEffect):
```typescript
useEffect(() => {
  const style = document.createElement('style');
  style.textContent = `
    .react-flow__handle,
    .react-flow__handle-top,
    .react-flow__handle-bottom,
    .react-flow__handle-left,
    .react-flow__handle-right {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
  return () => {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  };
}, []);
```

## Potential Issues to Investigate

### 1. Edge Type Configuration
- Currently using `type: "default"` which should be bezier
- May need to explicitly use `type: "bezier"` or ensure default is working
- Check if React Flow v11 requires different edge type specification

### 2. Node Positioning and Edge Calculation
- Edges might be calculated before nodes are properly positioned
- `fitView` might be affecting edge rendering
- Node positions might be in different coordinate spaces

### 3. Handle Visibility
- CSS might not be specific enough or loading order issue
- React Flow might be adding handles after CSS loads
- May need to use custom node component without handles

### 4. Edge Source/Target Validation
- Verify all edge source and target IDs match actual node IDs
- Check if nodes exist when edges are created
- Ensure no timing issues between node and edge creation

### 5. React Flow Version Compatibility
- React Flow 11.11.4 API might have changed
- Check if edge rendering requires different configuration
- Verify default edge type behavior

### 6. Coordinate System
- Nodes positioned at (0, 0) for center - verify this works with fitView
- Edge calculation might need node center positions, not top-left
- React Flow uses node center for connections by default

## Code References

### Key Files
- `app/page.tsx` - Main component with React Flow implementation
- `app/globals.css` - Global styles including handle hiding
- `app/layout.tsx` - Imports React Flow CSS
- `lib/db.ts` - Database functions (getPeople, getEventsForPeople, calculateLineColor)

### Key Functions
- `updateNodesAndEdges(peopleList, allEvents)` - Creates nodes and edges
- `loadPeople()` - Loads data and calls updateNodesAndEdges

### Edge Structure
Each edge has:
- `id`: Unique identifier
- `source`: Source node ID (e.g., "user-center" or person.id)
- `target`: Target node ID (person.id)
- `type`: "default" (should be bezier)
- `style`: { stroke: color, strokeWidth: 2 }

### Node Structure
Each node has:
- `id`: Unique identifier
- `type`: "default"
- `position`: { x, y } coordinates
- `data`: { label, person, isUser }
- `style`: Circular styling with width/height 50px

## Debugging Steps

1. **Verify Edge Data:**
   - Console log edges array to ensure all edges are created
   - Check that source/target IDs match node IDs exactly
   - Verify edge type is correct

2. **Check Node Positions:**
   - Log node positions to verify they're set correctly
   - Ensure nodes exist before edges reference them
   - Check if fitView is affecting positions

3. **React Flow Rendering:**
   - Inspect DOM to see if edges are being rendered
   - Check React Flow internal state
   - Verify React Flow CSS is loading

4. **Handle Visibility:**
   - Inspect DOM to see if handles are actually hidden
   - Check CSS specificity and loading order
   - Consider custom node component approach

5. **Edge Type:**
   - Try explicitly setting `type: "bezier"` instead of "default"
   - Check React Flow v11 documentation for edge types
   - Verify bezier is the default for v11

## Additional Context

- User wants smooth, slightly curved lines (bezier) - NOT sharp angled lines (smoothstep)
- Connections should attach anywhere on circle perimeter (360 degrees)
- No visible connection points/handles
- Nodes with introducers must be positioned adjacent to introducer
- All edges should be continuous, properly connecting nodes

## React Error (Fixed)

There was a React Hooks violation where `useEffect` for CSS injection was placed after a conditional return. This has been fixed by moving the `useEffect` to the top of the component, before any conditional logic.

## Questions for Debugging

1. Are edges being created in the edges array?
2. Do edge source/target IDs match node IDs?
3. Are nodes positioned correctly when edges are created?
4. Is React Flow rendering edges but they're just not visible/connected?
5. Does React Flow v11 require different edge configuration?
6. Should we use custom edge components instead of default?
7. Are there any React Flow console errors or warnings?

