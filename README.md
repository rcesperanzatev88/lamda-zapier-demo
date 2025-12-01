# Unified Lambda Handler - Slack Integration with Zapier-like Architecture

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
    └── slack.service.js              # Slack webhook integrations
```

## 🏗️ Architecture Layers

### **Models** (`models/`)
Data layer - handles all database and queue operations
- `execution.model.js` - DynamoDB execution records (create, get, update with reserved keyword handling)
- `log.model.js` - DynamoDB log entries with 90-day TTL (write)
- `queue.model.js` - SQS operations (send, fetch, delete)

### **Services** (`services/`)
Business logic layer - external API integrations
- `slack.service.js` - Slack webhook calls (sendMessage, sendFormattedMessage)

### **Controllers** (`controllers/`)
Application logic layer - orchestrates models and services
- `producer.controller.js` - Validates requests, sends Slack messages, checks status
- `consumer.controller.js` - Processes queued messages, handles retries
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
Send Slack messages and check execution status

```bash
curl -X POST https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod/producer \
  -H 'Content-Type: application/json' \
  -d '{"action": "send-slack-message", "message": "Hello, World!"}'
```

**Request Options:**
- `send-slack-message`: `{"action": "send-slack-message", "message": "Hello, World!"}`
- `send-slack-formatted`: `{"action": "send-slack-formatted", "payload": {"text": "Hello!"}}`
- `get-status`: `{"action": "get-status", "execution_id": "exec_xxx"}`

### POST /consumer
Manually process specific execution

```bash
curl -X POST https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod/consumer \
  -H 'Content-Type: application/json' \
  -d '{"execution_id": "exec_xxx"}'
```

### POST /replay
Replay failed executions from DLQ

```bash
curl -X POST https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod/replay \
  -H 'Content-Type: application/json' \
  -d '{"execution_ids": ["exec_xxx", "exec_yyy"]}'
```

**Or replay all DLQ messages:**
```bash
curl -X POST https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod/replay \
  -H 'Content-Type: application/json' \
  -d '{"replay_all": true}'
```

## 🔄 Data Flow Diagrams

### 📤 Producer Flow (Queue Messages)
```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /producer
     │ {"action": "send-slack-message", "message": "Hello!"}
     ▼
┌─────────────────────┐
│   API Gateway       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Lambda Handler     │
│  (index.js)         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Routes             │
│  /producer          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│  ProducerController         │
│  1. Validate action         │
│  2. Generate execution_id   │
└─────────┬───────────────────┘
          │
          ├──────────────────────┐
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌─────────────────┐
│ ExecutionModel   │   │  QueueModel     │
│ createExecution()│   │  sendToQueue()  │
└────────┬─────────┘   └────────┬────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌─────────────────┐
│  DynamoDB        │   │   SQS Queue     │
│  sqs-executions  │   │   (Main)        │
│  Status: queued  │   │   Message       │
└──────────────────┘   └─────────────────┘
         │
         └──────────────┐
                        │
                        ▼
                  ┌──────────┐
                  │  Client  │
                  │ Response │
                  │ {exec_id}│
                  └──────────┘
```

### 📥 Consumer Flow (Process Messages)
```
┌─────────────────┐
│   SQS Queue     │
│   (Main)        │
└────────┬────────┘
         │ SQS Trigger (automatic)
         │ Max 10 messages/batch
         ▼
┌─────────────────────┐
│  Lambda Handler     │
│  (index.js)         │
└─────────┬───────────┘
          │ Detect SQS event
          ▼
┌─────────────────────────────────┐
│  ConsumerController             │
│  processMessage()               │
│  1. Update status: processing   │
└─────────┬───────────────────────┘
          │
          ├─────────────┬──────────────┐
          │             │              │
          ▼             ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────┐
│ExecutionModel│ │  LogModel   │ │  Slack   │
│updateStatus()│ │  writeLog() │ │ Service  │
└──────┬───────┘ └──────┬──────┘ └────┬─────┘
       │                │              │
       ▼                ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  DynamoDB    │ │  DynamoDB   │ │Slack Webhook │
│  executions  │ │  logs       │ │  External    │
│ processing   │ │  info       │ │  https://... │
└──────────────┘ └─────────────┘ └──────┬───────┘
                                        │
                                        │ API Response
                                        ▼
                        ┌──────────────────────────┐
                        │  ConsumerController      │
                        │  2. Update: completed    │
                        └──────────┬───────────────┘
                                   │
                                   ├──────────┐
                                   │          │
                                   ▼          ▼
                        ┌──────────────┐ ┌─────────────┐
                        │ExecutionModel│ │  LogModel   │
                        │updateStatus()│ │  writeLog() │
                        │+ result data │ │  success    │
                        └──────┬───────┘ └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  DynamoDB    │
                        │  executions  │
                        │  completed   │
                        │  + result    │
                        └──────────────┘
```

### ⚠️ Error & Retry Flow
```
┌─────────────────────┐
│  Consumer Fails     │
│  (API error, etc.)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│  Error Handler              │
│  retry_count < 3?           │
└─────────┬───────────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼ YES       ▼ NO
┌─────────┐  ┌──────────────┐
│ Retry   │  │  Move to DLQ │
│ Message │  │  Status:     │
│ Backoff │  │  failed      │
└────┬────┘  └──────┬───────┘
     │              │
     ▼              ▼
┌─────────┐  ┌──────────────┐
│SQS Queue│  │   SQS DLQ    │
│ (Main)  │  │ (Dead Letter)│
└─────────┘  └──────────────┘
```

### 🔄 Replay Flow (Recover Failed Messages)
```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /replay
     │ {"replay_all": true}
     ▼
┌─────────────────────┐
│  ReplayController   │
│  1. Fetch DLQ msgs  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   QueueModel        │
│   fetchFromDLQ()    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   SQS DLQ           │
│   Read messages     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│  ReplayController           │
│  2. Reset execution status  │
│  3. Send back to queue      │
└─────────┬───────────────────┘
          │
          ├──────────────┬──────────────┐
          │              │              │
          ▼              ▼              ▼
┌──────────────┐  ┌──────────┐  ┌──────────────┐
│ExecutionModel│  │QueueModel│  │   LogModel   │
│updateStatus()│  │sendQueue │  │   writeLog() │
│ queued       │  │          │  │   replay     │
└──────────────┘  └────┬─────┘  └──────────────┘
                       │
                       ▼
                ┌──────────────┐
                │  SQS Queue   │
                │  (Main)      │
                │  Re-queued!  │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │  Consumer    │
                │  Retry       │
                └──────────────┘
```

### 📊 Complete System Overview
```
                    ┌──────────────────────────────────────────┐
                    │         Client Application               │
                    └──────┬────────────────────┬──────────────┘
                           │                    │
                    POST /producer      POST /replay
                           │                    │
                           ▼                    ▼
                    ┌──────────────────────────────────────────┐
                    │         API Gateway (REST API)           │
                    └──────┬────────────────────┬──────────────┘
                           │                    │
                           ▼                    ▼
                    ┌────────────────────────────────────────────┐
                    │      Lambda Function (Unified Handler)     │
                    │  ┌──────────────────────────────────────┐  │
                    │  │  Routes → Controllers → Models       │  │
                    │  └──────────────────────────────────────┘  │
                    └──┬──────────┬──────────┬─────────┬────────┘
                       │          │          │         │
            ┌──────────┘          │          │         └────────────┐
            │                     │          │                      │
            ▼                     ▼          ▼                      ▼
    ┌──────────────┐      ┌──────────────────────┐         ┌─────────────┐
    │  SQS Queue   │◄─────│   DynamoDB Tables    │         │   Slack     │
    │   (Main)     │      │  - sqs-executions    │         │  Webhooks   │
    └──────┬───────┘      │  - sqs-logs (TTL=90d)│         └─────────────┘
           │              └──────────────────────┘
           │ SQS Trigger
           │ (auto)
           ▼
    ┌──────────────┐
    │   Lambda     │
    │  (Consumer)  │
    └──────┬───────┘
           │
      ┌────┴────┐
      │         │
   Success    Fail (3x)
      │         │
      ▼         ▼
    [Done]  ┌──────────┐
            │ SQS DLQ  │
            └──────────┘
```

## 🔄 How It Works

## 🎯 Benefits of this Structure

- **Separation of Concerns**: Each layer has single responsibility
- **Reusability**: Models and services can be reused across controllers
- **Testability**: Easy to unit test individual components
- **Maintainability**: Clear structure, easy to locate code
- **Scalability**: Easy to add new routes/controllers/services
- **Error Handling**: Proper DynamoDB reserved keyword handling (status, result)
- **Region Consistency**: All AWS services use `AWS_REGION` environment variable
- **Data Retention**: Automatic log cleanup with 90-day TTL

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
2. Use `ExpressionAttributeNames` for reserved keywords
3. Import in controllers as needed

## ⚙️ Environment Variables

```bash
AWS_REGION=ap-southeast-1
QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/xxx/sqs-queue
DLQ_URL=https://sqs.ap-southeast-1.amazonaws.com/xxx/sqs-dlq
EXECUTIONS_TABLE=sqs-executions
LOGS_TABLE=sqs-logs
```

## 🐛 Common Issues & Fixes

### ResourceNotFoundException
- **Cause**: DynamoDB table doesn't exist in the region
- **Fix**: Ensure `AWS_REGION` environment variable is set (not `REGION`)
- **Fixed in**: `log.model.js`, `execution.model.js`, `queue.model.js`

### ValidationException: Reserved Keyword
- **Cause**: Using DynamoDB reserved words (`result`, `status`, `data`, etc.)
- **Fix**: Use `ExpressionAttributeNames` to alias reserved keywords
- **Fixed in**: `execution.model.js` - `#result` and `#status` aliases

### Retry Logic
- **Max Retries**: 3 attempts with exponential backoff
- **DLQ**: Failed messages after max retries go to Dead Letter Queue
- **Replay**: Use `/replay` endpoint to retry failed executions
