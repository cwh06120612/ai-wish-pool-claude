import type { DepartmentOption } from "@/data/departments";

export type FlatDepartment = {
  label: string;
  path: string[];
  fullPath: string;
};

// Internal node with id for stable browsing
export type TreeNode = {
  label: string;
  path: string[]; // full path from root (no skipping)
  children?: TreeNode[];
};

// Build indexed tree from departments (top-level = companies, no root to skip)
export function buildTree(nodes: DepartmentOption[], parentPath: string[] = []): TreeNode[] {
  return nodes.map((n) => {
    const path = [...parentPath, n.label];
    return {
      label: n.label,
      path,
      children: n.children ? buildTree(n.children, path) : undefined,
    };
  });
}

// Flatten all leaf nodes
export function flattenLeafNodes(nodes: DepartmentOption[]): FlatDepartment[] {
  const results: FlatDepartment[] = [];
  function walk(nodes: DepartmentOption[], path: string[]) {
    for (const n of nodes) {
      const p = [...path, n.label];
      if (!n.children || n.children.length === 0) {
        results.push({ label: n.label, path: p, fullPath: p.join(" > ") });
      } else {
        walk(n.children, p);
      }
    }
  }
  walk(nodes, []);
  return results;
}

// Search leaf nodes by any segment
export function searchDepartments(nodes: DepartmentOption[], query: string): FlatDepartment[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return flattenLeafNodes(nodes).filter((d) =>
    d.path.some((p) => p.toLowerCase().includes(q))
  );
}

// Get TreeNode at a given path array (exact match by label at each level)
export function getNodeAtPath(nodes: DepartmentOption[], path: string[]): DepartmentOption | null {
  if (path.length === 0) return null;
  let current: DepartmentOption[] = nodes;
  let found: DepartmentOption | null = null;
  for (const seg of path) {
    found = current.find((n) => n.label === seg) ?? null;
    if (!found) return null;
    current = found.children ?? [];
  }
  return found;
}

// Get children at path (empty path = top level)
export function getChildrenAtPath(nodes: DepartmentOption[], path: string[]): DepartmentOption[] {
  if (path.length === 0) return nodes;
  const node = getNodeAtPath(nodes, path);
  return node?.children ?? [];
}

// Check if path points to a leaf node
export function isLeafNode(nodes: DepartmentOption[], path: string[]): boolean {
  if (path.length === 0) return false;
  const node = getNodeAtPath(nodes, path);
  if (!node) return false;
  return !node.children || node.children.length === 0;
}
