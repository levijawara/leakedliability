

# Plan: Project Folder Position Anchoring

## Problem Summary
Currently, when a project folder is created, it always appears at the TOP of the grid (before all ungrouped call sheets). This is jarring visually because:
- The Arin Ray sheets were near the top of the list
- After grouping them, the folder jumps to position #1
- User expects the folder to stay roughly where those sheets were

## Solution: Position-Based Interleaving

Instead of rendering all projects first, then all ungrouped sheets, we'll **interleave** them based on a position anchor derived from the earliest call sheet in each project.

```text
BEFORE (Current):                    AFTER (Fixed):
┌──────────────┐                     ┌──────────────┐
│ 📁 Project 1 │  ← Always first     │ Alo Yoga     │  ← Ungrouped
├──────────────┤                     ├──────────────┤
│ 📁 Project 2 │  ← Always second    │ Alo Yoga     │  ← Ungrouped
├──────────────┤                     ├──────────────┤
│ Alo Yoga     │                     │ Alo Yoga     │  ← Ungrouped
├──────────────┤                     ├──────────────┤
│ Alo Yoga     │                     │ 📁 Arin Ray  │  ← At position of first grouped sheet
├──────────────┤                     ├──────────────┤
│ Bankrol      │                     │ Bankrol      │  ← Ungrouped
└──────────────┘                     └──────────────┘
```

## Technical Approach

### Step 1: Compute Project Position Anchor

For each project, determine its "anchor position" based on the **earliest** `created_at` timestamp among its grouped call sheets. This way, when sorted by upload date (desc), the project appears where its first sheet would have been.

### Step 2: Create Combined Grid Items

Build a unified list of "grid items" that includes both projects and ungrouped sheets:

```typescript
type GridItem = 
  | { type: 'project'; project: Project; anchorDate: Date }
  | { type: 'sheet'; link: UserCallSheetLink };
```

### Step 3: Sort Combined List

Sort the combined list using the same sort logic currently applied to sheets, using `anchorDate` for projects.

### Step 4: Render Interleaved Grid

Map over the combined list and render `ProjectFolderCard` or `CallSheetCard` based on item type.

## Files to Modify

1. **`src/components/callsheets/CallSheetList.tsx`**
   - Add position anchor computation for projects
   - Create combined grid items array
   - Update rendering to use interleaved list

## Technical Details

### Position Anchor Computation

```typescript
// For each project, find the earliest created_at from its call sheets
const projectsWithAnchors = useMemo(() => {
  return projects.map(project => {
    // Find the earliest sheet in this project
    const sheetDates = project.callSheets
      .map(cs => {
        // Find the full link data to get created_at
        const link = userLinks.find(l => l.id === cs.id);
        return link?.created_at ? new Date(link.created_at) : null;
      })
      .filter((d): d is Date => d !== null);
    
    const anchorDate = sheetDates.length > 0 
      ? new Date(Math.max(...sheetDates.map(d => d.getTime()))) // Latest (first in desc sort)
      : new Date(project.created_at);
    
    return { ...project, anchorDate };
  });
}, [projects, userLinks]);
```

### Combined Grid Items

```typescript
const combinedGridItems = useMemo(() => {
  // Build items array
  const items: GridItem[] = [
    ...filteredProjects.map(p => ({ 
      type: 'project' as const, 
      project: p, 
      anchorDate: projectAnchors.get(p.id) || new Date(p.created_at)
    })),
    ...filteredSheets.map(link => ({ 
      type: 'sheet' as const, 
      link 
    }))
  ];
  
  // Sort by the same field/direction as current sort
  items.sort((a, b) => {
    const dateA = a.type === 'project' ? a.anchorDate : new Date(a.link.created_at);
    const dateB = b.type === 'project' ? b.anchorDate : new Date(b.link.created_at);
    
    if (sortField === 'uploadDate') {
      return sortDirection === 'desc' 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    }
    // Handle shootDate sort similarly...
    return 0;
  });
  
  return items;
}, [filteredProjects, filteredSheets, projectAnchors, sortField, sortDirection]);
```

### Rendering

```tsx
{combinedGridItems.map((item) => 
  item.type === 'project' ? (
    <ProjectFolderCard key={item.project.id} project={item.project} ... />
  ) : (
    <CallSheetCard key={item.link.id} link={item.link} ... />
  )
)}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Sort by Upload Date (desc) | Project appears at position of its LATEST sheet |
| Sort by Upload Date (asc) | Project appears at position of its EARLIEST sheet |
| Sort by Shoot Date | Use earliest parsed_date from grouped sheets |
| Search filter | Projects filtered normally, then interleaved |
| New project created | Appears at position of first selected sheet |

## Summary

| Change | Description |
|--------|-------------|
| Add anchor computation | Calculate position date from grouped sheets |
| Create combined items | Merge projects + ungrouped sheets into single list |
| Sort combined list | Apply current sort field/direction uniformly |
| Update render loop | Single map over combined items |

This ensures the "Arin Ray, December 2021" folder stays visually where the Arin Ray sheets were before grouping, making the grouping feel like a natural collapse rather than a jarring reorder.

