---
name: codegraph
description: Use semantic code intelligence to explore codebase architecture, call graphs, symbol references, and dependencies. Use when understanding complex code flows, tracing callers/callees, or indexing codebases.
---

# CodeGraph Semantic Code Intelligence

CodeGraph provides tree-sitter AST parsing, symbol indexing, and call graph analysis stored in a local SQLite index (`.codegraph/`).

## When to Use
- Exploring large or unfamiliar codebases
- Tracing function references, caller hierarchies, and dependencies across files
- Finding semantic definitions and call sites without relying on regex search

## Setup & Commands

1. **Initialize CodeGraph Index in current project:**
   ```bash
   npx @colbymchenry/codegraph init
   ```
   Or if installed globally:
   ```bash
   codegraph init
   ```

2. **Explore Code Structure:**
   ```bash
   codegraph explore
   ```

3. **Search for symbols:**
   ```bash
   codegraph search <symbol_name>
   ```

4. **Inspect symbol references and call hierarchy:**
   ```bash
   codegraph inspect <symbol_name>
   ```

