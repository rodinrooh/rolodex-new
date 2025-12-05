# Collision Detection and Bounce-Back Issue

## Problem Summary

Collision detection and bounce-back functionality is not working. Nodes are phasing through each other when dragged, with no interaction or separation. Nodes should detect collisions and bounce apart when they get too close.

## Current Behavior

- **Nodes phase through each other**: When dragging a node into another node, they simply overlap with no interaction
- **No collision detection**: Nodes can be positioned directly on top of each other
- **No bounce effect**: There is no visual or positional feedback when nodes collide
- **No minimum distance enforcement**: Nodes can be placed arbitrarily close together

## Expected Behavior

- **Collision detection**: When two nodes get within 62.5px of each other (2.5 × node radius), they should be detected as colliding
- **Automatic separation**: Colliding nodes should automatically push apart
- **Bounce effect**: The pushed node should move away with a satisfying bounce (25px push force)
- **Smart pushing**: 
  - If a node is being dragged, it should move less (30% of push distance)
  - The static node should move more (70% of push distance)
  - If neither is being dragged, both move equally (50% each)
- **Real-time feedback**: Collision detection should happen in real-time during dragging

## Technical Context

### Tech Stack
- **Framework**: Next.js 16.0.3 with App Router
- **React**: 19.2.0
- **Graph Library**: React Flow 11.11.4
- **TypeScript**: Yes

### Node Specifications
- **Node size**: 50px × 50px (h-[50px] w-[50px])
- **Node radius**: 25px (for collision detection)
- **Minimum distance**: 62.5px (2.5 × radius) - nodes should maintain this distance
- **Bounce force**: 25px - how far to push nodes apart when colliding

### File Structure
- Main component: `app/page.tsx`
- Node component: `PersonCircleNode` (custom circular node)

## Current Implementation

### Collision Detection Constants

Located in `app/page.tsx` around lines 109-112:

```typescript
// Collision detection and bounce-back
const NODE_RADIUS = 25; // 50px / 2
const MIN_DISTANCE = NODE_RADIUS * 2.5; // More padding to prevent touching (62.5px)
const BOUNCE_FORCE = 25; // How far to push nodes apart (more visible bounce)
```

### Collision Detection Function

Located in `app/page.tsx` around lines 114-191:

```typescript
const detectAndResolveCollisions = (
  nodes: Node<PersonNodeData>[],
  changedNodeId?: string,
): Node<PersonNodeData>[] => {
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
      // Skip user center node
      if (nodeA.id === "user-center") continue;

      for (let j = i + 1; j < updatedNodes.length; j++) {
        const nodeB = updatedNodes[j];
        // Skip user center node
        if (nodeB.id === "user-center") continue;

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
          // Otherwise, both move equally (50% each)
          const isAChanged = changedNodeId === nodeA.id;
          const isBChanged = changedNodeId === nodeB.id;
          
          const pushA = isAChanged ? pushDistance * 0.3 : pushDistance * 0.5;
          const pushB = isBChanged ? pushDistance * 0.3 : pushDistance * 0.5;

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
```

### Node Change Handler

Located in `app/page.tsx` around lines 193-217:

```typescript
// Change handlers for React Flow dragging with collision detection
const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    setNodes((nds) => {
      // Find which node was moved (if any) before applying changes
      let changedNodeId: string | undefined;
      for (const change of changes) {
        if (change.type === "position") {
          changedNodeId = change.id;
          break;
        }
      }

      // First apply the changes
      let updatedNodes = applyNodeChanges(changes, nds);

      // Detect and resolve collisions after applying changes
      const nodesAfterCollision = detectAndResolveCollisions(updatedNodes, changedNodeId);

      // Always return the collision-resolved nodes
      return nodesAfterCollision;
    });
  },
  [],
);
```

### Node Drag Handler

Located in `app/page.tsx` around lines 226-240:

```typescript
// Handle node dragging with real-time collision detection
const onNodeDrag = useCallback(
  (_: React.MouseEvent, node: Node<PersonNodeData>) => {
    setNodes((nds) => {
      // Update the dragged node's position
      let updatedNodes = nds.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n,
      );

      // Detect and resolve collisions with the dragged node
      updatedNodes = detectAndResolveCollisions(updatedNodes, node.id);

      return updatedNodes;
    });
  },
  [],
);
```

### React Flow Configuration

Located in `app/page.tsx` around lines 604-640:

```typescript
<ReactFlow
  nodes={nodes.length ? nodes : fallbackNodes}
  edges={edges}
  nodeTypes={nodeTypes}
  defaultEdgeOptions={defaultEdgeOptions}
  connectionLineType={ConnectionLineType.Bezier}
  nodesDraggable={true}
  nodesConnectable={false}
  elementsSelectable={true}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeDrag={onNodeDrag}
  fitView
  className="bg-white"
  // ... other props
>
```

### Custom Node Component

Located in `app/page.tsx` around lines 32-77:

```typescript
// Custom circular node component with invisible handles
function PersonCircleNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { label, isUser } = data;

  return (
    <div className="relative flex items-center justify-center">
      {/* Invisible handles so edges can attach but nothing is visible */}
      <Handle
        type="source"
        position={Position.Right}
        className="rf-invisible-handle"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="rf-invisible-handle"
      />
      <Handle
        type="source"
        position={Position.Top}
        className="rf-invisible-handle"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        className="rf-invisible-handle"
      />

      <div
        className={[
          "flex h-[50px] w-[50px] items-center justify-center rounded-full text-base font-semibold",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg"
            : "border border-slate-300 bg-white text-slate-800",
          selected ? "ring-2 ring-indigo-400" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </div>
    </div>
  );
}
```

## Potential Issues to Investigate

### 1. Handler Execution Order
- `onNodeDrag` fires during dragging
- `onNodesChange` fires when drag ends
- Possible conflict: `onNodesChange` might be overriding `onNodeDrag` collision resolution
- **Question**: Are both handlers running? Is one overriding the other?

### 2. React Flow Position Updates
- React Flow might be using internal position state that overrides our updates
- Position changes might need to be applied differently
- **Question**: Is React Flow ignoring our position updates in `onNodeDrag`?

### 3. State Update Timing
- `setNodes` in `onNodeDrag` might be batched or delayed
- React Flow might be using its own position state during drag
- **Question**: Are position updates happening but being overridden by React Flow's internal state?

### 4. Node Position Reference
- Nodes might be using stale position references
- The `node.position` in `onNodeDrag` might not reflect the actual dragged position
- **Question**: Is the dragged node's position being read correctly?

### 5. Collision Detection Logic
- Distance calculation might be incorrect
- Unit vector calculation might have issues
- Position updates might not be creating new objects properly
- **Question**: Is collision detection actually running? Check console logs.

### 6. React Flow Version Compatibility
- React Flow 11.11.4 might handle drag events differently
- `onNodeDrag` API might have changed
- Position updates might require different approach
- **Question**: Does React Flow 11 support `onNodeDrag` the way we're using it?

## Debugging Steps

1. **Check Console Logs**: Look for "Collision detected" messages when dragging nodes together
   - If no logs appear: Collision detection isn't running or distance check is failing
   - If logs appear but nodes don't move: Position updates aren't being applied

2. **Verify Handler Execution**: Add console logs to both `onNodeDrag` and `onNodesChange`
   ```typescript
   console.log('onNodeDrag called', node.id, node.position);
   console.log('onNodesChange called', changes);
   ```

3. **Check Node Positions**: Log node positions before and after collision detection
   ```typescript
   console.log('Before collision:', updatedNodes.map(n => ({ id: n.id, pos: n.position })));
   console.log('After collision:', nodesAfterCollision.map(n => ({ id: n.id, pos: n.position })));
   ```

4. **Test Distance Calculation**: Manually verify distance between two known nodes
   ```typescript
   const node1 = nodes.find(n => n.id === 'some-id');
   const node2 = nodes.find(n => n.id === 'other-id');
   const dx = node2.position.x - node1.position.x;
   const dy = node2.position.y - node1.position.y;
   const distance = Math.sqrt(dx * dx + dy * dy);
   console.log('Distance:', distance, 'MIN_DISTANCE:', MIN_DISTANCE);
   ```

5. **Verify React Flow State**: Check if React Flow is maintaining its own position state
   - React Flow might be using internal state that overrides our updates
   - May need to use React Flow's position update mechanism

## React Flow Documentation References

- React Flow 11.11.4 API documentation
- `onNodeDrag` event handler behavior
- Position update mechanisms
- State management during dragging

## Alternative Approaches to Consider

### Approach 1: Use `onNodeDragStop` instead of `onNodeDrag`
- Only resolve collisions when drag ends
- Might be less responsive but more reliable

### Approach 2: Use React Flow's `nodeExtent` or `preventScrolling`
- These might provide built-in collision prevention
- Check if React Flow has native collision features

### Approach 3: Use a physics library
- Integrate a lightweight physics engine (e.g., matter.js)
- More complex but potentially more reliable

### Approach 4: Custom drag handler
- Override React Flow's drag behavior entirely
- Full control but more implementation work

### Approach 5: Use `onMove` or `onMoveStart`/`onMoveEnd`
- React Flow might have different event handlers
- Check React Flow 11 API for alternative drag events

## Key Questions for Debugging

1. **Is collision detection running?** (Check console logs)
2. **Are position updates being applied?** (Check node positions before/after)
3. **Is React Flow overriding our position updates?** (Check if positions revert)
4. **Are both handlers conflicting?** (Check if `onNodesChange` overrides `onNodeDrag`)
5. **Is the distance calculation correct?** (Manually verify distances)
6. **Are nodes being updated in the state?** (Check React DevTools state)
7. **Does React Flow 11 handle `onNodeDrag` differently?** (Check API docs)

## Expected Console Output

When working correctly, you should see:
```
onNodeDrag called <node-id> { x: 123, y: 456 }
Collision detected: <node-id-1> and <node-id-2>, distance: 45.2px
```

If collision detection is working but positions aren't updating:
```
Collision detected: <node-id-1> and <node-id-2>, distance: 45.2px
Before collision: [{ id: '...', pos: { x: 100, y: 100 } }, ...]
After collision: [{ id: '...', pos: { x: 85, y: 95 } }, ...]
```

## Code References

### Key Functions
- `detectAndResolveCollisions`: Main collision detection logic (lines ~114-191)
- `onNodesChange`: Handles React Flow node changes (lines ~193-217)
- `onNodeDrag`: Handles real-time dragging (lines ~226-240)

### Key Constants
- `NODE_RADIUS = 25`: Node radius in pixels
- `MIN_DISTANCE = 62.5`: Minimum distance between nodes (2.5 × radius)
- `BOUNCE_FORCE = 25`: Push distance when colliding

### React Flow Props
- `nodesDraggable={true}`: Enables dragging
- `onNodesChange={onNodesChange}`: Handles position changes
- `onNodeDrag={onNodeDrag}`: Handles real-time dragging

## Additional Context

- Nodes are circular (50px diameter)
- User center node is not draggable and should be skipped in collision detection
- All other nodes are draggable
- Nodes use custom `PersonCircleNode` component
- Position updates must create new objects for React to detect changes
- React Flow uses controlled components - state must be managed carefully

## Success Criteria

Collision detection is working when:
1. Dragging a node into another causes both to separate
2. Console shows "Collision detected" messages
3. Nodes maintain minimum 62.5px distance
4. Bounce effect is visible (25px push)
5. Dragged node moves less than static node
6. No nodes can overlap or phase through each other

