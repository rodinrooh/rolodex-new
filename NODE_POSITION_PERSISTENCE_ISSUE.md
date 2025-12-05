# Node Position Persistence Issue

## Problem Summary

Node positions are not persisting correctly after page refresh. The behavior is inconsistent:
- **Direct connections** (nodes connected directly to the user center, e.g., "R", "J"): Positions are **NOT** persisting - they reset to initial calculated positions on refresh
- **Introduced connections** (nodes connected through an introducer, e.g., "B", "C", "N"): Positions **ARE** persisting correctly - they maintain their dragged positions after refresh

## Current Behavior

1. User drags a direct connection node (e.g., "R" or "J") to a new position
2. User refreshes the page
3. **Direct connection nodes reset to their initial calculated positions** (based on random angle/radius)
4. User drags an introduced connection node (e.g., "B", "C", or "N") to a new position
5. User refreshes the page
6. **Introduced connection nodes maintain their dragged positions** ✅

## Expected Behavior

All nodes (both direct and introduced connections) should maintain their dragged positions after page refresh.

## Technical Context

### Tech Stack
- **Framework**: Next.js 16.0.3
- **React Flow**: v11.11.4
- **State Management**: React hooks (`useState`, `useCallback`, `useEffect`)
- **Persistence**: localStorage (scoped per user ID)

### Key Functions

#### 1. `saveNodePositions(nodes: Node<PersonNodeData>[])`
- **Location**: Defined as `useCallback` around line 269
- **Purpose**: Saves all node positions to localStorage
- **Key**: `node-positions-${user.id}`
- **Behavior**: 
  - Excludes user center node (always at 0,0)
  - Saves all other nodes with their current positions
  - Called when dragging ends (`!positionChange.dragging`)
- **Code**:
```typescript
const saveNodePositions = useCallback((nodes: Node<PersonNodeData>[]) => {
  if (!user?.id) return;
  
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node) => {
    if (node.id !== "user-center" && node.id !== "fallback-user-center") {
      positions[node.id] = { x: node.position.x, y: node.position.y };
    }
  });
  
  localStorage.setItem(`node-positions-${user.id}`, JSON.stringify(positions));
}, [user?.id]);
```

#### 2. `loadNodePositions(): Record<string, { x: number; y: number }>`
- **Location**: Defined as `useCallback` around line 288
- **Purpose**: Loads saved positions from localStorage
- **Returns**: Object mapping node IDs to their saved positions
- **Code**:
```typescript
const loadNodePositions = useCallback((): Record<string, { x: number; y: number }> => {
  if (!user?.id) return {};
  
  try {
    const saved = localStorage.getItem(`node-positions-${user.id}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load node positions:", error);
  }
  
  return {};
}, [user?.id]);
```

#### 3. `updateNodesAndEdges(peopleList: Person[], allEvents: Event[])`
- **Location**: Defined as `useCallback` starting around line 496
- **Purpose**: Creates/updates nodes and edges based on people data
- **Dependencies**: `[user, loadNodePositions, getHandleIndex, getHandleId]`
- **Key Behavior**: 
  - Loads saved positions at the start: `const savedPositions = loadNodePositions();`
  - Creates nodes for direct connections and introduced connections
  - Uses saved positions if available, otherwise calculates initial positions

### Node Creation Logic

#### Direct Connections (Lines ~546-580)
```typescript
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
    const randomAngleSeed = seedRandomFromString(person.id + "-angle");
    const angle = randomAngleSeed * 2 * Math.PI;
    
    const radiusRand = seedRandomFromString(person.id + "-radius");
    const radius = baseRadius + (radiusRand - 0.5) * radiusJitter;
    
    position = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }
  
  // ... create node with position
});
```

#### Introduced Connections (Lines ~637-680)
```typescript
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
    // ... calculate position relative to introducer
  }
  
  // ... create node with position
});
```

### Position Saving Logic

#### `onNodesChange` Handler (Lines ~304-372)
- **Trigger**: React Flow fires this when nodes are dragged
- **Key Logic**:
```typescript
const onNodesChange = useCallback((changes: NodeChange[]) => {
  setNodes((currentNodes) => {
    const positionChange = changes.find(change => change.type === "position");
    const changedNodeId = positionChange && positionChange.dragging ? positionChange.id : undefined;
    
    const updatedNodes = applyNodeChanges(changes, currentNodes);
    const nodesAfterCollision = detectAndResolveCollisions(updatedNodes, changedNodeId);
    
    // Save positions when dragging ends
    if (positionChange && !positionChange.dragging) {
      setTimeout(() => {
        saveNodePositions(nodesAfterCollision);
      }, 0);
    }
    
    return nodesAfterCollision;
  });
}, [getHandleIndex, getHandleId, saveNodePositions]);
```

## Potential Issues

### Issue 1: Timing/Order of Operations
- `updateNodesAndEdges` is called when people data loads (line ~428)
- This happens in `loadPeople()` which is called in a `useEffect` when user logs in
- The saved positions are loaded at the start of `updateNodesAndEdges`
- But `updateNodesAndEdges` uses `setNodes((prevNodes) => ...)` which might have stale state

### Issue 2: `prevById` Map Logic
- `updateNodesAndEdges` creates `prevById` from `prevNodes` (line ~487)
- For direct connections, it checks `existing = prevById.get(person.id)`
- If `existing` is found, it uses `existing.position` (line ~539)
- **This might override saved positions if a node already exists in state**

### Issue 3: State Initialization
- Nodes state is initialized with `fallbackNodes` (line ~133)
- When `updateNodesAndEdges` runs, `prevNodes` might already contain nodes
- The `existing` check might be finding nodes that were just created, not truly "existing" dragged nodes

### Issue 4: Direct vs Introduced Connection Difference
- Direct connections are created first (before introduced connections)
- Introduced connections are created after direct connections
- The `prevById` map is built from `prevNodes` at the start
- **Hypothesis**: When direct connections are created, they might not exist in `prevNodes` yet, so `existing` is null, and it falls through to check `savedPosition`. But if `prevNodes` already has nodes from a previous render, `existing` might be truthy and use the old position instead of the saved one.

### Issue 5: Multiple Renders
- `updateNodesAndEdges` might be called multiple times
- On first call, nodes don't exist, so saved positions are used
- On subsequent calls (e.g., after data refetch), nodes exist in `prevNodes`, so `existing.position` is used instead of `savedPosition`

## Code Flow Analysis

### On Page Load (First Render)
1. Component mounts, `nodes` state = `fallbackNodes` (just user center)
2. `useEffect` triggers `loadPeople()` (line ~405)
3. `loadPeople()` fetches people and calls `updateNodesAndEdges(fetchedPeople, allEvents)`
4. `updateNodesAndEdges` runs:
   - `prevNodes` = `fallbackNodes` (just user center)
   - `prevById` = map with only "user-center"
   - `savedPositions` = loaded from localStorage
   - For direct connections:
     - `existing = prevById.get(person.id)` = `undefined` (not in prevNodes)
     - Falls to `savedPosition` check
     - **Should use saved position if available**
   - For introduced connections:
     - `existing = prevById.get(person.id)` = `undefined`
     - Falls to `savedPosition` check
     - **Should use saved position if available**

### On Refresh (Subsequent Render)
1. Component mounts, `nodes` state = `fallbackNodes`
2. But wait - if React Flow or something else is preserving state, `nodes` might not be `fallbackNodes`
3. `loadPeople()` is called again
4. `updateNodesAndEdges` runs:
   - `prevNodes` = current nodes state (might be empty or might have nodes)
   - If `prevNodes` has nodes from a previous render cycle, `prevById` will contain them
   - For direct connections:
     - `existing = prevById.get(person.id)` might be truthy
     - If truthy, uses `existing.position` instead of `savedPosition`
     - **This could be the bug!**

## Hypothesis

The issue is likely in the priority order of position selection:

**Current Priority (for direct connections):**
1. `existing.position` (if node exists in prevNodes)
2. `savedPosition` (if in localStorage)
3. Calculated initial position

**Problem**: If `existing` is found (which might be from a stale render or React Flow's internal state), it uses that position instead of the saved position.

**Why introduced connections work**: They might be created later in the render cycle, or the `existing` check behaves differently for them.

## Debugging Steps

1. **Add logging** to see what `prevNodes` contains when `updateNodesAndEdges` runs
2. **Add logging** to see if `existing` is found for direct vs introduced connections
3. **Add logging** to see if `savedPosition` is found and what value it has
4. **Check localStorage** directly to verify positions are being saved correctly
5. **Verify** that `prevNodes` doesn't contain stale nodes from previous renders

## Potential Solutions

### Solution 1: Change Priority Order
Instead of checking `existing` first, check `savedPosition` first:
```typescript
let position;
if (savedPosition) {
  // Use saved position from localStorage (highest priority)
  position = savedPosition;
} else if (existing) {
  // Keep where the user dragged it (if no saved position)
  position = existing.position;
} else {
  // Initial layout
  position = calculateInitialPosition();
}
```

### Solution 2: Clear `prevNodes` on Initial Load
Ensure `prevNodes` is truly empty on first load, or ignore `existing` if it's from a stale render.

### Solution 3: Use a Flag
Track whether this is the initial load or a subsequent update, and only use `existing.position` on subsequent updates (not initial load).

### Solution 4: Check Position Age
Compare `existing.position` with `savedPosition` and prefer the saved one if they differ significantly (indicating the saved one is more recent).

## Additional Context

- **Node IDs**: Direct connections use `person.id` as their node ID
- **User Center**: Always at position `{ x: 0, y: 0 }`, not draggable, not saved
- **Collision Detection**: Runs after positions are set, might affect final positions
- **Edge Handle Updates**: Edges recalculate handles when nodes move, but this shouldn't affect position persistence

## Files to Review

- `app/page.tsx`: Main component file containing all the logic
- Lines 268-301: `saveNodePositions` and `loadNodePositions` functions
- Lines 304-372: `onNodesChange` handler
- Lines 496-810: `updateNodesAndEdges` function
- Lines 546-580: Direct connection node creation
- Lines 637-680: Introduced connection node creation

## Success Criteria

After fix:
- ✅ Direct connection nodes maintain their positions after refresh
- ✅ Introduced connection nodes continue to maintain their positions (already working)
- ✅ All nodes can be dragged and positions persist
- ✅ No console errors
- ✅ localStorage contains correct positions for all nodes

