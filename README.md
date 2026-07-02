# Margin

A web application for generating visual and structural diffs between Figma file versions.

## Overview

Margin is a web application that compares two versions of a Figma file and generates a real, human-readable diff. Instead of manually scanning designs for changes, users can instantly see what was added, removed, moved, resized, or edited between versions.

The application generates a scannable changelog with concrete deltas, alongside visual comparison modes including a side-by-side scrubber and an annotated overlay view. Margin is designed to help design teams and developers better understand evolving design systems, collaborative edits, and handoff changes.

## Who This Is For

- Studio teams working collaboratively across shared Figma files
- Developers reviewing updated handoff files
- Designers tracking iteration changes between versions
- Teams looking for clearer visibility into design updates

## Features

### Core Features

- Figma OAuth authentication
- File and version selection
- Server-side diff engine
- Detection of:
  - Added frames
  - Removed frames
  - Moved elements
  - Resized elements
  - Text content changes
- Multiple comparison views:
  - Changelog view
  - Side-by-side scrubber
  - Overlay with annotations

## Future Improvements

- Persistent session management (replace in-memory token storage)
- Responsive mobile layout
- Exportable diff reports (PDF/Markdown)
- Named version filtering (surface labeled versions seperately)
- Diff engine improvements (name-based matching for restructured files)

## Tech Stack

### Frontend

- React
- Vite
- JavaScript

### Backend

- Node.js
- Express

### Authentication

- Figma OAuth

### Deployment

- Vercel (frontend)
- Railway or Fly.io (backend)

### Diffing

- Custom server-side diffing logic

### Database

- No database required for v1

### License

© 2026 Margin. All rights reserved. This project is provided for viewing purposes only and may not be copied, modified, or distributed without permission.
