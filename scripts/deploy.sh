#!/bin/bash
set -e

echo "=== Deploying EmpowerHer Portal ==="

cd /opt/empowerher

git pull origin main

docker compose down
docker compose up -d --build

echo "=== Deployment complete ==="
