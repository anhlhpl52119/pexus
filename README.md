# Electrobun PROCESS

## `BrowserView` and `Electroview`

```text
┌─────────────────────────────────────────────────────┐
│                        APP.                         │
│                                                     │
│  Bun / Main Process              WebView / Vue      │
│                                                     │
│  ┌──────────────────┐          ┌─────────────────┐  │
│  │   BrowserView    │◄── RPC ─►│   Electroview   │  │
│  │                  │          │                 │  │
│  │ electrobun/bun   │          │ electrobun/view │  │
│  └──────────────────┘          └─────────────────┘  │
│          │                            │             │
│          ▼                            ▼             │
│    Native / Bun API                Vue UI           │
│    fetch()                         button           │
│    filesystem                      input            │
│    database                        render           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## RPC Concept

Trong defineRPC của `Electrobun`, khác biệt cốt lõi là:

> `request` = hỏi và chờ câu trả lời. (cần kết quả trả về)
>
> `message` = gửi thông báo và không chờ kết quả. (fire-and-forget)

Với app `Vue` + `Electrobun` có thể hình dung:

**REQUEST**

Use case cụ thể:

> User click button → Bun gọi REST API → Vue cần JSON để hiển thị.
>
> _"Hey server, làm việc này và CHO TÔI KẾT QUẢ."_"

```text
Vue                         Bun
 │                           │
 │──── getUser({id: 1}) ────>│
 │                           │ fetch API
 │                           │ await...
 │<────── User data ─────────│
 │
 ▼
render user
```

**MESSAGE**

Use case cụ thể:

> Vue gửi analytics/log về lưu vào db
>
> _"Hey, TÔI BÁO CHO BẠN BIẾT việc này vừa xảy ra."_"

```text
Vue                         Bun
 │                           │
 │──── log("button click") ──>│
 │                           │ ghi log
 │                           │
 │  không chờ response       │
 ▼                           ▼
tiếp tục                    xử lý
```

## Conversation flow

| Concept          | Ý nghĩa                                | Scope                   |
| ---------------- | -------------------------------------- | ----------------------- |
| **Conversation** | Toàn bộ phiên hội thoại                | lớn nhất                |
| **Turn**         | Một vòng user ↔ assistant              | interaction             |
| **Workflow**     | Quy trình để hoàn thành một goal       | có thể xuyên nhiều turn |
| **Step**         | Một lần xử lý/tool/LLM trong execution | nhỏ nhất                |

## Conversation flow

```
CONVERSATION
"Planning dinner"
│
├── TURN 1
│ User: "Tìm nhà hàng Nhật tối nay"
│
│ WORKFLOW: RestaurantBooking
│ Step 1: search
│ Step 2: check availability
│ Step 3: recommend
│
│ Assistant: "Có A, B, C. Bạn chọn cái nào?"
│
├── TURN 2
│ User: "B"
│
│ WORKFLOW: RestaurantBooking (continue)
│ Step 4: get booking details
│
│ Assistant: "Đặt lúc 7pm nhé?"
│
└── TURN 3
User: "Yes"

    WORKFLOW: RestaurantBooking (continue)
       Step 5: book
       Step 6: confirm

    Assistant: "Booked."
```

Conversation - Message -> workflow_metadata[
step: type, input, output, err
]
