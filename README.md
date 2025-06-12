# Load Balancer in Node.js

This project demonstrates a custom Load Balancer implemented in Node.js using Round-Robin routing. It distributes traffic between three mock backend servers built with Express.

## 🔧 Tech Stack
- Node.js
- Express.js
- Round Robin Logic
- (React frontend coming soon)

## 📁 Structure
- `servers/` → 3 backend mock servers (server1, server2, server3)
- `load-balancer/` → Balancer logic (to be added next)
- `frontend/` → UI (to be added later)

## 🚀 How to Run (Backend)

```bash
# Go to each server folder, install express and run
npm install
node index.js
