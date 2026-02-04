# System Optimization Recommendations

## Current Issues

### 1. Foreign Key Constraint Workaround

**Current Implementation**: Manual deletion of project_members before deleting projects
**Issue**: Two database queries, not atomic, slower
**Status**: ⚠️ Workaround in place, needs proper fix

### 2. Bulk Delete Inefficiency

**Current Implementation**: Loop through projects, delete one at a time
**Issue**: N network requests, no transaction, slow, unreliable
**Status**: ⚠️ Works but highly inefficient

---

## Recommended Fixes

### Fix 1: Database CASCADE (Priority: HIGH)

**Run in Supabase SQL Editor:**

```sql
-- Fix project_members foreign key constraint
ALTER TABLE public.project_members
DROP CONSTRAINT project_members_project_id_fkey;

ALTER TABLE public.project_members
ADD CONSTRAINT project_members_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;
```

**Then simplify the delete function in `src/services/supabaseService.js`:**

```javascript
// Delete project (simplified after CASCADE is in place)
async delete(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  return true
}
```

**Benefits:**

- ✅ Single database operation
- ✅ Atomic transaction
- ✅ Database handles cleanup automatically
- ✅ 2x faster

---

### Fix 2: Bulk Delete Optimization (Priority: MEDIUM)

**Option A: Backend Bulk Delete Endpoint (Recommended)**

Add to `server/src/controllers/projects.controller.js`:

```javascript
export const bulkDeleteProjects = async (req, res, next) => {
  try {
    const { projectIds } = req.body

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'projectIds must be a non-empty array' },
      })
    }

    const result = await ProjectModel.bulkDelete(projectIds)
    res.json({
      success: true,
      data: { deletedCount: result.deletedCount, failed: result.failed },
    })
  } catch (error) {
    next(error)
  }
}
```

Add to `server/src/models/project.model.js`:

```javascript
static async bulkDelete(projectIds) {
  const client = await db.connect();
  const deletedCount = 0;
  const failed = [];

  try {
    await client.query('BEGIN');

    for (const id of projectIds) {
      try {
        await client.query('DELETE FROM projects WHERE id = $1', [id]);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete project ${id}:`, error);
        failed.push(id);
      }
    }

    await client.query('COMMIT');
    return { deletedCount, failed };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Option B: Supabase Bulk Delete (Simple)**

Update frontend `confirmBulkDelete` in all 4 views:

```javascript
const confirmBulkDelete = async () => {
  if (selectedProjects.value.length === 0) return

  bulkDeleteInProgress.value = true

  try {
    // Bulk delete with single query using .in()
    const { error } = await supabase.from('projects').delete().in('id', selectedProjects.value)

    if (error) throw error

    // Remove deleted projects from local state
    projects.value = projects.value.filter((p) => !selectedProjects.value.includes(p.id))

    alert(`Successfully deleted ${selectedProjects.value.length} projects`)
    selectedProjects.value = []
    showBulkDeleteConfirm.value = false
  } catch (error) {
    console.error('Error during bulk delete:', error)
    alert(`Failed to delete projects: ${error.message}`)
  } finally {
    bulkDeleteInProgress.value = false
  }
}
```

**Benefits:**

- ✅ Single database operation for all deletes
- ✅ Much faster (1 request vs N requests)
- ✅ More reliable
- ✅ Better user experience

---

## Implementation Priority

1. **[HIGH]** Apply database CASCADE migration → Fixes foreign key issue properly
2. **[MEDIUM]** Implement Option B (Supabase bulk delete) → Quick win, much better than current
3. **[LOW]** Consider Option A (Backend endpoint) → Best for complex logic/validation

---

## Performance Impact

| Operation          | Current     | After CASCADE | After Bulk Delete |
| ------------------ | ----------- | ------------- | ----------------- |
| Delete 1 project   | 2 queries   | 1 query       | 1 query           |
| Delete 10 projects | 20 queries  | 10 queries    | 1 query           |
| Delete 50 projects | 100 queries | 50 queries    | 1 query           |

**Expected improvements:**

- Single delete: 50% faster
- Bulk delete (10 items): 90% faster
- Bulk delete (50 items): 98% faster
