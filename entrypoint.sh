#!/bin/sh
set -eu

# Schema changes run as an explicit release step through `npm run db:migrate`.
# Application startup never mutates schema or swallows migration failures.
exec node server.js
