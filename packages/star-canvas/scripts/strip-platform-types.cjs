#!/usr/bin/env node
/**
 * Strips platform-only type declarations from dist .d.ts files.
 * Run after build to clean the public type surface before npm publish.
 *
 * Removes: InputPoint, InputHandler, DragState, createDragState,
 * and GameContext members: toStagePoint, createDrag, onTap, onMove, onRelease.
 */
const { readFileSync, writeFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');

const distDir = join(__dirname, '..', 'dist');
if (!existsSync(distDir)) {
  console.log('No dist/ directory found, skipping');
  process.exit(0);
}

const dtsFiles = readdirSync(distDir).filter(f => /\.d\.(ts|mts|cts)$/.test(f));

for (const file of dtsFiles) {
  const filePath = join(distDir, file);
  let content = readFileSync(filePath, 'utf8');
  const before = content.length;

  // Remove InputPoint interface + JSDoc
  content = content.replace(
    /\/\*\* Point with coordinates and the original event \*\/\ninterface InputPoint \{[^}]*\}\n/g, ''
  );

  // Remove InputHandler type + JSDoc
  content = content.replace(
    /\/\*\* Input handler type \*\/\ntype InputHandler = [^\n]*;\n/g, ''
  );

  // Remove platform-only GameContext members (toStagePoint through onRelease)
  content = content.replace(
    /    toStagePoint:[\s\S]*?    onRelease: \(handler: InputHandler\) => void;\n/g, ''
  );

  // Remove DragState interface + JSDoc
  content = content.replace(
    /\/\*\* Drag state helper[^\n]*\*\/\ninterface DragState<[\s\S]*?\n\}\n/g, ''
  );

  // Remove createDragState function declaration
  content = content.replace(
    /declare function createDragState<[\s\S]*?\): DragState<T>;\n/g, ''
  );

  // Clean up export line — remove platform-only type/value exports
  content = content.replace(/type DragState, /g, '');
  content = content.replace(/type InputHandler, /g, '');
  content = content.replace(/type InputPoint, /g, '');
  content = content.replace(/createDragState, /g, '');

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  writeFileSync(filePath, content);
  const stripped = before - content.length;
  if (stripped > 0) {
    console.log(`  Stripped ${stripped} chars from ${file}`);
  } else {
    console.log(`  No platform-only types found in ${file}`);
  }
}
