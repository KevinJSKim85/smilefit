#!/bin/bash
# Flush all Firestore collections (scores_balloon, scores_tetris)
# Usage: ./scripts/flush-db.sh

PROJECT="faceplay-d57c3"
COLLECTIONS=("scores_balloon" "scores_tetris")

echo "Flushing Firestore collections on project: $PROJECT"
echo ""

for col in "${COLLECTIONS[@]}"; do
  echo "Deleting $col..."
  firebase firestore:delete --project "$PROJECT" --recursive --force "$col" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ✓ $col cleared"
  else
    echo "  - $col was already empty or doesn't exist"
  fi
done

echo ""
echo "Done! All collections flushed."
