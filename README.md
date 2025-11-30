# Unified Lambda Handler - MVC Architecture

This is a refactored version of the unified Lambda handler using MVC (Model-View-Controller) architecture pattern.

## 📁 Project Structure

```
unified/
├── index.js                          # Main entry point
├── package.json                      # Dependencies
├── routes/
│   └── index.js                      # Route dispatcher
├── controllers/
│   ├── producer.controller.js        # Producer logic
│   ├── consumer.controller.js        # Consumer logic
│   └── replay.controller.js          # Replay logic
├── models/
│   ├── execution.model.js            # Execution DB operations
│   ├── log.model.js                  # Log DB operations
│   └── queue.model.js                # SQS operations
└── services/
    └── pokemon.service.js            # External Pokemon API calls
```

## 🏗️ Architecture Layers

### **Models** (`models/`)
Data layer - handles all database and queue operations
- `execution.model.js` - DynamoDB execution records (create, get, update)
- `log.model.js` - DynamoDB log entries (write)
- `queue.model.js` - SQS operations (send, fetch, delete)

### **Services** (`services/`)
Business logic layer - external API integrations
- `pokemon.service.js` - Pokemon API calls (getPokemon, getPokemonAbility, listPokemon)

### **Controllers** (`controllers/`)
Application logic layer - orchestrates models and services
- `producer.controller.js` - Validates requests, creates executions, queues messages
- `consumer.controller.js` - Processes messages, calls Pokemon API, handles retries
- `replay.controller.js` - Replays failed messages from DLQ

### **Routes** (`routes/`)
Request routing layer - maps paths to controllers
- `index.js` - Routes API Gateway requests to appropriate controller

### **Main Handler** (`index.js`)
Entry point - detects event source and delegates
- SQS events → automatic processing
- API Gateway events → route-based dispatch

## 🚀 Deployment

```bash
cd unified
npm install
cd ..
./deploy-unified.sh
```

## 📡 API Endpoints

### POST /producer
Queue new Pokemon API requests

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/prod/producer \
  -H 'Content-Type: application/json' \
  -d '{"action": "get-pokemon", "pokemon": "pikachu"}'
```

### POST /consumer
Manually process specific execution

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/prod/consumer \
  -H 'Content-Type: application/json' \
  -d '{"execution_id": "exec_xxx"}'
```

### POST /replay
Replay failed executions from DLQ

```bash
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/prod/replay \
  -H 'Content-Type: application/json' \
  -d '{"execution_ids": ["exec_xxx", "exec_yyy"]}'
```

## 🔄 How It Works

1. **Producer Flow**:
   - Client sends request to `/producer`
   - `producer.controller` validates action
   - `execution.model` creates DB record
   - `queue.model` sends message to SQS
   - Returns `execution_id` to client

2. **Consumer Flow (Automatic)**:
   - SQS triggers Lambda with message
   - `consumer.controller` processes message
   - `pokemon.service` calls external API
   - `execution.model` updates status
   - `log.model` writes processing logs

3. **Replay Flow**:
   - Client sends request to `/replay`
   - `replay.controller` fetches DLQ messages
   - `execution.model` resets execution status
   - `queue.model` sends back to main queue
   - Returns replay summary

## 🎯 Benefits of MVC Structure

- **Separation of Concerns**: Each layer has single responsibility
- **Reusability**: Models and services can be reused across controllers
- **Testability**: Easy to unit test individual components
- **Maintainability**: Clear structure, easy to locate code
- **Scalability**: Easy to add new routes/controllers/services

## 📝 Adding New Features

### Add New Route
1. Create controller in `controllers/`
2. Add route in `routes/index.js`
3. Add path to API Gateway

### Add New API Integration
1. Create service in `services/`
2. Call from controller
3. Update validation if needed

### Add New Data Model
1. Create model in `models/`
2. Import in controllers as needed
